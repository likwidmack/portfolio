#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MD_LINK_RE = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

const HUB_REL_PATHS = [
  "docs/README.md",
  "docs/_catalog.md",
  "docs/index.md",
  "docs/contributing.md",
  "docs/dev/README.md",
  "docs/web/README.md",
  "docs/web/guides/quickstart.md",
  "docs/web/guides/examples.md",
  "docs/web/setup/ssl-setup.md",
  "docs/web/setup/environment.md",
  "docs/packages/README.md",
];

function rewriterRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function writeHubFiles(staging) {
  const root = rewriterRoot();
  for (const rel of HUB_REL_PATHS) {
    const src = path.join(root, rel);
    const dest = path.join(staging, rel);
    if (!fs.existsSync(src)) {
      throw new Error(`missing dest-owned hub file: ${rel}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
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
  writeHubFiles(staging);
  rewriteBrokenDocLinks(staging);
}
