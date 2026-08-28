#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_WALK = new Set([".git", "node_modules", ".nuxt", ".output", ".nitro", "dist"]);

export function parseAllowlist(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function globToRegExp(pattern) {
  let i = 0;
  let out = "^";
  while (i < pattern.length) {
    if (pattern.startsWith("**/", i)) {
      out += "(?:.*/)?";
      i += 3;
      continue;
    }
    if (pattern.startsWith("**", i) && i + 2 === pattern.length) {
      out += ".*";
      i += 2;
      continue;
    }
    const ch = pattern[i];
    if (ch === "*") {
      out += "[^/]*";
      i += 1;
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
      i += 1;
      continue;
    }
    if ("\\^$+{}()|[].".includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
    i += 1;
  }
  out += "$";
  return new RegExp(out);
}

export function matchesAllowlist(rel, patterns) {
  const normalized = rel.replaceAll("\\", "/");
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

async function walkFiles(root, prefix = "") {
  const dir = prefix ? path.join(root, prefix) : root;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP_WALK.has(entry.name)) {
      continue;
    }
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(root, rel)));
    } else if (entry.isFile()) {
      files.push(rel.replaceAll("\\", "/"));
    }
  }
  return files;
}

export async function copyAllowlisted(sourceRoot, destRoot, allowlistPath) {
  const patterns = parseAllowlist(await fs.readFile(allowlistPath, "utf8"));
  const files = await walkFiles(sourceRoot);
  const copied = [];
  for (const rel of files) {
    if (!matchesAllowlist(rel, patterns)) {
      continue;
    }
    const from = path.join(sourceRoot, rel);
    const to = path.join(destRoot, rel);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    copied.push(rel);
  }
  copied.sort();
  return copied;
}

async function main() {
  const source = process.argv[2];
  const dest = process.argv[3];
  const allow = process.argv[4] || path.join(path.dirname(fileURLToPath(import.meta.url)), "allowlist.txt");
  if (!source || !dest) {
    console.error("usage: node copy.mjs <source> <dest> [allowlist]");
    process.exit(2);
  }
  const copied = await copyAllowlisted(source, dest, allow);
  console.log(`copied ${copied.length} files`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
