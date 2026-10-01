---
title: Media Library SDK - Plan
type: feat
date: 2026-09-22
topic: media-library-sdk
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
---

# Media Library SDK - Plan

## Goal Capsule

**Objective:** Ship a Node-safe `@tgmc/media` Nx library that catalogs image/audio/video assets, materializes image children via `@tgmc/image`, stubs A/V transforms, records audit + job status, and proves the domain with SQLite + filesystem adapters plus a thin CLI.

**Product authority:** This plan owns **Core media SDK (step 1)** only. AWS backend, admin UI, and host adapters are sequenced follow-ons — not active scope.

**Open blockers:** None.

**Stop:** Do not implement DynamoDB/S3/Lambda, admin grid/upload UI, or Nuxt/Next adapters in this step.

## Implementation status

Shipped: `@tgmc/media` catalog SDK (SQLite/FS adapters, image materialize via `@tgmc/image`, CLI).

## Product Contract

### Summary

Add a distinct monorepo package that is the media inventory and lifecycle API. Local persistence uses SQLite and the filesystem so the package is testable without AWS. Image materialize composes `@tgmc/image`; audio/video transformers exist as explicit placeholders.

### Problem Frame

`@tgmc/image` owns sharp ingest/transform but not asset inventory, children, audit, or delete cascades. Admin MinIO helpers list blobs without a catalog model. CDN sync is hashed-static delivery, not a DAM. Callers need a stable domain API before AWS and UI.

### Key Decisions

- **Sequenced delivery** — all four areas ship eventually; next starts only after current is tested, committed, complete. `(session-settled: user-directed)` Governs scope boundary.
- **Step 1 = Core SDK** — this artifact. `(session-settled: coherent-work gate + recommendation accepted)`
- **Server + thin admin client** — SDK is Node-safe; browser talks HTTP later. `(session-settled: user chose 2)`
- **Kinds** — image, audio, video in catalog; A/V transformers placeholder. `(session-settled: user chose 3)`
- **Children** — recipe + materialize. `(session-settled: user chose 1)`
- **Home** — distinct Nx project inside this monorepo. `(session-settled: user-directed)`
- **Compose `@tgmc/image`** — do not absorb. `(session-settled: user chose 1)`
- **Local adapters** — SQLite catalog/jobs/audit + filesystem blobs. `(session-settled: user chose 2 then SQLite)`
- **Hard delete + cascade**. `(session-settled: user chose 1)`
- **Audit + job status**. `(session-settled: user chose 2)`
- **Done gate** — package + tests + thin CLI/smoke. `(session-settled: user chose 2)`
- **Approach A** — MediaLibrary facade + ports. `(session-settled: user chose A)`

### How This Work Fits Together

- Core media SDK (this plan)
  - **Enables:** AWS adapters, admin UI, host adapters against one API
- AWS media backend (step 2)
  - **Depends on:** SDK ports and domain model
- Admin media UI (step 3)
  - **Depends on:** HTTP surface over SDK (step 2 or thin local routes)
- Host adapters Nuxt/Next (step 4)
  - **Depends on:** stable public API from this package

### Requirements

- R1. Provide a Node-safe media library API for ingest, get, list, metadata update, materialize child, and hard cascade delete.
- R2. Catalog kinds include `image`, `audio`, and `video`.
- R3. Children are created from a validated recipe and materialize into stored blobs; image materialize uses `@tgmc/image`.
- R4. Audio and video materialize fail with an explicit not-implemented error and record a failed job.
- R5. Mutations append audit events; materialize tracks job status (`queued` → `running` → `succeeded` | `failed`).
- R6. Default local adapters: SQLite for catalog/jobs/audit and filesystem for blobs; ports allow later DynamoDB/S3 swap.
- R7. Ship automated tests covering happy-path image materialize, A/V stub, cascade delete, and audit/jobs.
- R8. Ship a thin CLI including `smoke` that exercises ingest → materialize → assert against temp local data.
- R9. Document the package under `docs/packages/` and cross-link from `@tgmc/image` docs.

### Acceptance Examples

- AE1. Given a PNG fixture, when ingested and materialized with a resize recipe, a child blob and succeeded job exist and audit records the mutations.
- AE2. Given an audio asset, when materialize is requested, the operation fails as not-implemented and the job is `failed`.
- AE3. Given an asset with children, when deleted, parent and child blobs/rows and related jobs are gone; an audit delete event remains.

### Non-Goals

- DynamoDB, S3, Lambda, API Gateway, CloudFront invalidation
- Admin lookup grid, multi-upload UI, scripted UI runners
- Nuxt/Next adapter packages
- Soft delete, collections/folders/tags, absorbing `@tgmc/image`

### Outstanding Questions

None for step 1. Step 2 will decide DynamoDB key design, SQS vs sync Lambda, and bucket prefix layout.
