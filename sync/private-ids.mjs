/**
 * Private AWS identifiers: patterns, redaction and detection for the public mirror.
 *
 * Matches real-looking identifiers by shape, so no real value has to live in this repository.
 * `rewrite.mjs` redacts them in staging; `scan.mjs` fails the sync if any survive.
 * Extra exact values can be passed at sync time in `SYNC_PRIVATE_IDS` (comma-separated, never
 * committed).
 */
import fs from "node:fs";
import path from "node:path";

/** Already-public hosts: never redacted or flagged. */
export const PUBLIC_HOSTS = ["likwidmack.com", "tamaramack.github.io", "hyperactivity.studio"];

/** Documentation fakes (AWS docs and this repo's tests) that may stay as written. */
const FAKE_ACCOUNTS = new Set(["000000000000", "111122223333", "123456789012", "444455556666"]);
const FAKE_API_IDS = new Set(["a1b2c3d4e5", "abcdef1234", "example123"]);
const FAKE_DISTRIBUTIONS = new Set(["d111111abcdef8"]);

const RULES = [
  {
    name: "AWS account ID in an ARN",
    re: /(arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:)(\d{12})\b/g,
    value: (m) => m[2],
    fakes: FAKE_ACCOUNTS,
    replace: (m) => `${m[1]}<account-id>`,
  },
  {
    name: "AWS account ID",
    re: /(\baccount(?:[ _-]?id)?\b[^0-9\n]{0,24})(\d{12})\b/gi,
    value: (m) => m[2],
    fakes: FAKE_ACCOUNTS,
    replace: (m) => `${m[1]}<account-id>`,
  },
  {
    name: "AWS account ID in a resource name",
    re: /\b([a-z0-9][a-z0-9-]*-)(\d{12})\b/g,
    value: (m) => m[2],
    fakes: FAKE_ACCOUNTS,
    // The last group of a UUID is 12 hex digits and can be all numeric.
    skip: (m) => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-$/i.test(m[1]),
    replace: (m) => `${m[1]}<account-id>`,
  },
  {
    name: "AWS account ID in an ECR host",
    re: /\b(\d{12})(\.dkr\.ecr\.)/g,
    value: (m) => m[1],
    fakes: FAKE_ACCOUNTS,
    replace: (m) => `<account-id>${m[2]}`,
  },
  {
    name: "API Gateway host",
    re: /\b([a-z0-9]{10})(\.execute-api\.[a-z0-9-]+\.amazonaws\.com)/g,
    value: (m) => m[1],
    fakes: FAKE_API_IDS,
    replace: (m) => `<api-id>${m[2]}`,
  },
  {
    name: "CloudFront distribution host",
    re: /\b(d[a-z0-9]{13})(\.cloudfront\.net)/g,
    value: (m) => m[1],
    fakes: FAKE_DISTRIBUTIONS,
    replace: (m) => `<distribution-id>${m[2]}`,
  },
];

function keep(rule, m) {
  return rule.fakes.has(rule.value(m)) || Boolean(rule.skip?.(m));
}

function extraValues(env = process.env) {
  return (env.SYNC_PRIVATE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Text with every private identifier replaced by a placeholder. */
export function redactPrivateIds(text, env = process.env) {
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.re, (...args) => {
      const m = args.slice(0, -2);
      return keep(rule, m) ? m[0] : rule.replace(m);
    });
  }
  for (const value of extraValues(env)) {
    out = out.replace(new RegExp(escapeRe(value), "g"), "<private-id>");
  }
  return out;
}

/** Rule names for every private identifier left in the text. */
export function findPrivateIds(text, env = process.env) {
  const found = [];
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      if (!keep(rule, m)) found.push(rule.name);
    }
  }
  for (const value of extraValues(env)) {
    if (text.includes(value)) found.push("SYNC_PRIVATE_IDS value");
  }
  return [...new Set(found)];
}

const MAX_TEXT_BYTES = 2_000_000;

/** Calls `visit(full, text)` for every text file (no NUL byte) under `dir`. */
export function walkText(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") walkText(full, visit);
      continue;
    }
    if (!entry.isFile() || fs.statSync(full).size > MAX_TEXT_BYTES) continue;
    const buf = fs.readFileSync(full);
    if (buf.includes(0)) continue;
    visit(full, buf.toString("utf8"));
  }
}

/** Redact every text file under `staging` in place; returns the relative paths changed. */
export function redactStaging(staging, env = process.env) {
  const changed = [];
  walkText(staging, (full, text) => {
    const next = redactPrivateIds(text, env);
    if (next !== text) {
      fs.writeFileSync(full, next);
      changed.push(path.relative(staging, full).split(path.sep).join("/"));
    }
  });
  return changed;
}
