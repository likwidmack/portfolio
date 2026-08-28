#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEST_OWNER = "likwidmack";
const DEST_REPO = "portfolio";
const LIVE_SITE = "https://tamaramack.github.io/";

const DROP_SCRIPT_NAMES = new Set([
  "clean",
  "build:raw",
  "build:dev",
  "build:pages",
  "deploy:data",
  "postversion",
  "precommit",
  "preinstall",
  "test:e2e",
]);

const DROP_DEP_NAMES = new Set(["mongodb", "vue-cli-plugin-s3-deploy", "dotenv"]);

const TEMPLATES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function flattenPortfolioApp(destRoot) {
  const nested = path.join(destRoot, "apps/portfolio");
  if (!(await exists(nested))) {
    return false;
  }
  const entries = await fs.readdir(nested, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(nested, entry.name);
    const to = path.join(destRoot, entry.name);
    await fs.rm(to, { recursive: true, force: true });
    await fs.rename(from, to);
  }
  await fs.rm(path.join(destRoot, "apps"), { recursive: true, force: true });
  return true;
}

function keepScript(name, command) {
  if (DROP_SCRIPT_NAMES.has(name)) {
    return false;
  }
  if (/\bbin\//.test(command) || /\bbin\b/.test(command) && command.includes("node bin")) {
    return false;
  }
  if (name === "postinstall" && /bin\//.test(command)) {
    return false;
  }
  return true;
}

function stripDeps(bag) {
  if (!bag || typeof bag !== "object") {
    return bag;
  }
  const next = { ...bag };
  for (const name of DROP_DEP_NAMES) {
    delete next[name];
  }
  return next;
}

export function rewritePackageJson(pkg) {
  const next = { ...pkg };
  next.name = "portfolio";
  next.private = true;
  next.license = "BSD-2-Clause";
  next.homepage = LIVE_SITE;
  next.repository = {
    type: "git",
    url: `git+https://github.com/${DEST_OWNER}/${DEST_REPO}.git`,
  };
  next.bugs = {
    url: `https://github.com/${DEST_OWNER}/${DEST_REPO}/issues`,
  };
  delete next.gitHooks;
  delete next["lint-staged"];
  delete next.packageManager;
  delete next.pnpm;

  const scripts = { ...(pkg.scripts || {}) };
  const kept = {};
  for (const [name, command] of Object.entries(scripts)) {
    if (keepScript(name, String(command))) {
      kept[name] = command;
    }
  }

  if (kept.build && String(kept.build).includes("vue-cli-service") && !String(kept.build).includes("--modern")) {
    kept.build = "vue-cli-service build --modern";
  }

  const serveCmd = kept.dev?.includes("nuxt")
    ? "nuxt dev --port 9200 --host 0.0.0.0"
    : kept.serve?.includes("vue-cli-service")
      ? "vue-cli-service serve --port 9200"
      : kept.dev
        ? `${kept.dev} --port 9200`
        : "nuxt dev --port 9200 --host 0.0.0.0";

  kept.serve = serveCmd;
  kept.start = serveCmd;
  if (kept.dev?.includes("nuxt")) {
    kept.dev = serveCmd;
  }
  if (!kept.lint && kept.typecheck) {
    kept.lint = kept.typecheck;
  }
  if (!kept["test:unit"]) {
    kept["test:unit"] = "node --test tests/sync.test.mjs";
  }

  next.scripts = kept;
  next.dependencies = stripDeps(pkg.dependencies);
  next.devDependencies = stripDeps(pkg.devDependencies);
  return next;
}

export function ensureStaticServerDeps(pkg, hasServerJs) {
  if (!hasServerJs) {
    return pkg;
  }
  const dependencies = { ...(pkg.dependencies || {}) };
  if (!dependencies.express) {
    dependencies.express = "^5.1.0";
  }
  if (!dependencies["connect-history-api-fallback"]) {
    dependencies["connect-history-api-fallback"] = "^2.0.0";
  }
  return { ...pkg, dependencies };
}

export async function rewriteVueConfig(destRoot) {
  const filePath = path.join(destRoot, "vue.config.js");
  if (!(await exists(filePath))) {
    return false;
  }
  let text = await fs.readFile(filePath, "utf8");
  text = text.replace(/pluginOptions\s*:\s*\{[\s\S]*?s3Deploy[\s\S]*?\},?/m, "");
  text = text.replace(/s3Deploy\s*:\s*\{[\s\S]*?\},?/g, "");
  await fs.writeFile(filePath, text);
  return true;
}

export async function rewriteServerJs(destRoot) {
  const filePath = path.join(destRoot, "server.js");
  if (!(await exists(filePath))) {
    return false;
  }
  await fs.copyFile(path.join(TEMPLATES, "server.js"), filePath);
  return true;
}

export async function overlayTemplates(destRoot) {
  const files = ["README.md", "LICENSE", ".gitignore", ".npmrc"];
  for (const name of files) {
    await fs.copyFile(path.join(TEMPLATES, name), path.join(destRoot, name));
  }
}

export async function rewriteArchitectureDocs(destRoot) {
  const filePath = path.join(destRoot, "docs/architecture.md");
  if (!(await exists(filePath))) {
    return false;
  }
  let text = await fs.readFile(filePath, "utf8");
  text = text.replaceAll("apps/portfolio/", "");
  text = text.replaceAll("`apps/portfolio`", "this repository");
  text = text.replace(/\[deploy-pages\.yml\]\([^)]+\)/g, "upstream GitHub Pages CI");
  text = text.replace(/\[promote-to-main\.yml\]\([^)]+\)/g, "upstream promote workflow");
  await fs.writeFile(filePath, text);
  return true;
}

export async function rewriteDest(destRoot) {
  await flattenPortfolioApp(destRoot);
  const pkgPath = path.join(destRoot, "package.json");
  const hadServer = await exists(path.join(destRoot, "server.js"));
  await rewriteVueConfig(destRoot);
  await rewriteServerJs(destRoot);
  if (await exists(pkgPath)) {
    let pkg = rewritePackageJson(await readJson(pkgPath));
    pkg = ensureStaticServerDeps(pkg, hadServer || (await exists(path.join(destRoot, "server.js"))));
    await writeJson(pkgPath, pkg);
  }
  await rewriteArchitectureDocs(destRoot);
  await overlayTemplates(destRoot);
}

async function main() {
  const dest = process.argv[2];
  if (!dest) {
    console.error("usage: node rewrite.mjs <dest>");
    process.exit(2);
  }
  await rewriteDest(dest);
  console.log("rewrote dest overlays");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
