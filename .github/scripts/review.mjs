#!/usr/bin/env node
/**
 * Cursor SDK reviewer for a sanitizer-produced dest branch.
 * Does not copy from tamaramack/portfolio. Fail closed on PII / keep-set gaps.
 */
import { Agent, CursorAgentError } from "@cursor/sdk";

const DEST_REPO = "https://github.com/likwidmack/portfolio";
const SOURCE_REPO = "https://github.com/tamaramack/portfolio";

function promptFor(tag, destBranch) {
  return [
    "You are a reviewer, not a copier.",
    `Dest is ${DEST_REPO} on branch ${destBranch}. Source is ${SOURCE_REPO} at ${tag} for comparison only.`,
    "Do not copy, rsync, or recreate files from the source repo.",
    "Do not add sanitizer secrets, GH_TOKEN, SSH keys, or @cursor/sdk to the app package.json.",
    "Keep-set that must remain: core/web, packages/utilities, packages/media-player, packages/likwidlibs, packages/web-layer-admin, theme, dest-owned sync/ and .github/.",
    "Must be absent: root scripts/, docker/, infra/, source .github/, .husky, .agents, .codex, .opencode, AGENTS.md, .env* templates, nxCloudId, AWS account IDs, CloudFront test hostnames, GitHub PATs.",
    "If a keep-set path is missing, fail the run and comment; do not copy from source to fix it.",
    "Scan for PII, credentials, github_pat_, ghp_, AKIA, and live AWS account or CDN identifiers.",
    "If real PII or credentials appear, do not open a mergeable PR; comment with paths and fail.",
    "List sanitizer misses in the PR body. Do not copy missing keep-set files from source.",
    `PR title: sync: tamaramack/portfolio ${tag}`,
  ].join("\n");
}

function exitForStatus(status) {
  switch (status) {
    case "finished":
      return 0;
    case "error":
      return 2;
    case "cancelled":
      return 4;
    default: {
      throw new Error(`unexpected run status: ${status}`);
    }
  }
}

async function main() {
  const apiKey = process.env.CURSOR_API_KEY;
  const tag = process.env.SOURCE_TAG || "unknown";
  const destBranch = process.env.DEST_BRANCH || `sync/${tag}`;
  if (!apiKey) {
    console.log("CURSOR_API_KEY missing; skipping Cursor review");
    process.exit(0);
  }

  let agent;
  try {
    agent = Agent.create({
      apiKey,
      model: { id: "composer-2" },
      cloud: {
        repos: [
          { url: DEST_REPO, startingRef: destBranch },
          { url: SOURCE_REPO, startingRef: tag },
        ],
        autoCreatePR: true,
        skipReviewerRequest: true,
      },
    });
    const run = await agent.send(promptFor(tag, destBranch));
    console.log(`agentId=${agent.agentId} runId=${run.id}`);
    const result = await run.wait();
    console.log(`status=${result.status}`);
    process.exit(exitForStatus(result.status));
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`startup failed: ${err.message} retryable=${err.isRetryable}`);
      process.exit(err.isRetryable ? 75 : 1);
    }
    throw err;
  } finally {
    if (agent && typeof agent[Symbol.asyncDispose] === "function") {
      await agent[Symbol.asyncDispose]();
    }
  }
}

main();
