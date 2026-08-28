#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DENY_PATHS = [
  /^bin(\/|$)/,
  /^exports(\/|$)/,
  /^\.env$/,
  /^\.env-sample$/,
  /^\.env\./,
  /^app\.json$/,
  /^_config\.yml$/,
  /^tests\/e2e(\/|$)/,
  /^api\/data\/100000\./,
  /^\.github(\/|$)/,
  /^node_modules(\/|$)/,
  /^dist(\/|$)/,
  /^app\/_archives(\/|$)/,
  /^docs\/superpowers(\/|$)/,
];

const SECRET_REGEXES = [
  { id: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "aws-secret-key", re: /aws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{30,}['"]/i },
  { id: "github-pat", re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { id: "github-fine-grained", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: "private-key", re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
  { id: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: "generic-secret", re: /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\s*[:=]\s*['"][^'"]{16,}['"]/i },
];

const SKIP_SCAN_DIRS = new Set([".git", "node_modules", ".nuxt", ".output", "sync", "templates", "tests"]);

export function isDeniedPath(rel) {
  const normalized = rel.replaceAll("\\", "/").replace(/^\.\//, "");
  return DENY_PATHS.some((re) => re.test(normalized));
}

export function scanText(text, rel = "") {
  const findings = [];
  for (const { id, re } of SECRET_REGEXES) {
    if (re.test(text)) {
      findings.push({ id, path: rel });
    }
  }
  return findings;
}

async function walk(root, relative = "") {
  const dir = path.join(root, relative);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP_SCAN_DIRS.has(entry.name)) {
      continue;
    }
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await walk(root, rel)));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

export async function scanDest(destRoot) {
  const findings = [];
  const files = await walk(destRoot);
  for (const rel of files) {
    if (isDeniedPath(rel)) {
      findings.push({ id: "denied-path", path: rel });
      continue;
    }
    const abs = path.join(destRoot, rel);
    const buf = await fs.readFile(abs);
    if (buf.includes(0)) {
      continue;
    }
    findings.push(...scanText(buf.toString("utf8"), rel));
  }
  return findings;
}

async function main() {
  const dest = process.argv[2];
  if (!dest) {
    console.error("usage: node scan.mjs <dest>");
    process.exit(2);
  }
  const findings = await scanDest(dest);
  if (findings.length) {
    for (const item of findings) {
      console.error(`${item.id}: ${item.path}`);
    }
    process.exit(1);
  }
  console.log("scan clean");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
