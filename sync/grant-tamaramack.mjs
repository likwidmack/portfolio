#!/usr/bin/env node
"use strict";

/**
 * Invite tamaramack as admin collaborator on likwidmack/portfolio.
 * Uses GH_TOKEN or gitconfig GitHub token. Never prints the token.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

function gitconfigToken() {
  const text = fs.readFileSync(path.join(os.homedir(), ".gitconfig"), "utf8");
  const match =
    text.match(/url "https:\/\/x-access-token:([^@]+)@github\.com\//) ||
    text.match(/url "https:\/\/[^:]+:([^@]+)@github\.com\//);
  return match ? match[1] : "";
}

function token() {
  return process.env.GH_TOKEN || process.env.GITCONFIG_GITHUB_TOKEN || gitconfigToken();
}

function request(method, urlPath, body) {
  const auth = token();
  if (!auth) {
    console.error("No GitHub token in GH_TOKEN / gitconfig");
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
  const result = await request(
    "PUT",
    "/repos/likwidmack/portfolio/collaborators/tamaramack",
    { permission: "admin" },
  );
  if (result.status === 201 || result.status === 204) {
    console.log(`tamaramack collaborator status ${result.status}`);
    return;
  }
  console.error(`collaborator invite failed: HTTP ${result.status}`);
  process.exit(1);
}

main();
