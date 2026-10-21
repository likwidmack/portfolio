#!/usr/bin/env node
/**
 * Swap sensitive source packages for dest-owned public stand-ins (`sync/stand-ins/<name>/`).
 *
 *   node sync/stand-in.mjs --staging DIR           replace each staged package with its stand-in
 *   node sync/stand-in.mjs --staging DIR --verify  exit 1 unless each staged package is the stand-in
 *
 * The stand-in keeps the source package's name, version, entry points and dependencies (so
 * `package-lock.json` stays valid) and nothing else from it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STAND_INS = path.join(ROOT, "sync/stand-ins");

/** Staged path → stand-in folder name. */
export const STAND_IN_PACKAGES = { "packages/media-aws": "media-aws" };

/**
 * Unit tests that exercise the real `@tgmc/media-aws` (they fail against the stand-in).
 * Dropped from the mirror; the other `@tgmc/media-nuxt` specs pass against the stand-in.
 */
export const STAND_IN_DROPPED_TESTS = [
  "packages/media-nuxt/tests/asset-urls-routes.spec.ts",
  "packages/media-nuxt/tests/ingest-routes-backend.spec.ts",
  "packages/media-nuxt/tests/media-library-env.spec.ts",
  "packages/media-nuxt/tests/media-library.spec.ts",
  "packages/media-nuxt/tests/media-public-url.spec.ts",
];

const MARKER = "tgmcStandIn";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** package.json for the stand-in: the source's identity and dependencies, the stand-in's build. */
export function standInPackageJson(source) {
  const build = source.nx?.targets?.build;
  const pkg = {
    name: source.name,
    version: source.version,
    type: source.type,
    description: "Public stand-in: the real package is not published in this mirror.",
    license: "MIT",
    main: source.main,
    module: source.module,
    types: source.types,
    exports: source.exports,
    scripts: { build: "tsc -p tsconfig.lib.json" },
    files: source.files,
    nx: {
      tags: source.nx?.tags,
      targets: build ? { build } : undefined,
    },
    dependencies: source.dependencies,
    [MARKER]: true,
  };
  return JSON.parse(JSON.stringify(pkg));
}

function listFiles(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join("/")];
    })
    .sort();
}

export function applyStandIns(staging) {
  for (const [rel, name] of Object.entries(STAND_IN_PACKAGES)) {
    const target = path.join(staging, rel);
    if (!fs.existsSync(target)) continue;
    const sourcePkg = readJson(path.join(target, "package.json"));
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(path.join(STAND_INS, name), target, { recursive: true });
    fs.writeFileSync(path.join(target, "package.json"), `${JSON.stringify(standInPackageJson(sourcePkg), null, 2)}\n`);
    console.log(`stand-in: ${rel}`);
  }
  for (const rel of STAND_IN_DROPPED_TESTS) {
    const file = path.join(staging, rel);
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`stand-in: dropped ${rel}`);
    }
  }
}

/** Problems with the staged stand-ins; empty when every staged package is exactly the stand-in. */
export function verifyStandIns(staging) {
  const problems = [];
  for (const [rel, name] of Object.entries(STAND_IN_PACKAGES)) {
    const target = path.join(staging, rel);
    if (!fs.existsSync(target)) continue;
    const pkgFile = path.join(target, "package.json");
    if (!fs.existsSync(pkgFile) || readJson(pkgFile)[MARKER] !== true) {
      problems.push(`${rel}: not the public stand-in`);
      continue;
    }
    const expected = listFiles(path.join(STAND_INS, name));
    const actual = listFiles(target).filter((file) => file !== "package.json");
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(`${rel}: files differ from sync/stand-ins/${name}`);
      continue;
    }
    for (const file of expected) {
      const a = fs.readFileSync(path.join(STAND_INS, name, file));
      const b = fs.readFileSync(path.join(target, file));
      if (!a.equals(b)) problems.push(`${rel}/${file}: differs from the stand-in`);
    }
  }
  for (const rel of STAND_IN_DROPPED_TESTS) {
    if (fs.existsSync(path.join(staging, rel))) problems.push(`${rel}: needs the real package; drop it`);
  }
  return problems;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const staging = args[args.indexOf("--staging") + 1];
  if (!args.includes("--staging") || !staging) {
    console.error("Usage: stand-in.mjs --staging DIR [--verify]");
    process.exit(2);
  }
  if (args.includes("--verify")) {
    const problems = verifyStandIns(staging);
    for (const problem of problems) console.error(`stand-in check failed: ${problem}`);
    process.exit(problems.length ? 1 : 0);
  }
  applyStandIns(staging);
}
