import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "tests/fixtures/source-mini");
const syncSh = path.join(root, "sync/sync.sh");

function runSync(dest, tag = "v1.3.19") {
  const result = spawnSync(
    "bash",
    [syncSh, "--source", fixture, "--dest", dest, "--tag", tag, "--sha", "abc1234deadbeef"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`sync failed (${result.status}): ${result.stdout}\n${result.stderr}`);
  }
  return result;
}

test("app packages survive and private internals do not", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest);

  const kept = [
    "core/web/nuxt.config.ts",
    "packages/utilities/package.json",
    "packages/web-layer-admin/package.json",
    "theme/core/package.json",
    "docs/README.md",
    "package.json",
    ".sync-meta.json",
  ];
  for (const rel of kept) {
    assert.ok(fs.existsSync(path.join(dest, rel)), `missing ${rel}`);
  }

  const dropped = [
    "scripts/dev.sh",
    "docker/Dockerfile.dev",
    "infra/sam/template.yaml",
    ".github/workflows/ci.yml",
    ".env.example",
    "AGENTS.md",
    "archive/v1/old.txt",
    "core/web/.env.cdn.example",
    "docs/infra.md",
  ];
  for (const rel of dropped) {
    assert.equal(fs.existsSync(path.join(dest, rel)), false, `leaked ${rel}`);
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8"));
  assert.equal(pkg.name, "portfolio");
  assert.equal(pkg.version, "1.3.19");
  assert.equal(pkg.scripts["docker:local"], undefined);
  assert.equal(pkg.scripts.dev, "nx dev @tgmc/web");
  assert.equal(pkg.scripts["db:migrate:local"], "node core/web/bin/db-migrate-local.mjs");
  assert.equal(pkg.scripts.format, "prettier -wl .");
  assert.equal(pkg.scripts["build:libs"]?.includes("@tgmc/utilities"), true);
  assert.match(pkg.repository.url, /likwidmack\/portfolio/);
  assert.doesNotMatch(pkg.description, /sanitized/i);
  assert.match(pkg.description, /Nx \+ Nuxt 4 SSR portfolio/);
  assert.ok(fs.existsSync(path.join(dest, "core/web/bin/db-migrate-local.mjs")));

  const web = JSON.parse(fs.readFileSync(path.join(dest, "core/web/package.json"), "utf8"));
  assert.equal(web.nx.targets.test.options.command, "npm run test --workspace=@tgmc/web");

  const nx = JSON.parse(fs.readFileSync(path.join(dest, "nx.json"), "utf8"));
  assert.equal(nx.nxCloudId, undefined);
  for (const plugin of nx.plugins || []) {
    if (!plugin || typeof plugin !== "object") continue;
    assert.ok(
      Array.isArray(plugin.exclude) && plugin.exclude.includes("tests/**"),
      "nx plugins must ignore dest test fixtures",
    );
  }

  const tsconfig = JSON.parse(fs.readFileSync(path.join(dest, "tsconfig.json"), "utf8"));
  const tsPaths = (tsconfig.references || []).map((ref) => ref.path);
  assert.ok(tsPaths.includes("./core/web"));
  assert.equal(tsPaths.includes("./core/web-e2e"), false);

  const meta = JSON.parse(fs.readFileSync(path.join(dest, ".sync-meta.json"), "utf8"));
  assert.equal(meta.sourceRepo, "tamaramack/portfolio");
  assert.equal(meta.sourceTag, "v1.3.19");

  const readme = fs.readFileSync(path.join(dest, "README.md"), "utf8");
  assert.match(readme, /^# tgmc-portfolio/m);
  assert.match(readme, /likwidmack\.com/);
  assert.match(readme, /Table of contents/);
  assert.match(readme, /Quick start/);
  assert.doesNotMatch(
    readme,
    /tamaramack|sanitized|TM_GH_TOKEN|LK_GH_TOKEN|private source|public mirror|Synced from/i,
  );

  const docsReadme = fs.readFileSync(path.join(dest, "docs/README.md"), "utf8");
  assert.match(docsReadme, /likwidmack\/portfolio/);
  assert.doesNotMatch(docsReadme, /tamaramack\/portfolio/);
  assert.doesNotMatch(
    docsReadme,
    /cicd\.md|docker\.md|infra\.md|docs\/agents|github-access|pages\.yml|AGENTS\.md|git-hooks/,
  );

  const contributing = fs.readFileSync(path.join(dest, "docs/contributing.md"), "utf8");
  assert.match(contributing, /docs\/README\.md/);
  assert.doesNotMatch(
    contributing,
    /cicd\.md|github-access|agents\/README|AGENTS\.md|git-hooks|docker\/|infra\/sam/,
  );

  const quickstart = fs.readFileSync(path.join(dest, "docs/web/guides/quickstart.md"), "utf8");
  assert.match(quickstart, /npm run db:migrate:local/);
  assert.doesNotMatch(quickstart, /git-hooks|cdn-guide|cdn-quickstart/);

  const catalog = fs.readFileSync(path.join(dest, "docs/_catalog.md"), "utf8");
  assert.doesNotMatch(
    catalog,
    /cicd\.md|docker\.md|infra\.md|agents\/README|github-access|AGENTS\.md/,
  );

  const architecture = fs.readFileSync(
    path.join(dest, "docs/web/reference/architecture.md"),
    "utf8",
  );
  assert.doesNotMatch(architecture, /\]\([^)]*cicd\.md\)|\]\([^)]*docker\.md\)|\]\([^)]*infra\.md\)/);
});

test("CDN objects under core/web/public are dropped", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest);

  const dropped = [
    "core/web/public/i/portfolio/social-card.png",
    "core/web/public/v/portfolio/generated/clip.mp4",
    "core/web/public/d/Resume2026.pdf",
    "core/web/public/favicon.ico",
    "core/web/public/README.md",
  ];
  for (const rel of dropped) {
    assert.equal(fs.existsSync(path.join(dest, rel)), false, `leaked CDN object ${rel}`);
  }

  assert.equal(fs.existsSync(path.join(dest, "core/web/public/i")), false);
  assert.equal(fs.existsSync(path.join(dest, "core/web/public/v")), false);
  assert.equal(fs.existsSync(path.join(dest, "core/web/public/d")), false);
  assert.ok(fs.existsSync(path.join(dest, "core/web/public/.gitkeep")));
  assert.ok(fs.existsSync(path.join(dest, "core/web/nuxt.config.ts")));
});

test("branch tags keep the source package version", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest, "development");
  const pkg = JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8"));
  assert.equal(pkg.version, "1.3.19");
});

test("a second sync removes dest files dropped since the last run", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest);
  const stale = path.join(dest, "docs/infra.md");
  fs.mkdirSync(path.dirname(stale), { recursive: true });
  fs.writeFileSync(stale, "account 305052780274 leftover");
  runSync(dest);
  assert.equal(fs.existsSync(stale), false);
});
