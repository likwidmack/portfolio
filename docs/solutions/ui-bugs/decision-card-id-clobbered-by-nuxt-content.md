---
title: 'Process hash links miss decision cards (Nuxt Content clobbers `id`)'
date: 2026-10-16
category: ui-bugs
module: 'core/web/content/decision-cards, core/web/app/pages/process, Nuxt Content'
problem_type: ui_bug
component: process_routing
severity: high
applies_when:
  - 'Adding or editing Nuxt Content data-collection documents that need a stable public fragment id'
  - 'Debugging `/process#…` or splash Process door first-beat scroll'
tags: [process, routing, nuxt-content, decision-cards, hash, fragment]
---

# `/process#agentic-ui-exploration` does not scroll to the card

## Symptom

Opening `/process#agentic-ui-exploration` (splash Process door, remembered journey, or a shared link) leaves the page at the top. The agentic card is present lower on the page; the fragment never matches a DOM `id`.

On the live test API this showed as a “broken” Process deep link even though the route returned 200.

## Cause

Nuxt Content reserves document `id` for the content path (e.g. `decisionCards/decision-cards/agentic-ui.json`). A JSON field also named `id` is overwritten and never reaches the page. Binding `:id="card.id"` therefore stamps the path into the DOM, not `agentic-ui-exploration`.

## Fix

- Store the public fragment key as `slug` on each decision card (same idea as case studies).
- Bind `:id="card.slug"` / `:key="card.slug"` and sort by `slug` after date.
- Keep hash values (`PROCESS_FIRST_BEAT`, `PROCESS_CARD_IDS`) unchanged — only the content field name changed.

## Verify

1. Rebuild and open `http://127.0.0.1:4200/process#agentic-ui-exploration` — the agentic card is focused/scrolled into view; HTML has `id="agentic-ui-exploration"`.
2. `GET /api/content/decisionCards` includes `"slug":"agentic-ui-exploration"` (and the Content document `id` remains the path).
3. `cd core/web && npx vitest run tests/process-page.spec.ts tests/journey-preference.spec.ts tests/portfolio-content.spec.ts`
