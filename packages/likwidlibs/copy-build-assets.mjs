#!/usr/bin/env node
/**
 * Copy non-TypeScript generator assets into dist/ after tsc
 * (schema.json, *.template, etc.). Specs and .ts sources stay out.
 */
import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(root, 'src');
const distRoot = join(root, 'dist');

function shouldCopy(name) {
  if (name.endsWith('.spec.ts') || name.endsWith('.test.ts')) return false;
  if (name.endsWith('.ts') && !name.endsWith('.d.ts')) return false;
  return true;
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const from = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(from);
      continue;
    }
    if (!shouldCopy(entry.name)) continue;
    const rel = relative(srcRoot, from);
    const to = join(distRoot, rel);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
  }
}

statSync(srcRoot);
mkdirSync(distRoot, { recursive: true });
walk(srcRoot);
