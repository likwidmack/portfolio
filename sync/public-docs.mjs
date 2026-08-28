#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const MD_LINK_RE = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

const HUB_FILES = {
  "docs/README.md": `# Documentation

Canonical instructions for **tgmc-portfolio** live in this folder. The [root README](https://github.com/likwidmack/portfolio#readme) is a GitHub landing page (badges, quick start, links).

**Start here:** [web/guides/quickstart.md](./web/guides/quickstart.md)

## Catalog (by directory)

Instructions are grouped the same way as the repo. Prefer these pages over duplicating setup in package READMEs.

### \`docs/\` (this tree)

| File                                   | Topic                             |
| -------------------------------------- | --------------------------------- |
| [index.md](./index.md)                 | GitHub Pages home                 |
| [README.md](./README.md)               | This catalog (GitHub tree view)   |
| [contributing.md](./contributing.md)   | How to change docs and code       |

### \`docs/web/\` — Nuxt app (\`@tgmc/web\`)

| Path                                                                       | Topic                                    |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [web/README.md](./web/README.md)                                           | App docs hub                             |
| [web/guides/quickstart.md](./web/guides/quickstart.md)                     | Local 5-minute setup                     |
| [web/guides/examples.md](./web/guides/examples.md)                         | CDN and feature examples                 |
| [web/setup/environment.md](./web/setup/environment.md)                     | \`SYS_ENV\`, secrets, runtimeConfig        |
| [web/setup/ssl-setup.md](./web/setup/ssl-setup.md)                         | Local HTTPS certs                        |
| [web/features/messages-api.md](./web/features/messages-api.md)             | Contact messages API                     |
| [web/features/page-data-loading.md](./web/features/page-data-loading.md)   | \`useContentAsyncData\`                    |
| [web/features/gallery-and-docs.md](./web/features/gallery-and-docs.md)     | \`/gallery\` grid + \`/docs\` (Work sub-nav) |
| [web/data-stores.md](./web/data-stores.md)                                 | SQLite / Postgres / Dynamo adapters      |
| [web/reference/project-structure.md](./web/reference/project-structure.md) | App layout                               |
| [web/reference/architecture.md](./web/reference/architecture.md)           | Architecture diagram hub                 |
| [web/reference/system-c4.md](./web/reference/system-c4.md)                 | C4 context, containers, deployment       |
| [web/reference/api-uml.md](./web/reference/api-uml.md)                     | API inventory and store UML              |
| [web/reference/site-wireframes.md](./web/reference/site-wireframes.md)     | Site map and page wireframes             |
| [web/reference/process-sequences.md](./web/reference/process-sequences.md) | UML sequences for key processes          |
| [web/reference/types.md](./web/reference/types.md)                         | TypeScript types                         |
| [web/reference/typescript-config.md](./web/reference/typescript-config.md) | Paths and compiler                       |

### \`docs/packages/\`

| File                                             | Topic                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| [packages/README.md](./packages/README.md)       | Workspace packages index                                                    |
| [packages/utilities.md](./packages/utilities.md) | \`@tgmc/utilities\` Node vs \`/browser\` vs \`/universal\`                        |
| [packages/theme.md](./packages/theme.md)         | \`@tgmc/theme\` tokens, brand vs hue scale, \`data-fit\`, ratios, container fit |

### \`docs/dev/\`

| File                                                                   | Topic                               |
| ---------------------------------------------------------------------- | ----------------------------------- |
| [dev/README.md](./dev/README.md)                                       | Developer tooling index             |
| [dev/npm-security-overrides.md](./dev/npm-security-overrides.md)       | npm overrides                       |
| [dev/encapsulation-remediation.md](./dev/encapsulation-remediation.md) | Layer / import boundaries           |

### Design history (not runbooks)

| Directory          | Topic                                      |
| ------------------ | ------------------------------------------ |
| [plans/](./plans/) | Feature plans (e.g. media-player MSE)      |

These are excluded from the GitHub Pages build (\`docs/_config.yml\`).

### Code trees (pointers only)

| Path                                          | Use                                      |
| --------------------------------------------- | ---------------------------------------- |
| [\`core/web/\`](../core/web/)                   | Nuxt app source; config \`nuxt.config.ts\` |
| [\`packages/\`](../packages/)                   | \`utilities\`, \`media-player\`, \`likwidlibs\`, \`web-layer-admin\` |
| [\`theme/core/\`](../theme/core/)               | Packaged theme (\`@tgmc/theme\`)           |
| [\`.github/workflows/\`](../.github/workflows/) | Tests, sync, and GitHub profile YAML     |
`,

  "docs/_catalog.md": `## Catalog (by directory)

Instructions are grouped the same way as the repo. Prefer these pages over duplicating setup in package READMEs.

On GitHub Pages, use the **topic** links (themed HTML). Filenames in the GitHub tree catalog: [docs/README.md](https://github.com/likwidmack/portfolio/blob/main/docs/README.md).

### This tree

| Topic                         | Path                 |
| ----------------------------- | -------------------- |
| [Contributing](contributing.html) | \`contributing.md\` |

### App (\`@tgmc/web\`)

| Topic                                                       | Path                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| [App docs hub](web/)                                        | \`web/README.md\`                                               |
| [Quick start](web/guides/quickstart.html)                   | \`web/guides/quickstart.md\`                                    |
| [Examples](web/guides/examples.html)                        | \`web/guides/examples.md\`                                      |
| [Environment variables](web/setup/environment.html)         | \`web/setup/environment.md\`                                    |
| [SSL / HTTPS](web/setup/ssl-setup.html)                     | \`web/setup/ssl-setup.md\`                                      |
| [Messages API](web/features/messages-api.html)              | \`web/features/messages-api.md\`                                |
| [Page data loading](web/features/page-data-loading.html)    | \`web/features/page-data-loading.md\`                           |
| [Gallery and docs hubs](web/features/gallery-and-docs.html) | \`web/features/gallery-and-docs.md\` (\`/docs\` via Work sub-nav) |
| [Data stores](web/data-stores.html)                         | \`web/data-stores.md\`                                          |
| [Project structure](web/reference/project-structure.html)   | \`web/reference/project-structure.md\`                          |
| [Architecture hub](web/reference/architecture.html)         | \`web/reference/architecture.md\`                               |
| [System C4](web/reference/system-c4.html)                   | \`web/reference/system-c4.md\`                                  |
| [API & store UML](web/reference/api-uml.html)               | \`web/reference/api-uml.md\`                                    |
| [Site wireframes](web/reference/site-wireframes.html)       | \`web/reference/site-wireframes.md\`                            |
| [Process sequences](web/reference/process-sequences.html)   | \`web/reference/process-sequences.md\`                          |
| [TypeScript types](web/reference/types.html)                | \`web/reference/types.md\`                                      |
| [TypeScript config](web/reference/typescript-config.html)   | \`web/reference/typescript-config.md\`                          |

### Packages

| Topic                                        | Path                                                   |
| -------------------------------------------- | ------------------------------------------------------ |
| [Packages index](packages/)                  | \`packages/README.md\`                                   |
| [\`@tgmc/utilities\`](packages/utilities.html) | \`packages/utilities.md\`                                |
| [\`@tgmc/theme\`](packages/theme.html)         | \`packages/theme.md\` (brand vs hue, \`data-fit\`, ratios) |

### Developer tooling

| Topic                                               | Path                               |
| --------------------------------------------------- | ---------------------------------- |
| [Dev tooling index](dev/)                           | \`dev/README.md\`                    |
| [npm overrides](dev/npm-security-overrides.html)    | \`dev/npm-security-overrides.md\`    |
| [Encapsulation](dev/encapsulation-remediation.html) | \`dev/encapsulation-remediation.md\` |

### Design history (not runbooks)

These directories are **not** built into Pages. Open them on GitHub:

| Topic         | On GitHub                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------ |
| Feature plans | [docs/plans/](https://github.com/likwidmack/portfolio/tree/main/docs/plans)                 |

### Code trees (on GitHub)

| Path                                                                                               | Use                                           |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [\`core/web/\`](https://github.com/likwidmack/portfolio/tree/main/core/web)                   | Nuxt app; \`nuxt.config.ts\`                    |
| [\`packages/\`](https://github.com/likwidmack/portfolio/tree/main/packages)                   | \`utilities\`, \`media-player\`, \`likwidlibs\`     |
| [\`theme/core/\`](https://github.com/likwidmack/portfolio/tree/main/theme/core)               | \`@tgmc/theme\`                                 |
| [\`.github/workflows/\`](https://github.com/likwidmack/portfolio/tree/main/.github/workflows) | Tests, sync, and GitHub profile YAML          |
`,

  "docs/index.md": `---
layout: default
title: Documentation
permalink: /
---

# tgmc-portfolio documentation

Canonical instructions for this monorepo live under **\`docs/\`**. The [root README](https://github.com/likwidmack/portfolio#readme) is a GitHub landing page only.

**Humans:** [Quick start](web/guides/quickstart.html).

{% include_relative _catalog.md %}
`,

  "docs/contributing.md": `# Contributing

## Documentation

1. Put durable instructions under [\`docs/\`](./), categorized by directory (see the catalog).
2. Link new pages from \`docs/README.md\` **and** \`docs/_catalog.md\` (GitHub Pages include).
3. Keep the [root README](https://github.com/likwidmack/portfolio#readme) short: badges, one quick start, links into \`docs/\`.
4. GitHub **About**, **topics**, and **Website** should stay aligned with \`package.json\` \`description\`, \`homepage\`, and \`keywords\`.
5. Package READMEs (\`packages/*\`) stay operational or package-local; they should point here for topology.

### Whenever documentation is altered

Treat every docs edit (new page, rewrite, or behavior change reflected in markdown) as a **content sync**, not a drive-by typo fix:

1. **Review related docs** — update cross-links, catalogs (\`docs/README.md\`, \`docs/_catalog.md\`), and any hub that points at the page (\`docs/web/README.md\`, \`docs/packages/README.md\`).
2. **Review inline comments / JSDoc** in the code the page describes; keep file headers and token comments aligned with the written contract (or delete stale comments).
3. **In-app \`/docs\`** — markdown under repo \`docs/\` is ingested in place (\`core/web/shared/docs-source.ts\`). Editing those files **is** updating docs content; do not copy into \`core/web/content/\`. Rebuild the web app when you need the Content dump refreshed.

## Code

- Node **>=24** (\`.nvmrc\`).
- Format + lint: \`npm run lint\`.
- Tests: \`npm test\`.

## Pull requests

- PRs into \`main\` run [Tests](https://github.com/likwidmack/portfolio/actions/workflows/test.yml).
`,

  "docs/dev/README.md": `# Developer tooling

| File                                                           | Topic                              |
| -------------------------------------------------------------- | ---------------------------------- |
| [npm-security-overrides.md](./npm-security-overrides.md)       | npm \`overrides\`                    |
| [encapsulation-remediation.md](./encapsulation-remediation.md) | Import / layer boundaries          |

Related: [contributing.md](../contributing.md).
`,

  "docs/web/README.md": `# App documentation (\`docs/web\`)

Guides for the Nuxt app \`@tgmc/web\` (\`core/web\`).

**Hub:** [Catalog](../)

## Public chrome (restyle IA)

Primary navigation (\`AppPrimaryNav\`): **Work** → \`/work\`, **About** → \`/about\`, **Gallery** → \`/gallery\`, **Writing** → \`/blog\`, **Code** → \`/code\`.

Work sub-navigation (\`AppWorkSubNav\` on \`/work\` and \`/work/[slug]\`): **Docs** → \`/docs\`, **AI Lab** → \`/ai-lab\`, **Process** → \`/process\`. Secondary demos (\`/media-player\`, \`/product\`, \`/styles\`) stay off the primary rail.

Shipped page layouts (ember brand; sparse \`--portfolio-teal\` on About résumé, Gallery stats, Code language tags):

| Surface           | Layout notes                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Home              | Fluid split hero (\`data-fit="screen"\`); ambient video confined to \`.home-hero__visual\`         |
| About             | Digital CV sidebar + sticky on-page nav (\`data-fit="prose"\`); teal résumé download             |
| Gallery           | Social feed/grid; default **grid**; teal engagement stats                                      |
| Writing (\`/blog\`) | Editorial shelf (\`content/writing.json\` essays + \`/api/posts\` notes) — not a flat “Notes” list |
| Code              | Editor chrome + explorer/repos; teal language tags                                             |
| Work              | Case-study grid + evidence dialog; Related sub-nav for Docs / AI Lab / Process                 |

Theme tokens and \`data-fit\`: [packages/theme.md](../packages/theme.md). Gallery + \`/docs\` hubs: [features/gallery-and-docs.md](./features/gallery-and-docs.md).

## Getting started

- [Quick start](./guides/quickstart.md)
- [Examples](./guides/examples.md)
- [Environment variables](./setup/environment.md)
- [SSL / HTTPS](./setup/ssl-setup.md)

## Features

- [Messages API](./features/messages-api.md)
- [Page data loading](./features/page-data-loading.md)
- [Gallery and technical docs](./features/gallery-and-docs.md)
- [Theme layout / page fit](../packages/theme.md) (\`data-fit\`, ratios, container fit)
- [Data stores](./data-stores.md) (SQLite / Postgres / DynamoDB)

## Reference

- [Project structure](./reference/project-structure.md)
- [Architecture hub](./reference/architecture.md) — [System C4](./reference/system-c4.md) · [API UML](./reference/api-uml.md) · [Wireframes](./reference/site-wireframes.md) · [Sequences](./reference/process-sequences.md)
- [TypeScript types](./reference/types.md)
- [TypeScript config](./reference/typescript-config.md)

## Commands

From **repo root** (not \`core/web\` alone):

\`\`\`bash
npm ci
npm run db:migrate:local
npm run dev
npm run build
npm test
npm run lint
NUXT_APP_CDN_URL=https://cdn.example.com npm run build
\`\`\`

## Source

| Path                      | Role                               |
| ------------------------- | ---------------------------------- |
| \`core/web/nuxt.config.ts\` | Aliases, Nitro, runtimeConfig, CDN |
| \`core/web/package.json\`   | App scripts                        |
`,

  "docs/web/guides/quickstart.md": `# Quick Start Guide

Get up and running in 5 minutes.

## Installation & Setup

### 1. Prerequisites

- Node.js **>= 24** (see repo \`.nvmrc\`)
- npm
- Git

### 2. Install dependencies (repository root)

\`\`\`bash
npm ci
npm run db:migrate:local
\`\`\`

### 3. Start the development server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at \`http://localhost:4200\`

---

## Basic Usage

### Vue Components

\`\`\`vue
<script setup lang="ts">
import { useCdn } from '#shared/utils/cdn';

const { cdnUrl, resolvePath, isEnabled } = useCdn();
const imageUrl = resolvePath('/images/hero.webp');
</script>

<template>
  <img v-if="isEnabled()" :src="imageUrl" alt="Hero" />
</template>
\`\`\`

### Server Code

\`\`\`typescript
import { resolveCdnPath } from '#shared/utils/cdn';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const cdnUrl = config.public.cdnUrl;
  const logoUrl = resolveCdnPath('/images/logo.png', cdnUrl);
  return { logoUrl };
});
\`\`\`

---

## Common Commands

| Command                    | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| \`npm run dev\`              | Start dev server                                                           |
| \`npm run db:migrate:local\` | Apply local SQLite migrations                                              |
| \`npm run build\`            | Build for production                                                       |
| \`npm run build:libs\`       | Build workspace libraries                                                  |
| \`npm run test\`             | Run tests                                                                  |
| \`npm run lint\`             | Prettier + lint all Nx packages with a lint target                         |
| \`npm run format\`           | Format code only                                                           |

---

## With CDN

Enable CDN for faster asset delivery:

\`\`\`bash
NUXT_APP_CDN_URL=https://cdn.example.com npm run dev
\`\`\`

See [Code Examples](./examples.md) for CDN usage.

---

## With HTTPS

For local HTTPS development:

\`\`\`bash
# Generate SSL certificates (once)
npm run ssl:gen:linux  # or ssl:gen:windows on PowerShell

# Start HTTPS server
npm run start:ssl:4200
\`\`\`

See [SSL Setup](../setup/ssl-setup.md) for details.

---

## Next Steps

1. Explore the **[Project Structure](../reference/project-structure.md)**
2. Check **[Code Examples](./examples.md)**
3. Review **[TypeScript Configuration](../reference/typescript-config.md)**

---

**Need more help?** See the full documentation index at \`docs/README.md\`
`,

  "docs/packages/README.md": `# Packages

Workspace libraries under \`packages/\` and \`theme/\`.

| Package                 | Docs                                              | Code                     |
| ----------------------- | ------------------------------------------------- | ------------------------ |
| \`@tgmc/utilities\`       | [utilities.md](./utilities.md)                    | \`packages/utilities/\`    |
| \`@tgmc/theme\`           | [theme.md](./theme.md) (tokens, page-fit, ratios) | \`theme/core/\`            |
| \`@tgmc/media-player\`    | \`packages/media-player/README.md\`                 | \`packages/media-player/\` |
| \`@tgmc/likwidlibs\`      | \`packages/likwidlibs/README.md\`                   | \`packages/likwidlibs/\`   |
| \`@tgmc/web-layer-admin\` | Package README                                    | \`packages/web-layer-admin/\` |

Build libs: \`npm run build:libs\`.
`,

  "docs/web/setup/ssl-setup.md": `# SSL/HTTPS Setup

Configure local HTTPS development for the Nuxt application.

## Generate SSL Certificates

### Windows (PowerShell)

\`\`\`bash
npm run ssl:gen:windows
\`\`\`

### Linux/WSL/Git Bash

\`\`\`bash
npm run ssl:gen:linux
\`\`\`

On Git Bash for Windows, the script uses \`-subj //CN=...\` so MSYS does not rewrite \`/CN=\` to \`C:/Program Files/Git/CN=...\`.

This generates certificates in \`core/web/bin/ssl/\`.

## Start HTTPS Server

\`\`\`bash
npm run start:ssl:4200
\`\`\`

The application will be available at:

| Stack                              | URL                                 | Hosts file                       |
| ---------------------------------- | ----------------------------------- | -------------------------------- |
| Local (\`npm run start:ssl:4200\`)   | \`https://tgmc-portfolio.local:4200\` | \`127.0.0.1 tgmc-portfolio.local\` |

Certs include SANs for \`localhost\`, \`tgmc-portfolio.local\`, \`www.tgmc-portfolio.local\`, \`tgmc-portfolio.test\`, \`www.tgmc-portfolio.test\`, \`127.0.0.1\`, and \`::1\`.

**Do not use \`*.dev\`.** Google’s \`.dev\` TLD is on the browser HSTS preload list, so Firefox/Chrome refuse self-signed certificate exceptions (the warning you cannot bypass). Use \`.local\` / \`.test\` instead.

## Configuration

Default certs (after generate scripts):

- \`core/web/bin/ssl/localhost.crt\`
- \`core/web/bin/ssl/localhost.key\`

When \`HTTPS=1\` is set, Nuxt uses these files. Override with \`SSL_CERT\` / \`SSL_KEY\`.

## Scripts

Available npm scripts:

- \`npm run ssl:gen:windows\` - Generate certs (Windows PowerShell)
- \`npm run ssl:gen:linux\` - Generate certs (Linux/WSL)
- \`npm run start:ssl:4200\` - Start HTTPS server

## Troubleshooting

### Browser Shows Security Warning

This is normal for self-signed certificates. Click "Advanced" and proceed to localhost.

### Certificate Generation Failed

1. Ensure you have administrative privileges
2. Try the other script if on hybrid system
3. Check \`core/web/bin/ssl/\` directory exists

### Port Already in Use

Change port in command:

\`\`\`bash
HTTPS=1 npm run dev -- --port 4317
\`\`\`

## Related Files

- \`core/web/bin/ssl/README.md\` - Cert filenames and SAN list
- \`core/web/bin/generate-ssl-*.sh|.ps1\` - Certificate generation scripts
- \`core/web/nuxt.config.ts\` - HTTPS configuration

## See Also

- [Quick Start Guide](../guides/quickstart.md)
- [Environment Variables](./environment.md)
`,
};

function writeHubFiles(staging) {
  for (const [rel, contents] of Object.entries(HUB_FILES)) {
    const full = path.join(staging, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
}

function existsOnDisk(target) {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

function markdownTargetExists(fromFile, href, staging) {
  const trimmed = String(href || "").trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("#") || trimmed.startsWith("mailto:")) return true;
  if (/^https?:\/\//i.test(trimmed)) {
    const gh = trimmed.match(
      /^https:\/\/github\.com\/likwidmack\/portfolio\/(?:blob|tree)\/[^/]+\/([^)#]+)/i,
    );
    if (!gh) return true;
    const rel = decodeURIComponent(gh[1]).replace(/\/$/, "");
    const abs = path.join(staging, rel);
    if (existsOnDisk(abs)) return true;
    if (existsOnDisk(`${abs}.md`)) return true;
    return false;
  }
  if (trimmed.startsWith("/")) return true;

  const urlPath = trimmed.split("#")[0].split("?")[0];
  if (!urlPath) return true;
  const target = path.resolve(path.dirname(fromFile), urlPath);
  if (existsOnDisk(target)) return true;
  if (urlPath.endsWith(".html")) {
    const md = target.replace(/\.html$/, ".md");
    if (existsOnDisk(md)) return true;
  }
  if (existsOnDisk(`${target}.md`)) return true;
  return false;
}

function rewriteFileLinks(staging, file) {
  let text = fs.readFileSync(file, "utf8");
  text = text.replaceAll("/blob/development/", "/blob/main/");
  text = text.replaceAll("/tree/development/", "/tree/main/");
  text = text.replace(MD_LINK_RE, (match, label, href) => {
    if (markdownTargetExists(file, href, staging)) {
      return match
        .replace("/blob/development/", "/blob/main/")
        .replace("/tree/development/", "/tree/main/");
    }
    return label;
  });
  text = text.replace(/ — see portfolio-august-launch\.md\.?/g, "");
  fs.writeFileSync(file, text);
}

function walkMarkdown(dir, files) {
  if (!existsOnDisk(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(full, files);
      continue;
    }
    if (entry.name.endsWith(".md")) files.push(full);
  }
}

export function rewriteBrokenDocLinks(staging) {
  const files = [];
  walkMarkdown(path.join(staging, "docs"), files);
  for (const file of files) {
    rewriteFileLinks(staging, file);
  }
}

function replaceInFile(staging, rel, replacements) {
  const file = path.join(staging, rel);
  if (!existsOnDisk(file)) return;
  let text = fs.readFileSync(file, "utf8");
  for (const [pattern, next] of replacements) {
    text = text.replace(pattern, next);
  }
  fs.writeFileSync(file, text);
}

function patchKeptDocs(staging) {
  replaceInFile(staging, "docs/web/setup/environment.md", [
    [
      /Legacy `SYS_ENV=remote`[\s\S]*?(?=## SYS_ENV)/,
      "",
    ],
    [
      /Canonical runtime for CI\/CD\/Docker\/SAM is \*\*Node\.js 24\*\* \(see \[docs\/cicd\.md\]\(\.\.\/\.\.\/cicd\.md\)\)\./,
      "Canonical runtime is **Node.js 24** (`.nvmrc`).",
    ],
    [
      /- \*\*CI\*\*: \*\*Required\*\* — GitHub repository secret `NX_CLOUD_ACCESS_TOKEN` \(see \[docs\/cicd\.md\]\(\.\.\/\.\.\/cicd\.md\)\)/,
      "- **CI**: optional GitHub Actions secret `NX_CLOUD_ACCESS_TOKEN`",
    ],
    [
      /Copy `\.env\.example` to `\.env` \(defaults: `SYS_ENV=local`, `DATABASE_URL=file:.*`\)\. The SQLite file lives under `data\/` \(gitignored\)\./,
      "Set `SYS_ENV=local` and `DATABASE_URL=file:./data/local.sqlite` (or a gitignored `.env`). The SQLite file lives under `data/` (gitignored).",
    ],
    [/gh secret set NX_CLOUD_ACCESS_TOKEN --body "your-token"\n/, ""],
    [
      /- \*\*Local default\*\*: `tgmc-portfolio\.local` \(\`\.env\.example\`\)/,
      "- **Local default**: `tgmc-portfolio.local`",
    ],
    [
      /- \*\*Docker development default\*\*: `tgmc-portfolio\.test` \(\`\.env\.development\.example\`\)/,
      "- **Development default**: `tgmc-portfolio.test`",
    ],
    [
      /- \*\*Workspace\*\*: `nx\.json` → `nxCloudId`/,
      "- **Workspace**: optional Nx Cloud remote cache",
    ],
    [
      /Do not commit real tokens to `\.env\.example`\./,
      "Do not commit real tokens.",
    ],
    [/# GitHub Actions \(one-time\)\n/, ""],
    [/```bash\n```\n\n/, ""],
    [
      /### Development \(Postgres \/ Docker\)/,
      "### Development (Postgres)",
    ],
    [
      /- \*\*Usage\*\*: Requires SSL certificates in `bin\/ssl\/`/,
      "- **Usage**: Requires SSL certificates in `core/web/bin/ssl/`",
    ],
    [
      /- \*\*Default\*\*: `bin\/ssl\/localhost\.crt` \(via `core\/web\/bin\/ssl\/`\)/,
      "- **Default**: `core/web/bin/ssl/localhost.crt`",
    ],
    [
      /- \*\*Default\*\*: `bin\/ssl\/localhost\.key`/,
      "- **Default**: `core/web/bin/ssl/localhost.key`",
    ],
  ]);

  replaceInFile(staging, "docs/web/data-stores.md", [
    [
      /Templates \(no secrets\): `\.env\.example`, `\.env\.development\.example`, `\.env\.test\.example`, `\.env\.production\.example`\.\n\n/,
      "",
    ],
    [
      /## Where values are injected\n\n\| Env[\s\S]*?\n\n## Verify/,
      `## Where values are injected

Local and development reads process env (\`SYS_ENV\`, \`DATABASE_URL\` / \`NUXT_DATABASE_URL\`). Test and production map adapter keys (\`DYNAMO_TABLE\`, \`DYNAMO_POSTS_TABLE\`, \`AWS_REGION\`) through Nitro \`runtimeConfig\`.

## Verify`,
    ],
    [
      /npm run db:migrate:local\ncd core\/web && npx vitest run server\/db tests\/resolve-process-env.spec.ts\nnpm run docker:dev    # Postgres\nnpm run docker:test   # Dynamo Local \(ensureNitroOutput first\)\n/,
      `npm run db:migrate:local
cd core/web && npx vitest run server/db tests/resolve-process-env.spec.ts
`,
    ],
    [
      /\*\*Rule:\*\* SQLite and Postgres are for \*\*local \/ development\*\* \(and local Docker\) only\./,
      "**Rule:** SQLite and Postgres are for **local / development** only.",
    ],
    [
      /The in-app `\/docs` hub parses markdown from the repo `docs\/` directory \*\*in place\*\* \(see \[gallery-and-docs.md\]\(\.\/features\/gallery-and-docs.md\)\)\. Those files are not copied into `core\/web\/content\/`\. Slim `Dockerfile\.app` copies host `\.output\/<SYS_ENV>` \(docs are already dumped into the Nitro build\); SAM\/Lambda only ships the dump\./,
      "The in-app `/docs` hub parses markdown from the repo `docs/` directory **in place** (see [gallery-and-docs.md](./features/gallery-and-docs.md)). Those files are not copied into `core/web/content/`.",
    ],
    [
      /Empty baked `runtimeConfig` strings are treated as unset \(`nonEmpty` \/ `firstNonEmptyEnv`\) so Docker and Lambda env can supply real values\. Prefer `NUXT_\*` when both plain and Nuxt names are set\./,
      "Empty baked `runtimeConfig` strings are treated as unset (`nonEmpty` / `firstNonEmptyEnv`) so process env can supply real values. Prefer `NUXT_*` when both plain and Nuxt names are set.",
    ],
  ]);

  replaceInFile(staging, "docs/web/reference/site-wireframes.md", [
    [/- \[Portfolio August launch IA\]\(\.\.\/\.\.\/portfolio-august-launch\.md\)\n/, ""],
  ]);

  replaceInFile(staging, "docs/web/reference/architecture.md", [
    [
      / Full IA: \[portfolio-august-launch\.md\]\(\.\.\/\.\.\/portfolio-august-launch\.md#public-information-architecture\)\./,
      "",
    ],
    [/- \[CI\/CD\]\(\.\.\/\.\.\/cicd\.md\) · \[Docker\]\(\.\.\/\.\.\/docker\.md\) · \[SAM \/ infra\]\(\.\.\/\.\.\/infra\.md\)\n/, ""],
    [
      /- \[August launch IA\]\(\.\.\/\.\.\/portfolio-august-launch\.md#public-information-architecture\)\n/,
      "",
    ],
  ]);

  replaceInFile(staging, "docs/web/reference/system-c4.md", [
    [
      /C4-style views of the portfolio site and surrounding systems\. Source of truth: `core\/web`, `packages\/\*`, `theme\/core`, `infra\/sam`, `docker\/`\./,
      "C4-style views of the portfolio site and surrounding systems. Source of truth: `core/web`, `packages/*`, `theme/core`.",
    ],
    [/ \/ `docker:local` `:4200`/, " `:4200`"],
    [/`docker:dev` web `:4200` \+ api `:4100`/, "`npm run start` `:4200`"],
    [/SAM test \/ `docker:test` `:4300`/, "Lambda / HTTP API"],
    [
      /  Out --> LocalDocker\["docker:local SQLite :4200"\]\n  Out --> DevDocker\["docker:dev Postgres :4200\/:4100"\]\n  Out --> TestDocker\["docker:test DynamoDB Local \+ RIE :4300"\]\n  Out --> SAM\["sam-build → Lambda \+ HTTP API"\]/,
      `  Out --> LocalDev["npm run dev SQLite :4200"]
  Out --> DevPg["development Postgres :4200"]
  Out --> SAM["Lambda + HTTP API"]`,
    ],
    [
      /- Docker does \*\*not\*\* emulate S3\/CDN; `docker:local` and `docker:dev` both use host `:4200` \(exclusive\)\.\n/,
      "",
    ],
    [/- Test CDN is the shared HyperActivity stack; production uses stack-owned CloudFront\.\n/, ""],
    [/- \[Infra\]\(\.\.\/\.\.\/infra\.md\) · \[Docker\]\(\.\.\/\.\.\/docker\.md\) · \[CI\/CD\]\(\.\.\/\.\.\/cicd\.md\)\n/, ""],
  ]);

  replaceInFile(staging, "docs/web/reference/process-sequences.md", [
    [/- \[CI\/CD\]\(\.\.\/\.\.\/cicd\.md\)\n/, ""],
    [/- \[Infra\]\(\.\.\/\.\.\/infra\.md\)\n/, ""],
  ]);

  replaceInFile(staging, "docs/web/reference/project-structure.md", [
    [/- E2E: `core\/web-e2e\/` \(Cypress\)\n/, ""],
  ]);

  replaceInFile(staging, "docs/web/features/gallery-and-docs.md", [
    [
      /\| \[`\/docs\/\.\.\.`\]\(\/docs\/cicd\) \| Individual spec \/ runbook rendered from that markdown               \| Linked from the docs catalog; Work sub-nav stays on Work pages only \|/,
      "| [`/docs/...`](/docs/contributing) | Individual spec / runbook rendered from that markdown               | Linked from the docs catalog; Work sub-nav stays on Work pages only |",
    ],
    [
      /Public primary rail is \*\*Work \/ About \/ Gallery \/ Writing \/ Code\*\*\. Docs, AI Lab \(`\/ai-lab`\), and Process \(`\/process`\) live under Work[^\n]*/,
      "Public primary rail is **Work / About / Gallery / Writing / Code**. Docs, AI Lab (`/ai-lab`), and Process (`/process`) live under Work.",
    ],
  ]);

  replaceInFile(staging, "docs/packages/theme.md", [
    [
      / Coral-era sources are snapshotted under `archive\/v2\/` \(not imported by the app\)\./,
      "",
    ],
    [
      / Work Related links reuse `\.page-nav` \(sticky aside from tablet up; compact horizontal rail on small viewports\) via `AppWorkSubNav` — see \[portfolio-august-launch.md\]\(\.\.\/portfolio-august-launch.md#public-information-architecture\)\./,
      " Work Related links reuse `.page-nav` (sticky aside from tablet up; compact horizontal rail on small viewports) via `AppWorkSubNav`.",
    ],
  ]);

  replaceInFile(staging, "docs/packages/utilities.md", [
    [
      / Root `scripts\/test-web.sh` builds `@tgmc\/utilities` and `@tgmc\/media-player` before web Vitest, because web imports resolve through package `exports` → `dist\/\*` \(not the `tgmc-portfolio` → `src` condition\)\./,
      " Root `npm test` builds dependency packages before web Vitest, because web imports resolve through package `exports` → `dist/*`.",
    ],
    [
      /\n## Design history\n\n- \[Lambda-ready entry split\]\([^\)]+\)\n- \[Harden \+ storage move\]\([^\)]+\)\n/,
      "\n",
    ],
  ]);

  replaceInFile(staging, "docs/web/guides/examples.md", [
    [/- \[CDN Guide\]\(\.\.\/features\/cdn-guide.md\)\n/, ""],
  ]);

  replaceInFile(staging, "docs/dev/encapsulation-remediation.md", [
    [
      /3\. \*\*Docker\*\* — `docker\/Dockerfile.app` \+ Compose build args replace duplicate `Dockerfile.api` \/ `Dockerfile.web` \(ports 4100\/4200\)\.\n/,
      "",
    ],
    [
      /6\. \*\*Coverage\*\* — Vitest thresholds on `@tgmc\/utilities` \(80\/80\/70\/80\) and `@tgmc\/web` server db\/api \+ personalization \(70\/65\/55\/70\); CI runs both with `--coverage`\. Also runs `sam-deploy-flow.test.mjs` in the deployable gate job\./,
      "6. **Coverage** — Vitest thresholds on `@tgmc/utilities` (80/80/70/80) and `@tgmc/web` server db/api + personalization (70/65/55/70).",
    ],
  ]);
}

export function applyPublicDocs(staging) {
  patchKeptDocs(staging);
  rewriteBrokenDocLinks(staging);
  writeHubFiles(staging);
}
