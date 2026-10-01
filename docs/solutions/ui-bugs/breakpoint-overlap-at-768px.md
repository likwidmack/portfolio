---
title: 'Two layouts at once at exactly 768px (min-width / max-width breakpoint overlap)'
date: 2026-09-24
category: ui-bugs
module: 'theme/core/scss/globals/_mixins.scss (bp-up / bp-down), every page and component sheet'
problem_type: ui_bug
component: responsive_layout
severity: medium
applies_when:
  - 'Writing or changing a media query in any SCSS layer'
  - 'A layout looks wrong at exactly one width (768px, 1080px, …) but fine one pixel either side'
  - 'Converting max-width / min-width queries to bp-up() / bp-down()'
tags: [breakpoints, media-queries, range-syntax, container-queries, responsive]
---

# Two layouts at once at exactly 768px

## Symptom

At exactly 768px (iPad portrait) some pages applied **both** their tablet and desktop rules. On `/blog` the feature card got the desktop two-column row from `min-width: 768px` and the tablet one-column card from `max-width: 768px`; which one won depended on source order. One pixel either side looked fine.

## Cause

`max-width: 768px` and `min-width: 768px` are both inclusive, so both match at 768px. The theme's px breakpoints were used both ways across the layers.

## Fix

1. **Range syntax through the theme mixins.** `bp-up(tablet)` → `@media (width >= 48em)`, `bp-down(tablet)` → `@media (width < 48em)`. At every width exactly one of them applies. Breakpoints are in `em` so they follow the reader's text size. Raw `min-width` / `max-width` queries are banned in the app, page and component layers (`core/web/tests/{app-scss-sot,pages-scss,components-scss}.spec.ts`).
2. **Watch the boundary move.** With `bp-down(tablet)`, 768px now counts as tablet-_up_. That's harmless for spacing, but it gave 768px tablets desktop splits with 150–310px columns (/work cards, /code reader, blog feature card, about timeline, parity lanes). Pick per case:
   - **The layout depends on its own box → container query.** Put `container-type: inline-size` on the box (or its list) and use `@container (width >= 48rem)`. A 768px tablet keeps its stacked layout, and the split starts where the column is readable.
   - **It's a device-class switch → an exact range pair.** `@media (width <= #{$breakpoint-tablet})` with `@media (width > …)` keeps 768px on the tablet side and still never overlaps (browse toolbar pickers, Style Studio workbench).
3. **Don't contain what sizes to its content.** Inline-size containment makes an element's content contribute 0 width. On a box in an auto grid track or a `fit-content` region, the box collapses (the Style Studio shrank to ~15px columns at 1280px). Use the range pair there instead.

## Verify

Compare computed styles of every element at 375 / **768** / 1280 before and after (the plan used a temporary Cypress snapshot spec and diff). `core/web-e2e/src/e2e/ui-audit.cy.ts` covers overflow, targets and text size at those widths.

Related: [docs/packages/theme.md § Breakpoints](../../packages/theme.md#breakpoints-hybrid), plan `docs/superpowers/plans/2026-09-24-scss-hierarchy-and-units.md`.
