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
  assert.match(readme, /repository-images\.githubusercontent\.com\/1349135003\//);
  assert.match(readme, /SECURITY\.md/);
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

  const seo = fs.readFileSync(path.join(dest, "core/web/app/composables/usePortfolioSeo.ts"), "utf8");
  assert.match(seo, /repository-images\.githubusercontent\.com\/1349135003\//);
  assert.doesNotMatch(seo, /social-card\.png/);
});

function assertCdnPlaceholder(destRoot, rel, originalText, kind) {
  const destFile = path.join(destRoot, rel);
  const srcFile = path.join(fixture, rel);
  assert.ok(fs.existsSync(destFile), `missing ${rel}`);
  const destBytes = fs.readFileSync(destFile);
  const srcBytes = fs.readFileSync(srcFile);
  assert.equal(srcBytes.toString("utf8"), originalText, `${rel} fixture original drifted`);
  assert.notEqual(Buffer.compare(destBytes, srcBytes), 0, `${rel} must not copy the fixture original`);
  assert.ok(destBytes.length > 0 && destBytes.length < 2048, `${rel} must be a tiny placeholder`);
  switch (kind) {
    case "png":
      assert.equal(destBytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      break;
    case "jpg":
      assert.equal(destBytes[0], 0xff);
      assert.equal(destBytes[1], 0xd8);
      break;
    case "webp":
      assert.equal(destBytes.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(destBytes.subarray(8, 12).toString("ascii"), "WEBP");
      break;
    case "svg":
      assert.match(destBytes.toString("utf8"), /<svg\b/);
      break;
    case "ico":
      assert.equal(destBytes.readUInt16LE(0), 0);
      assert.equal(destBytes.readUInt16LE(2), 1);
      break;
    case "mp4":
      assert.match(destBytes.toString("latin1"), /ftyp/);
      break;
    case "pdf":
      assert.equal(destBytes.subarray(0, 5).toString("ascii"), "%PDF-");
      break;
    case "js":
      assert.match(destBytes.toString("utf8"), /placeholder/);
      assert.doesNotMatch(destBytes.toString("utf8"), /hashed static public asset fixture/);
      assert.doesNotMatch(destBytes.toString("utf8"), /helix-lab-original/);
      break;
    case "html":
      assert.match(destBytes.toString("utf8"), /placeholder/);
      assert.doesNotMatch(destBytes.toString("utf8"), /lab/);
      break;
    default: {
      const unexpected = kind;
      throw new Error(`unhandled placeholder kind: ${unexpected}`);
    }
  }
}

test("CDN objects under core/web/public become placeholders", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest);

  assertCdnPlaceholder(dest, "core/web/public/i/portfolio/social-card.png", "cdn-card", "png");
  assertCdnPlaceholder(dest, "core/web/public/placeholder.png", "placeholder\n", "png");
  assertCdnPlaceholder(dest, "core/web/public/favicon.ico", "cdn-favicon", "ico");
  assertCdnPlaceholder(
    dest,
    "core/web/public/v/portfolio/generated/clip.mp4",
    "cdn-clip",
    "mp4",
  );
  assertCdnPlaceholder(dest, "core/web/public/d/Resume2026.pdf", "cdn-pdf", "pdf");
  assertCdnPlaceholder(
    dest,
    "core/web/public/i/portfolio/data-visualization-flow.svg",
    "cdn-svg-original\n",
    "svg",
  );
  assertCdnPlaceholder(
    dest,
    "core/web/public/i/portfolio/generated/vimg-crystal-volume.webp",
    "cdn-webp\n",
    "webp",
  );
  assertCdnPlaceholder(dest, "core/web/public/i/profile_pic_1.jpg", "cdn-jpg\n", "jpg");
  assertCdnPlaceholder(
    dest,
    "core/web/public/entry.a1b2c3d4.js",
    "/* hashed static public asset fixture */\n",
    "js",
  );

  const readme = fs.readFileSync(path.join(dest, "core/web/public/README.md"), "utf8");
  assert.match(readme, /Public static assets/);
  assertCdnPlaceholder(
    dest,
    "core/web/public/d/js/helix.js",
    "helix-lab-original\n",
    "js",
  );
  assertCdnPlaceholder(
    dest,
    "core/web/public/d/htm/wire_tess.html",
    "<!doctype html>lab\n",
    "html",
  );
  assert.ok(fs.existsSync(path.join(dest, "core/web/public/.gitkeep")));
  assert.ok(fs.existsSync(path.join(dest, "core/web/nuxt.config.ts")));
});

test("branch tags keep the source package version", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest, "main");
  const pkg = JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8"));
  assert.equal(pkg.version, "1.3.19");
});

test("a second sync removes dest files dropped since the last run", () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dest-"));
  runSync(dest);
  const stale = path.join(dest, "docs/infra.md");
  fs.mkdirSync(path.dirname(stale), { recursive: true });
  fs.writeFileSync(stale, "account 305052780274 leftover");
  const stub = path.join(dest, "core/web/public/i/portfolio/social-card.png");
  fs.mkdirSync(path.dirname(stub), { recursive: true });
  fs.writeFileSync(stub, "placeholder");
  runSync(dest);
  assert.equal(fs.existsSync(stale), false);
  assertCdnPlaceholder(dest, "core/web/public/i/portfolio/social-card.png", "cdn-card", "png");
});

test("dest-owned GitHub social preview is the real 1280x640 image", () => {
  const file = path.join(root, ".github/social-preview.png");
  assert.ok(fs.existsSync(file), "missing .github/social-preview.png");
  const buf = fs.readFileSync(file);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buf.readUInt32BE(16), 1280);
  assert.equal(buf.readUInt32BE(20), 640);
  assert.ok(buf.length > 10_000, "social preview must not be a 1x1 placeholder");
});

test("dest-owned security policy uses private reporting", () => {
  const policy = fs.readFileSync(path.join(root, "SECURITY.md"), "utf8");
  assert.match(policy, /security\/advisories\/new/);
  assert.match(policy, /Do not/i);
  assert.doesNotMatch(policy, /5\.1\.x/);
});
