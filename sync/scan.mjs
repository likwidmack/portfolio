#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { cdnOriginalScanHits } from "./cdn-placeholders.mjs";

const DENY_BASENAMES = new Set([
  ".env",
  ".env.sample",
  ".env.example",
  ".env.development.example",
  ".env.production.example",
  ".env.test.example",
  "AGENTS.md",
  "opencode.json",
  "portfolio-review.md",
]);

const DENY_DIR_NAMES = new Set([
  "scripts",
  "docker",
  "infra",
  "archive",
  "deliverables",
  ".github",
  ".agents",
  ".codex",
  ".husky",
  ".vscode",
  ".opencode",
  "web-e2e",
]);

const NESTED_DOT_DIRS = new Set([
  ".github",
  ".husky",
  ".vscode",
  ".agents",
  ".codex",
  ".opencode",
]);

const SECRET_RE = /(github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]{36,}|AKIA[0-9A-Z]{16})/;
const PRIVATE_INFRA_RE =
  /(305052780274|d3sr1gndi209fc|shared-cdn-test-assets-)/;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    out[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
}

function walk(dir, hits, depth, stagingRoot) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth === 0 && DENY_DIR_NAMES.has(entry.name)) {
        hits.push(`denied directory present: ${full}`);
      }
      if (depth > 0 && NESTED_DOT_DIRS.has(entry.name)) {
        hits.push(`nested dot-directory present: ${full}`);
      }
      walk(full, hits, depth + 1, stagingRoot);
      continue;
    }
    if (DENY_BASENAMES.has(entry.name) || entry.name.startsWith(".env")) {
      hits.push(`denied file present: ${full}`);
    }
    if (
      entry.size < 1_000_000 &&
      /\.(js|mjs|ts|json|vue|md|env|yml|yaml|sh|txt)$/.test(entry.name)
    ) {
      const text = fs.readFileSync(full, "utf8");
      if (SECRET_RE.test(text) && !full.includes(`${path.sep}sync${path.sep}`)) {
        hits.push(`secret-shaped string in ${full}`);
      }
      if (PRIVATE_INFRA_RE.test(text)) {
        hits.push(`private infra identifier in ${full}`);
      }
    }
  }
}

function main() {
  const staging = parseArgs(process.argv).staging;
  if (!staging) {
    console.error("scan.mjs requires --staging");
    process.exit(2);
  }
  const hits = [];
  walk(staging, hits, 0, staging);
  hits.push(...cdnOriginalScanHits(staging));
  if (hits.length > 0) {
    console.error(hits.join("\n"));
    process.exit(3);
  }
}

main();
