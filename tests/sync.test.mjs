import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { copyAllowlisted } from "../sync/copy.mjs";
import { rewriteDest, rewritePackageJson } from "../sync/rewrite.mjs";
import { isDeniedPath, scanDest, scanText } from "../sync/scan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowlist = path.join(root, "sync/allowlist.txt");

async function makeFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-src-"));
  const files = {
    "src/main.js": "import store from '@/js/.sys/store'\n",
    "src/js/.sys/store.js": "export default { keep: true }\n",
    "src/css/.sys/settings.scss": "$ink: #0b0d12;\n",
    "api/configure.js": "module.exports = require('./.api')\n",
    "api/.api/index.js": "module.exports = () => {}\n",
    "api/data/5.items.json": "[]\n",
    "api/data/100.items.json": "[]\n",
    "api/data/3000.items.json": "[]\n",
    "api/data/options.json": "{}\n",
    "api/data/100000.people.json": "[\"too-big\"]\n",
    "bin/deploy.sh": "#!/bin/sh\necho deploy\n",
    "exports/s3.js": "module.exports = {}\n",
    ".env-sample": "AWS_SECRET_ACCESS_KEY=placeholder\n",
    "app.json": "{}\n",
    "vue.config.js": "module.exports = { pluginOptions: { s3Deploy: { bucket: 'x' } }, devServer: { before: () => {} } }\n",
    "server.js": "require('dotenv').config(); require('opn')('http://localhost')\n",
    "apps/portfolio/app/pages/index.vue": "<template><p>home</p></template>\n",
    "apps/portfolio/package.json": JSON.stringify({
      name: "portfolio",
      scripts: {
        build: "nuxt build",
        "build:pages": "nuxt build --preset github_pages",
        dev: "nuxt dev",
        postinstall: "nuxt prepare",
        typecheck: "nuxt typecheck",
      },
      dependencies: { nuxt: "^4.5.2", mongodb: "6.0.0" },
    }, null, 2) + "\n",
    "docs/architecture.md": "Source lives in `apps/portfolio`. See [deploy-pages.yml](../.github/workflows/deploy-pages.yml).\n",
    "package.json": `${JSON.stringify({
      name: "tamaramack.github.io",
      scripts: {
        clean: "node bin/clean.js",
        build: "vue-cli-service build",
        serve: "vue-cli-service serve",
        "test:e2e": "cypress run",
      },
      gitHooks: { "pre-commit": "lint-staged" },
    }, null, 2)}\n`,
  };
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body);
  }
  return dir;
}

test("hidden app dirs survive and internals do not", async () => {
  const source = await makeFixture();
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-dest-"));
  const copied = await copyAllowlisted(source, dest, allowlist);
  assert.ok(copied.includes("src/js/.sys/store.js"));
  assert.ok(copied.includes("api/.api/index.js"));
  assert.ok(copied.includes("api/data/5.items.json"));
  assert.ok(!copied.some((rel) => rel.startsWith("bin/")));
  assert.ok(!copied.some((rel) => rel.startsWith("exports/")));
  assert.ok(!copied.includes(".env-sample"));
  assert.ok(!copied.includes("app.json"));
  assert.ok(!copied.includes("api/data/100000.people.json"));
});

test("rewrite flattens Nuxt app, strips deploy scripts, and overlays dest files", async () => {
  const source = await makeFixture();
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-dest-"));
  await copyAllowlisted(source, dest, allowlist);
  await rewriteDest(dest);
  const pkg = JSON.parse(await fs.readFile(path.join(dest, "package.json"), "utf8"));
  assert.equal(pkg.name, "portfolio");
  assert.equal(pkg.repository.url, "git+https://github.com/likwidmack/portfolio.git");
  assert.equal(pkg.homepage, "https://tamaramack.github.io/");
  assert.ok(pkg.scripts.serve.includes("9200"));
  assert.ok(pkg.scripts.start.includes("9200"));
  assert.ok(pkg.scripts.postinstall.includes("nuxt prepare"));
  assert.equal(pkg.scripts["build:pages"], undefined);
  assert.equal(pkg.scripts.clean, undefined);
  assert.equal(pkg.dependencies.mongodb, undefined);
  assert.equal(pkg.gitHooks, undefined);
  assert.ok(await fs.readFile(path.join(dest, "app/pages/index.vue"), "utf8"));
  assert.ok(!(await exists(path.join(dest, "apps"))));
  const vueConfig = await fs.readFile(path.join(dest, "vue.config.js"), "utf8");
  assert.ok(!vueConfig.includes("s3Deploy"));
  const server = await fs.readFile(path.join(dest, "server.js"), "utf8");
  assert.ok(!server.includes("dotenv"));
  assert.ok(!server.includes("opn"));
  assert.ok(server.includes("connect-history-api-fallback") || server.includes("history"));
  const readme = await fs.readFile(path.join(dest, "README.md"), "utf8");
  assert.ok(readme.includes("9200"));
  assert.ok(readme.includes("BSD-2-Clause") || (await fs.readFile(path.join(dest, "LICENSE"), "utf8")).includes("BSD"));
  const arch = await fs.readFile(path.join(dest, "docs/architecture.md"), "utf8");
  assert.ok(!arch.includes("apps/portfolio/"));
});

test("scan fails closed on secrets and denied paths", () => {
  assert.equal(isDeniedPath("bin/deploy.sh"), true);
  assert.equal(isDeniedPath("api/data/100000.people.json"), true);
  assert.equal(isDeniedPath("src/js/.sys/store.js"), false);
  const hits = scanText("aws key AKIAIOSFODNN7EXAMPLE extra", "leak.txt");
  assert.ok(hits.some((item) => item.id === "aws-access-key"));
});

test("scanDest reports a planted secret", async () => {
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-scan-"));
  await fs.writeFile(path.join(dest, "oops.js"), "const token = 'ghp_abcdefghijklmnopqrstuvwx'\n");
  const findings = await scanDest(dest);
  assert.ok(findings.some((item) => item.id === "github-pat"));
});

test("vue-cli package rewrite uses modern build and drops bin scripts", () => {
  const pkg = rewritePackageJson({
    name: "old",
    scripts: {
      build: "vue-cli-service build",
      clean: "node bin/clean.js",
      serve: "vue-cli-service serve",
      lint: "eslint src",
      "test:unit": "jest",
    },
    dependencies: { mongodb: "1.0.0" },
  });
  assert.equal(pkg.scripts.build, "vue-cli-service build --modern");
  assert.equal(pkg.scripts.clean, undefined);
  assert.ok(pkg.scripts.serve.includes("9200"));
  assert.equal(pkg.dependencies.mongodb, undefined);
});

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
