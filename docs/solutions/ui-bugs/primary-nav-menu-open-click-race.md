---
title: 'Primary nav phone menu: open click closed the sheet'
date: 2026-09-24
category: ui-bugs
module: 'core/web/app/components/AppPrimaryNav/index.vue, core/web/app/composables/usePageNavDisclosure.ts'
problem_type: ui_bug
component: primary_nav_menu
severity: medium
applies_when:
  - 'Changing AppPrimaryNav or page-nav open/dismiss behavior'
  - 'Cypress ui-audit phone menu or page-nav disclosure times out on open state'
tags: [primary-nav, page-nav, cypress, phone-menu, e2e]
---

# Phone nav disclosures: open state lost under Cypress

## Symptom

Full regression `ui-audit.cy.ts` failed on `#primary-nav-panel` / `aria-expanded="true"` after clicking Menu or `.page-nav__toggle`, while other specs on the same head sometimes passed.

## Cause

1. **Primary Menu:** a `document` outside-click dismiss raced the opening gesture under Cypress.
2. **Page-nav disclosure:** `watch(() => route.fullPath)` closed the disclosure on hash-only URL changes; About’s in-page anchors / scroll made that race visible. `pageKeyFor` also includes `hash`, so a hash bump remounts the page and resets `open`.
3. **Personalize → Menu:** closing the Personalize modal can deliver the same click onto the phone Menu trigger (click-through). A following Cypress `Menu` click then toggles the sheet closed, so `#primary-nav-panel` is never found (`app.cy.ts` personalization test).

## Fix

- Primary Menu: no outside-click dismiss (Escape, route path change, panel links only); `@click.stop` on the trigger.
- After Personalize closes: briefly lock Menu toggles and force `menuOpen = false` so the closing gesture cannot leave the sheet open or race the next open click.
- Page-nav: `toggleOpen` with `stopPropagation`; watch `route.path` (not `fullPath`); panel links still set `open = false`.
- ui-audit: assert `data-open` on the list; run phone Menu check under the 375px context after floor visits.
- app.cy: open via `.primary-nav__menu-trigger` and assert `aria-expanded` before/after.

## Verify

`npm run e2e:regression` (same as CI Full regression) — especially `app.cy.ts` personalization → Menu, `ui-audit.cy.ts` phone Menu + `/about` and `/work/media-systems` page-nav disclosures.
