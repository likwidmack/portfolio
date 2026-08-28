#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { applyPublicDocs } from "./public-docs.mjs";

const PRIVATE_REL_PATHS = [
  "docs/infra.md",
  "docs/cicd.md",
  "docs/docker.md",
  "docs/dev/github-access.md",
  "docs/portfolio-august-launch.md",
  "docs/agents",
  "docs/superpowers",
  "docs/templates",
  "docs/web/features/cdn-quickstart.md",
  "docs/web/features/cdn-guide.md",
  "docs/dev/git-hooks.md",
  "core/web/tests/scripts",
];

/** CloudFront/S3 payloads under Nuxt `public/`. */
const CDN_PUBLIC_REL_PATHS = [
  "core/web/public/i",
  "core/web/public/v",
  "core/web/public/d",
  "core/web/public/favicon.ico",
  "core/web/public/README.md",
];

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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function publicVersion(tag, pkgVersion) {
  const trimmed = String(tag || "").replace(/^v/, "");
  if (/^\d+\.\d+\.\d+/.test(trimmed)) {
    return trimmed;
  }
  return pkgVersion || "0.0.0";
}

function rewriteGithubUrl(value) {
  if (typeof value !== "string") return value;
  return value.replaceAll("tamaramack/portfolio", "likwidmack/portfolio");
}

function rewritePackageJson(staging, tag) {
  const file = path.join(staging, "package.json");
  if (!fs.existsSync(file)) return;
  const pkg = readJson(file);
  pkg.name = "portfolio";
  pkg.version = publicVersion(tag, pkg.version);
  pkg.private = true;
  pkg.description =
    "Nx + Nuxt 4 SSR portfolio with SQLite, Docker/Postgres, and AWS SAM (Lambda, DynamoDB, CloudFront).";
  pkg.homepage = "https://likwidmack.com";
  pkg.bugs = { url: "https://github.com/likwidmack/portfolio/issues" };
  pkg.repository = {
    type: "git",
    url: "git+https://github.com/likwidmack/portfolio.git",
  };
  pkg.license = "MIT";
  pkg.scripts = {
    build: "nx build @tgmc/web",
    "build:libs":
      "npm run build --workspace=@tgmc/utilities --workspace=@tgmc/media-player --workspace=@tgmc/likwidlibs",
    dev: "nx dev @tgmc/web",
    start: "nx dev @tgmc/web",
    "start:ssl:4200": "env HTTPS=1 PORT=4200 nx dev @tgmc/web",
    "ssl:gen:linux": "bash core/web/bin/generate-ssl-linux.sh",
    "ssl:gen:windows":
      "powershell -ExecutionPolicy Bypass -File core/web/bin/generate-ssl-windows.ps1",
    format: "prettier -wl .",
    lint: "npm run format && nx run-many -t lint --parallel=3",
    test: "nx run-many -t test --parallel=3",
    "db:migrate:local": "node core/web/bin/db-migrate-local.mjs",
    postinstall: "npm run build --workspace=@tgmc/theme && nuxt prepare core/web",
    "sync:public": "bash ./sync/sync.sh",
  };
  writeJson(file, pkg);
}

function rewriteTsconfig(staging) {
  const file = path.join(staging, "tsconfig.json");
  if (!fs.existsSync(file)) return;
  const ts = readJson(file);
  if (!Array.isArray(ts.references)) return;
  ts.references = ts.references.filter((ref) => {
    const rel = ref && ref.path;
    if (typeof rel !== "string") return false;
    return fs.existsSync(path.join(staging, rel));
  });
  writeJson(file, ts);
}

function rewriteNxJson(staging) {
  const file = path.join(staging, "nx.json");
  if (!fs.existsSync(file)) return;
  const nx = readJson(file);
  delete nx.nxCloudId;
  for (const plugin of nx.plugins || []) {
    if (!plugin || typeof plugin !== "object") continue;
    const current = Array.isArray(plugin.exclude) ? plugin.exclude : [];
    if (!current.includes("tests/**")) {
      plugin.exclude = [...current, "tests/**"];
    }
  }
  writeJson(file, nx);
}

function rewriteNestedPackageRepos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteNestedPackageRepos(full);
      continue;
    }
    if (entry.name !== "package.json") continue;
    const pkg = readJson(full);
    let changed = false;
    if (typeof pkg.repository === "string") {
      pkg.repository = rewriteGithubUrl(pkg.repository);
      changed = true;
    } else if (pkg.repository && typeof pkg.repository === "object") {
      if (pkg.repository.url) {
        pkg.repository.url = rewriteGithubUrl(pkg.repository.url);
        changed = true;
      }
    }
    if (typeof pkg.homepage === "string") {
      pkg.homepage = rewriteGithubUrl(pkg.homepage);
      changed = true;
    }
    if (pkg.bugs && typeof pkg.bugs.url === "string") {
      pkg.bugs.url = rewriteGithubUrl(pkg.bugs.url);
      changed = true;
    }
    if (changed) writeJson(full, pkg);
  }
}

function rewriteWebTestTarget(staging) {
  const file = path.join(staging, "core/web/package.json");
  if (!fs.existsSync(file)) return;
  const pkg = readJson(file);
  const command = pkg.nx?.targets?.test?.options?.command;
  if (typeof command === "string" && command.includes("scripts/")) {
    pkg.nx.targets.test.options.command = "npm run test --workspace=@tgmc/web";
    writeJson(file, pkg);
  }
}

function rewriteLintStaged(staging) {
  const file = path.join(staging, "lint-staged.config.mjs");
  if (!fs.existsSync(file)) return;
  fs.writeFileSync(
    file,
    `const PRETTIER_GLOB = /\\.(js|jsx|mjs|cjs|ts|tsx|vue|json|md|yml|yaml|css|scss|html|pug)$/i;

export default {
  "*": (files) => {
    const forPrettier = files.filter((f) => PRETTIER_GLOB.test(f));
    if (!forPrettier.length) {
      return ['node -e "process.exit(0)"'];
    }
    return [\`prettier --write \${forPrettier.map((f) => \`"\${f}"\`).join(" ")}\`];
  },
};
`,
  );
}

function rewriteDocsConfig(staging) {
  const file = path.join(staging, "docs/_config.yml");
  if (!fs.existsSync(file)) return;
  fs.writeFileSync(
    file,
    `# GitHub Pages (publish source: /docs).
title: portfolio
description: Tamara Mack web portfolio — Nx + Nuxt 4
url: https://likwidmack.github.io
baseurl: /portfolio
repository: likwidmack/portfolio
theme: jekyll-theme-cayman
markdown: kramdown
kramdown:
  input: GFM
  hard_wrap: false
plugins:
  - jekyll-relative-links
  - jekyll-seo-tag
  - jekyll-sitemap
relative_links:
  enabled: true
  collections: true
defaults:
  - scope:
      path: ''
    values:
      layout: default
exclude:
  - plans/
`,
  );
}

function rmRf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function dropPrivatePaths(staging) {
  for (const rel of PRIVATE_REL_PATHS) {
    rmRf(path.join(staging, rel));
  }
}

function stripCdnPublicAssets(staging) {
  for (const rel of CDN_PUBLIC_REL_PATHS) {
    rmRf(path.join(staging, rel));
  }
  const publicDir = path.join(staging, "core/web/public");
  if (!fs.existsSync(path.dirname(publicDir))) return;
  fs.mkdirSync(publicDir, { recursive: true });
  const gitkeep = path.join(publicDir, ".gitkeep");
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, "");
  }
}

function stripEnvFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stripEnvFiles(full);
      continue;
    }
    if (entry.name === ".env" || entry.name.startsWith(".env.")) {
      fs.rmSync(full, { force: true });
    }
  }
}

function rewriteMarkdownRepos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteMarkdownRepos(full);
      continue;
    }
    if (!/\.(md|yml)$/.test(entry.name)) continue;
    const text = fs.readFileSync(full, "utf8");
    const next = text.replaceAll("tamaramack/portfolio", "likwidmack/portfolio");
    if (next !== text) fs.writeFileSync(full, next);
  }
}

function writeGitignore(staging) {
  fs.writeFileSync(
    path.join(staging, ".gitignore"),
    [
      "node_modules/",
      ".nuxt",
      ".output",
      ".nitro",
      "dist",
      "coverage",
      ".nx/cache",
      ".nx/workspace-data",
      ".env",
      ".env.local",
      ".env.*.local",
      "*.sqlite",
      "*.sqlite-*",
      "/data/",
      ".idea/",
      ".vscode/",
      ".DS_Store",
      ".eslintcache",
      "agent-tools/",
      "",
    ].join("\n"),
  );
}

function writeReadme(staging) {
  fs.writeFileSync(
    path.join(staging, "README.md"),
    `# tgmc-portfolio

[![Tests](https://github.com/likwidmack/portfolio/actions/workflows/test.yml/badge.svg)](https://github.com/likwidmack/portfolio/actions/workflows/test.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](.nvmrc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nx + Nuxt 4 monorepo for Tamara Mack’s web portfolio (\`@tgmc/web\`): Nitro SSR, shared packages, and local SQLite.

This repository is the source hub for the [Nuxt 4](docs/web/README.md) SSR site and [Nx](docs/packages/README.md) workspace packages. It orchestrates that stack; it does not replace Nuxt.

**Full documentation:** [docs/](docs/README.md) · **Live site:** [likwidmack.com](https://likwidmack.com)

## Who this is for

- Engineers reviewing a Nuxt 4 + Nitro SSR portfolio with an Nx monorepo
- Contributors working in this repo

## Table of contents

- [Who this is for](#who-this-is-for)
- [About](#about)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Repository layout](#repository-layout)
- [Contributing](#contributing)
- [License](#license)

## About

| Piece        | Role                                                      |
| ------------ | --------------------------------------------------------- |
| \`core/web\`   | Nuxt 4 app (\`@tgmc/web\`), Nitro SSR                       |
| \`theme/core\` | \`@tgmc/theme\` design tokens                               |
| \`packages/*\` | \`utilities\`, \`media-player\`, \`likwidlibs\`, \`web-layer-admin\` |

## Requirements

- Node.js **>= 24** (\`.nvmrc\`, \`engine-strict\`)
- npm

## Quick start

\`\`\`bash
npm ci
npm run dev
\`\`\`

App: \`http://localhost:4200\`. HTTPS: [docs/web/setup/ssl-setup.md](docs/web/setup/ssl-setup.md).

## Documentation

Instructions live under **\`docs/\`**. Do not grow this README with runbooks.

| Start here            | Link                                                           |
| --------------------- | -------------------------------------------------------------- |
| Catalog (all topics)  | [docs/README.md](docs/README.md)                               |
| GitHub Pages home     | [docs/index.md](docs/index.md)                                 |
| App quick start       | [docs/web/guides/quickstart.md](docs/web/guides/quickstart.md) |
| Environment variables | [docs/web/setup/environment.md](docs/web/setup/environment.md) |
| App docs              | [docs/web/README.md](docs/web/README.md)                       |
| Packages              | [docs/packages/README.md](docs/packages/README.md)             |
| Contributing          | [docs/contributing.md](docs/contributing.md)                   |

## Repository layout

| Path          | Docs                                      |
| ------------- | ----------------------------------------- |
| \`core/web/\`   | [docs/web/](docs/web/README.md)           |
| \`packages/\`   | [docs/packages/](docs/packages/README.md) |
| \`theme/core/\` | [docs/packages/theme.md](docs/packages/theme.md) |

## Contributing

See [docs/contributing.md](docs/contributing.md).

## License

[MIT](LICENSE) © Tamara Mack
`,
  );
}

function writeDbMigrateLocal(staging) {
  const file = path.join(staging, "core/web/bin/db-migrate-local.mjs");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `#!/usr/bin/env node
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const migrationsDir = resolve(root, "core/web/server/db/migrations");

export const DEFAULT_DATABASE_URL = "file:./data/local.sqlite";

export const resolveSqlitePath = (databaseUrl = DEFAULT_DATABASE_URL, repoRoot = root) => {
  const trimmed = databaseUrl.trim();
  const withoutScheme = trimmed.startsWith("file:") ? trimmed.slice("file:".length) : trimmed;
  if (isAbsolute(withoutScheme)) {
    return withoutScheme;
  }
  return resolve(repoRoot, withoutScheme);
};

export const listMigrationSqlFiles = (dir = migrationsDir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => join(dir, name));

export const applyLocalSqliteMigration = (dbPath, sqlPaths = listMigrationSqlFiles()) => {
  const paths = Array.isArray(sqlPaths) ? sqlPaths : [sqlPaths];
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  try {
    for (const sqlPath of paths) {
      const sql = readFileSync(sqlPath, "utf8");
      db.exec(sql);
    }
  } finally {
    db.close();
  }
  return { dbPath, sqlPaths: paths };
};

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const dbPath = resolveSqlitePath(databaseUrl);
  const result = applyLocalSqliteMigration(dbPath);
  for (const sqlPath of result.sqlPaths) {
    console.log(\`[db:migrate:local] Applied \${sqlPath}\`);
  }
  console.log(\`[db:migrate:local] Database: \${result.dbPath}\`);
}
`,
  );
}

function writeSyncMeta(staging, tag, sha) {
  writeJson(path.join(staging, ".sync-meta.json"), {
    sourceRepo: "tamaramack/portfolio",
    sourceTag: tag,
    sourceSha: sha,
    syncedAt: new Date().toISOString(),
    destRepo: "likwidmack/portfolio",
  });
}

function main() {
  const args = parseArgs(process.argv);
  const staging = args.staging;
  if (!staging) {
    console.error("rewrite.mjs requires --staging");
    process.exit(2);
  }
  const tag = args.tag || "unsynced";
  const sha = args.sha || "unknown";
  stripEnvFiles(staging);
  dropPrivatePaths(staging);
  stripCdnPublicAssets(staging);
  rewritePackageJson(staging, tag);
  rewriteNxJson(staging);
  rewriteTsconfig(staging);
  rewriteNestedPackageRepos(staging);
  rewriteMarkdownRepos(path.join(staging, "docs"));
  rewriteWebTestTarget(staging);
  rewriteLintStaged(staging);
  rewriteDocsConfig(staging);
  writeGitignore(staging);
  writeReadme(staging);
  writeSyncMeta(staging, tag, sha);
  writeDbMigrateLocal(staging);
  applyPublicDocs(staging);
}

main();
