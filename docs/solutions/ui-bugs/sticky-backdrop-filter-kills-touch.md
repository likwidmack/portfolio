---
title: 'Sticky + backdrop-filter kills touch hits (Safari / iOS)'
date: 2026-10-17
category: ui-bugs
module: 'core/web/app/layouts/site.scss, core/web/app/pages/gallery/index.scss'
problem_type: ui_bug
component: site_chrome_header
severity: high
applies_when:
  - 'Sticky or fixed chrome with backdrop-filter / -webkit-backdrop-filter'
  - 'Phone Menu, Personalize, or brand taps do nothing on real iOS Safari'
  - 'Desktop mouse and Chromium touch emulation still work'
tags: [ios, safari, touch, sticky, backdrop-filter, primary-nav, gallery]
---

# Sticky + backdrop-filter kills touch hits (Safari / iOS)

## Symptom

On a real phone or touchscreen (especially iOS Safari), header controls look fine but taps do nothing: Menu never opens, Personalize never opens, brand / On view links feel dead. Desktop mouse clicks and Chromium `hasTouch` emulation often still pass.

## Cause

WebKit drops hit-testing for **descendants** when the same element is both `position: sticky` (or `fixed`) and has `backdrop-filter` / `-webkit-backdrop-filter`. The sticky site header (`header.site-chrome`) and the gallery feed topbar both had that combination.

A second foot-gun: theme `.site-chrome` (`@mixin site-chrome` → `backdrop-blur(md)`) puts `backdrop-filter: blur(…)` on the same sticky header. Moving blur to `::before` alone is not enough — the theme class still leaves a live filter on the sticky box (seen on AWS Test as computed `blur(8px)` on the header after the first split). Clear it with `backdrop-filter: none` / `-webkit-backdrop-filter: none` on the sticky rule.

A third foot-gun: `pointer-events: none` on a parent is **not** inherited. A full-viewport `<video>` (camera background) can still sit above the page and swallow taps unless it also sets `pointer-events: none`.

## Fix

- Keep sticky on the chrome wrapper; move the blur onto a `::before` (or sibling layer) with `pointer-events: none`, and use `isolation: isolate` so the pseudo stays behind interactive children while still sampling the page underneath.
- On the sticky box itself, set `backdrop-filter: none` and `-webkit-backdrop-filter: none` so theme `.site-chrome` cannot re-apply blur.
- Do the same `::before` pattern for `.gallery-feed__topbar`.
- Set `pointer-events: none` on `.portfolio-depth-field__camera`.

## Verify

- Source guard: `core/web/tests/primary-nav.spec.ts` (sticky box `backdrop-filter: none`; blur only on `::before`).
- On a built page, DevTools computed style for `header.site-chrome` must show `backdrop-filter: none` (not `blur(8px)`); the `::before` may still show blur.
- Touch: phone viewport + real taps (or BrowserStack Live iOS Safari) on Menu → Work, Personalize, splash doors.
- Do not treat desktop-only Playwright clicks as proof the phone path works.
