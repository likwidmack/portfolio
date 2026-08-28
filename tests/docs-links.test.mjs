import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MD_LINK_RE = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

function walkMarkdown(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(full, files);
      continue;
    }
    if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

function targetExists(fromFile, href) {
  const trimmed = String(href || "").trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("#") || trimmed.startsWith("mailto:")) return true;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return true;
  const urlPath = trimmed.split("#")[0].split("?")[0];
  if (!urlPath) return true;
  const resolved = path.resolve(path.dirname(fromFile), urlPath);
  if (fs.existsSync(resolved)) return true;
  if (urlPath.endsWith(".html") && fs.existsSync(resolved.replace(/\.html$/, ".md"))) return true;
  if (fs.existsSync(`${resolved}.md`)) return true;
  return false;
}

test("first-party docs relative markdown links resolve", () => {
  const files = walkMarkdown(path.join(root, "docs"));
  const missing = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(MD_LINK_RE)) {
      const href = match[2];
      if (!targetExists(file, href)) {
        missing.push(`${path.relative(root, file)} -> ${href}`);
      }
    }
  }
  assert.equal(missing.length, 0, missing.join("\n"));
});

test("app docs hub matches primary navigation", () => {
  const hub = fs.readFileSync(path.join(root, "docs/web/README.md"), "utf8");
  const nav = fs.readFileSync(path.join(root, "core/web/app/components/AppPrimaryNav.vue"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "docs/README.md"), "utf8");
  assert.match(nav, /to="\/work"/);
  assert.match(nav, /to="\/about"/);
  assert.match(nav, /to="\/gallery"/);
  assert.match(nav, /to="\/blog"/);
  assert.match(nav, /to="\/code"/);
  assert.match(hub, /\*\*Writing\*\* → `\/blog`/);
  assert.match(hub, /\*\*Code\*\* → `\/code`/);
  assert.match(hub, /AppWorkSubNav/);
  assert.match(catalog, /system-c4\.md/);
  assert.doesNotMatch(catalog, /cicd\.md|docker\.md|infra\.md/);
});
