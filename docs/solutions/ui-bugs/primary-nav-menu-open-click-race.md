---
title: 'Primary nav phone menu: Personalize Done click-through'
date: 2026-09-24
category: ui-bugs
module: 'core/web/app/components/AppPrimaryNav/index.vue, core/web/app/components/AppPersonalize/index.vue'
problem_type: ui_bug
component: primary_nav_menu
severity: medium
applies_when:
  - 'Changing AppPrimaryNav or Personalize open/dismiss behavior'
  - 'Cypress app.cy personalization → Menu times out on #primary-nav-panel'
tags: [primary-nav, personalize, cypress, phone-menu, e2e]
---

# Personalize Done opens then closes the phone Menu

## Symptom

`app.cy.ts` `persists personalization…` fails: after Done, clicking Menu never finds `#primary-nav-panel`.

## Cause

Closing the Personalize modal can deliver the same click onto `.primary-nav__menu-trigger` (teleported dialog unmount). That toggles the sheet open; the test’s following Menu click toggles it closed.

## Fix

- While Personalize is open: `html[data-personalize-open]` + `pointer-events: none` on the Menu trigger (`_globals.scss`); clear the attribute on a macrotask after close.
- Done closes via `setTimeout(0)` so the dialog stays mounted through the click.
- Keep composedPath outside-click dismiss; watch `route.path` (not `fullPath`) so hash-only changes do not close the sheet.
- app.cy: `openPhoneMenu()` (375 viewport + aria-expanded retry).

## Verify

`npm run e2e:regression` — especially `app.cy.ts` personalization → Menu.
