#!/usr/bin/env node
import { Agent, CursorAgentError } from "@cursor/sdk";

const DEST_BRANCH = process.env.DEST_BRANCH || "";
const SOURCE_TAG = process.env.SOURCE_TAG || "";

const PROMPT = `You are reviewing a public snapshot of tamaramack/tamaramack.github.io on branch ${DEST_BRANCH} (source ${SOURCE_TAG}).

You are a reviewer, not a copier. Do not copy files from the upstream clone. Do not add bin/, exports/, env templates, or sanitizer secrets. Do not delete src/js/.sys, src/css/.sys, or api/.api when those trees exist.

Scan Resume files, names.json, assets, and credential-shaped strings. If the keep-set from sync/allowlist.txt is missing for this tag, fail the review. Do not copy from source to repair it.

Comment on the PR with a short pass/fail and any findings.`;

function exitForError(error) {
  if (error instanceof CursorAgentError) {
    process.exit(error.isRetryable ? 75 : 1);
  }
  console.error(error);
  process.exit(2);
}

function assertNever(value, message) {
  throw new Error(`${message}: ${String(value)}`);
}

async function main() {
  if (!process.env.CURSOR_API_KEY) {
    console.log("CURSOR_API_KEY missing; skip review");
    process.exit(0);
  }
  if (!DEST_BRANCH) {
    console.error("DEST_BRANCH is required");
    process.exit(2);
  }

  try {
    await using agent = await Agent.create({
      apiKey: process.env.CURSOR_API_KEY,
      model: { id: "composer-2" },
      cloud: {
        repos: [
          {
            url: "https://github.com/likwidmack/portfolio",
            startingRef: DEST_BRANCH,
          },
        ],
        autoCreatePR: true,
        skipReviewerRequest: true,
      },
    });
    const run = await agent.send(PROMPT);
    const result = await run.wait();
    switch (result.status) {
      case "finished":
        process.exit(0);
        break;
      case "error":
        process.exit(2);
        break;
      case "cancelled":
        process.exit(2);
        break;
      default: {
        const status = result.status;
        assertNever(status, "Unhandled run status");
      }
    }
  } catch (error) {
    exitForError(error);
  }
}

main();
