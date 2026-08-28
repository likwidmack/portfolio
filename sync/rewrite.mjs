#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

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
    "Public sanitized source for Tamara Mack’s Nx + Nuxt 4 portfolio.";
  pkg.homepage = "https://likwidmack.com";
  pkg.bugs = { url: "https://github.com/likwidmack/portfolio/issues" };
  pkg.repository = {
    type: "git",
    url: "git+https://github.com/likwidmack/portfolio.git",
  };
  pkg.license = "MIT";
  pkg.scripts = {
    build: "nx build @tgmc/web",
    dev: "nx nuxt dev",
    start: "nx dev @tgmc/web",
    lint: "nx run-many -t lint --parallel=3",
    test: "nx run-many -t test --parallel=3",
    postinstall: "npm run build --workspace=@tgmc/theme && nuxt prepare core/web",
    "sync:public": "bash ./sync/sync.sh",
  };
  writeJson(file, pkg);
}

function rewriteNxJson(staging) {
  const file = path.join(staging, "nx.json");
  if (!fs.existsSync(file)) return;
  const nx = readJson(file);
  delete nx.nxCloudId;
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
description: Tamara Mack web portfolio — Nx + Nuxt 4 (public sanitized source)
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

function writeReadme(staging, tag, sha) {
  fs.writeFileSync(
    path.join(staging, "README.md"),
    `# portfolio

Public, sanitized source for Tamara Mack’s Nx + Nuxt 4 portfolio.

- Live site: [likwidmack.com](https://likwidmack.com)
- Private source of truth: \`tamaramack/portfolio\`
- This mirror: [likwidmack/portfolio](https://github.com/likwidmack/portfolio)

Synced from \`${tag}\` (\`${sha.slice(0, 7)}\`). Private env templates, AWS/SAM and Docker internals, GitHub admin scripts, agent/dot-directory tooling, archives, and admin packages are omitted.

## Run locally

Requires Node.js >= 24.

\`\`\`bash
npm ci
npm run dev
\`\`\`

App: \`http://localhost:4200\`.

## Sync

Tag releases on \`tamaramack/portfolio\` refresh this tree (or run **Actions → Sync public mirror**). Keep-list: \`sync/allowlist.txt\`.

The sync workflow needs repository secret \`GH_TOKEN\` (fine-grained PAT as \`likwidmack\`: Contents read on \`tamaramack/portfolio\`; Contents and Pull requests write on this repo). Optional \`CURSOR_API_KEY\` runs a Cursor SDK review that comments on the sync PR and does not copy files from the private source.
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
  rewritePackageJson(staging, tag);
  rewriteNxJson(staging);
  rewriteNestedPackageRepos(staging);
  rewriteWebTestTarget(staging);
  rewriteLintStaged(staging);
  rewriteDocsConfig(staging);
  writeGitignore(staging);
  writeReadme(staging, tag, sha);
  writeSyncMeta(staging, tag, sha);
}

main();
