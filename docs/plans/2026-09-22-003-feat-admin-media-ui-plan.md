---
title: Admin Media UI - Plan
type: feat
date: 2026-09-22
topic: admin-media-ui
artifact_contract: ce-unified-plan/v1
artifact_readiness: ready
product_contract_source: ce-brainstorm
execution: code
---

# Admin Media UI - Plan

## Goal Capsule

**Objective:** Ship `/admin/media` in `@tgmc/admin` with asset grid, multi-upload, delete, and scripted image materialize (job polling) via admin Nitro proxy to local `@tgmc/media` (optional remote `/api/media/*`).

**Product authority:** Step 3 only. Host adapters are not active scope. MinIO CDN page stays unchanged.

**Open blockers:** None.

**Stop:** Do not build Nuxt/Next host adapter packages or replace CDN tools in this step.

## Implementation status

Shipped in `@tgmc/admin`: `/admin/media`, `/api/admin/media/*`, Vitest (`tests/media-service.spec.ts`), docs.

## Product Contract

### Summary

Add a DAM admin surface beside blog/messages/cdn. Browser calls `/api/admin/media/*` with the existing Bearer token; the admin server uses a local MediaLibrary by default and can forward to the portfolio media API when configured.

### Key Decisions

- **New `/admin/media` in `@tgmc/admin`** `(session-settled: user chose 1)`
- **Server-side proxy** `(session-settled: user chose 1)`
- **Core ops + scripted image recipes** `(session-settled: user chose 2)`
- **Done = page + proxy + Vitest** `(session-settled: user chose 2)`
- **Approach A — thin page + local library proxy** `(session-settled: user chose A)`

### Requirements

- R1. `/admin/media` lists assets, multi-upload, detail (children/jobs). Delete: row Confirm/Cancel → optimistic hide → 8s Undo (no API until commit) → cascade delete; failure or Undo restores row/detail.
- R2. Image materialize via built-in thumb recipe and custom recipe JSON; poll job status.
- R3. `/api/admin/media/*` requires Bearer admin token; uses local `@tgmc/media` unless `MEDIA_API_URL` is set (then forward).
- R4. Nav link to Media; CDN MinIO page unchanged.
- R5. Vitest covers proxy auth failure and local list/upload/materialize happy path.
- R6. Document the page and env vars.

### Non-Goals

- Full studio, Cypress e2e, replacing MinIO CDN, step 4 host adapters, A/V transform UX beyond upload/list
