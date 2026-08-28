#!/usr/bin/env node
/**
 * Enable GitHub security settings on likwidmack/portfolio.
 * Uses LK_GH_TOKEN (admin). Never prints the token.
 */
import fs from "node:fs";
import https from "node:https";
import os from "node:os";

const OWNER = "likwidmack";
const REPO = "portfolio";
const RULESET_NAME = "Protect main";

function gitconfigToken() {
  const text = fs.readFileSync(`${os.homedir()}/.gitconfig`, "utf8");
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

function request(method, urlPath, body) {
  const auth = token();
  if (!auth) {
    console.error("No GitHub token in LK_GH_TOKEN / GH_TOKEN / gitconfig");
    process.exit(1);
  }
  const payload = body === undefined ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: urlPath,
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${auth}`,
          "User-Agent": "likwidmack-portfolio-security",
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

function ok(status, allowed) {
  return allowed.includes(status);
}

async function enable(method, urlPath, body, allowed, label, optional = false) {
  const result = await request(method, urlPath, body);
  if (!ok(result.status, allowed)) {
    if (optional) {
      console.log(`${label}: HTTP ${result.status} (skipped)`);
      return result;
    }
    if (result.status === 401 || result.status === 403) {
      console.log(
        `::warning::${label} skipped (HTTP ${result.status}). LK_GH_TOKEN needs Administration: write on likwidmack/portfolio, or unset the secret to skip this job.`,
      );
      return result;
    }
    console.error(`${label} failed: HTTP ${result.status}`);
    process.exit(1);
  }
  console.log(`${label}: HTTP ${result.status}`);
  return result;
}

async function ensureMainRuleset() {
  const listed = await request("GET", `/repos/${OWNER}/${REPO}/rulesets`);
  if (listed.status === 401 || listed.status === 403) {
    console.log(
      `::warning::list rulesets skipped (HTTP ${listed.status}). LK_GH_TOKEN needs Administration: write on likwidmack/portfolio, or unset the secret to skip this job.`,
    );
    return;
  }
  if (!ok(listed.status, [200])) {
    console.error(`list rulesets failed: HTTP ${listed.status}`);
    process.exit(1);
  }
  const rulesets = JSON.parse(listed.data);
  const existing = Array.isArray(rulesets)
    ? rulesets.find((item) => item.name === RULESET_NAME)
    : undefined;
  const body = {
    name: RULESET_NAME,
    target: "branch",
    enforcement: "active",
    conditions: {
      ref_name: {
        include: ["refs/heads/main"],
        exclude: [],
      },
    },
    rules: [{ type: "deletion" }, { type: "non_fast_forward" }],
  };
  if (existing?.id) {
    await enable(
      "PUT",
      `/repos/${OWNER}/${REPO}/rulesets/${existing.id}`,
      body,
      [200],
      "main ruleset",
    );
    return;
  }
  await enable("POST", `/repos/${OWNER}/${REPO}/rulesets`, body, [200, 201], "main ruleset");
}

async function main() {
  await enable(
    "PUT",
    `/repos/${OWNER}/${REPO}/private-vulnerability-reporting`,
    undefined,
    [204, 200],
    "private vulnerability reporting",
  );
  await enable(
    "PUT",
    `/repos/${OWNER}/${REPO}/vulnerability-alerts`,
    undefined,
    [204, 200],
    "Dependabot alerts",
  );
  await enable(
    "PUT",
    `/repos/${OWNER}/${REPO}/automated-security-fixes`,
    undefined,
    [204, 200],
    "Dependabot security updates",
  );
  await enable(
    "PATCH",
    `/repos/${OWNER}/${REPO}`,
    {
      delete_branch_on_merge: true,
      security_and_analysis: {
        secret_scanning: { status: "enabled" },
        secret_scanning_push_protection: { status: "enabled" },
        secret_scanning_non_provider_patterns: { status: "enabled" },
      },
    },
    [200],
    "secret scanning and push protection",
    true,
  );
  await ensureMainRuleset();
  console.log(`updated security settings for ${OWNER}/${REPO}`);
}

main();
