#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEST_KEEP = new Set([
  ".git",
  ".github",
  "sync",
  "templates",
  "tests",
  "node_modules",
  ".nuxt",
  ".output",
  ".nitro",
]);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDir(src, dest);
    } else if (entry.isFile()) {
      await fs.copyFile(src, dest);
    }
  }
}

export async function applyStaging(stagingRoot, destRoot) {
  const destEntries = await fs.readdir(destRoot, { withFileTypes: true });
  for (const entry of destEntries) {
    if (DEST_KEEP.has(entry.name)) {
      continue;
    }
    await fs.rm(path.join(destRoot, entry.name), { recursive: true, force: true });
  }

  const stageEntries = await fs.readdir(stagingRoot, { withFileTypes: true });
  for (const entry of stageEntries) {
    if (entry.name === "tests") {
      await copyDir(path.join(stagingRoot, "tests"), path.join(destRoot, "tests"));
      continue;
    }
    if (DEST_KEEP.has(entry.name)) {
      continue;
    }
    const from = path.join(stagingRoot, entry.name);
    const to = path.join(destRoot, entry.name);
    await fs.rm(to, { recursive: true, force: true });
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

async function main() {
  const staging = process.argv[2];
  const dest = process.argv[3];
  if (!staging || !dest) {
    console.error("usage: node apply.mjs <staging> <dest>");
    process.exit(2);
  }
  await applyStaging(staging, dest);
  console.log("applied staging to dest");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
