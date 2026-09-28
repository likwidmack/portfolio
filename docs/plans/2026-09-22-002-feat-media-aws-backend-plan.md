---
title: Media AWS Backend - Plan
type: feat
date: 2026-09-22
topic: media-aws-backend
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
---

# Media AWS Backend - Plan

## Goal Capsule

**Objective:** Ship AWS-backed media catalog on the existing SAM stack via `@tgmc/media-aws`, Bearer-protected Nitro media APIs, SQS async materialize, and `media/` prefix on AssetsBucket.

**Product authority:** Step 2 only. Admin UI and host adapters are not active scope.

**Open blockers:** None.

**Stop:** Do not build admin grid/upload UI or Nuxt/Next adapters in this step.

## Implementation status

Shipped: `@tgmc/media-aws`, SAM Media table/queue/worker, Nitro `/api/media/*` (now owned by `@tgmc/media-nuxt`).

## Product Contract

### Summary

Extend the portfolio SAM stack with a Media DynamoDB table, SQS (+ DLQ), worker Lambda, and IAM so Nitro media routes can catalog assets using `@tgmc/media` with AWS adapters. Ingest uses presigned S3 PUT; materialize is async; delete invalidates CloudFront paths.

### Key Decisions

- **Extend current SAM stack** `(session-settled: user chose 1)`
- **Async materialize via SQS** `(session-settled: user chose 2)`
- **Bearer ADMIN_TOKEN auth** `(session-settled: user chose 1)`
- **Presigned PUT ingest** `(session-settled: user chose 1)`
- **`media/` prefix on AssetsBucket** `(session-settled: user chose 1)`
- **CloudFront invalidation on hard delete only** `(session-settled: user chose 3)`
- **Done = adapters + SAM + HTTP API + tests** (live deploy not required) `(session-settled: user chose 1)`
- **Approach B — `@tgmc/media-aws` companion** `(session-settled: user chose B)`

### How This Work Fits Together

- Core media SDK (step 1, done) — enables this step
- AWS media backend (this plan)
- Admin media UI (step 3) — depends on this HTTP API
- Host adapters (step 4) — depends on stable SDK + optional AWS factory

### Requirements

- R1. Provide `@tgmc/media-aws` implementing catalog/blob/job/audit ports on DynamoDB + S3 (`media/` prefix).
- R2. Support presigned ingest and async materialize enqueue + worker `runMaterializeJob`.
- R3. Extend SAM with Media table, SQS/DLQ, worker function, Nitro env/IAM, ADMIN_TOKEN wiring.
- R4. Expose Bearer-protected Nitro `/api/media/*` for presign, complete, list/get, materialize, job status, delete.
- R5. On cascade delete, invalidate CloudFront paths for removed `media/` keys.
- R6. Automated tests for Dynamo/S3 adapters (mocked clients) and media route auth/happy paths where practical.
- R7. Document API and env vars under `docs/packages/media-aws.md`.

### Non-Goals

- Admin UI, Cognito/IAM auth, separate media stack, Lambda body uploads, soft delete, A/V transformers, mandatory live `sam:deploy:test`
