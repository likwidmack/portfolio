#!/usr/bin/env node
/**
 * Set likwidmack/portfolio About, homepage, and topics.
 * Uses LK_GH_TOKEN. Never prints the token.
 */
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "likwidmack";
const REPO = "portfolio";
const DESCRIPTION =
  "Nx + Nuxt 4 SSR portfolio with SQLite, Docker/Postgres, and AWS SAM (Lambda, DynamoDB, CloudFront).";
const HOMEPAGE = "https://likwidmack.com";

function gitconfigToken() {
  const text = fs.readFileSync(path.join(os.homedir(), ".gitconfig"), "utf8");
  const match =
    text.match(/url "https:\/\/x-access-token:([^@]+)@github\.com\//) ||
    text.match(/url "https:\/\/[^:]+:([^@]+)@github\.com\//);
  return match ? match[1] : "";
}

function token() {
  return (
    process.env.LK_GH_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITCONFIG_GITHUB_TOKEN ||
    gitconfigToken()
  );
}

function topicsFromPackage() {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) {
    throw new Error("package.json keywords missing");
  }
  return pkg.keywords.map((item) => String(item));
}

function request(method, urlPath, body) {
  const auth = token();
  if (!auth) {
    console.error("No GitHub token in LK_GH_TOKEN / GH_TOKEN / gitconfig");
    process.exit(1);
  }
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: urlPath,
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${auth}`,
          "User-Agent": "likwidmack-portfolio-sync",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(payload
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, data });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const topics = topicsFromPackage();
  const meta = await request("PATCH", `/repos/${OWNER}/${REPO}`, {
    description: DESCRIPTION,
    homepage: HOMEPAGE,
  });
  if (meta.status !== 200) {
    console.error(`repo profile update failed: HTTP ${meta.status}`);
    process.exit(1);
  }

  const topicRes = await request("PUT", `/repos/${OWNER}/${REPO}/topics`, { names: topics });
  if (topicRes.status !== 200) {
    console.error(`repo topics update failed: HTTP ${topicRes.status}`);
    process.exit(1);
  }

  console.log(`updated ${OWNER}/${REPO}`);
  console.log(`description: ${DESCRIPTION}`);
  console.log(`homepage: ${HOMEPAGE}`);
  console.log(`topics: ${topics.join(", ")}`);
}

main();
