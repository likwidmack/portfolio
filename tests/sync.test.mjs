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
  assert.equal(pkg.scripts.dev, "nx nuxt dev");
  assert.match(pkg.repository.url, /likwidmack\/portfolio/);
  assert.doesNotMatch(pkg.description, /sanitized/i);

  const web = JSON.parse(fs.readFileSync(path.join(dest, "core/web/package.json"), "utf8"));
  assert.equal(web.nx.targets.test.options.command, "npm run test --workspace=@tgmc/web");

  const nx = JSON.parse(fs.readFileSync(path.join(dest, "nx.json"), "utf8"));
  assert.equal(nx.nxCloudId, undefined);

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
