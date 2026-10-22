---
title: 'Dialog mask lingers and blocks taps after close (iOS Safari)'
date: 2026-10-17
category: ui-bugs
module: 'core/web/assets/css/_globals.scss'
problem_type: ui_bug
component: personalize_dialog
severity: high
applies_when:
  - 'A PrimeVue Dialog closes but its dark mask stays on screen for seconds on iOS Safari'
  - 'The page under the mask ignores taps until the mask finally disappears or the page reloads'
  - 'Chromium (desktop or touch emulation) closes the same dialog instantly'
tags: [ios, safari, touch, primevue, dialog, mask, backdrop-filter, personalize]
---

# Dialog mask lingers and blocks taps after close (iOS Safari)

## Symptom

On a real iPhone (Safari, private tab on AWS Test), Personalize → **Done** closes the panel, but the dark backdrop stays and the page is blocked. After a few seconds it clears on its own; a reload also clears it. Menu, brand and splash-door taps work. Chromium phone emulation closes the dialog and removes the mask at once (`.p-dialog-mask` count 0 after Done, X or Esc).

## Cause

PrimeVue 4 `Dialog` renders the mask as the parent of a `<Transition name="p-dialog">`. On close it adds `p-overlay-mask-leave-active` to the mask, runs the dialog's leave transition, and only in `onAfterLeave` sets `containerVisible = false`, which removes the mask. Until then the mask keeps its inline `pointer-events: auto`.

Two app styles made that window long and visible on iOS Safari:

- `.p-dialog` had `backdrop-filter: blur(20px)` over a full-screen mask, with the animated depth-field canvas underneath. Safari has to recomposite that blur on every frame of the leave transition, and the transition's end event arrives seconds late.
- `.p-dialog-mask` sets its background with `!important` (theme mask token fix), which also overrides PrimeVue's mask fade-out animation, so the mask stays fully dark until it is removed.

## Fix

In `core/web/assets/css/_globals.scss`:

- Remove `backdrop-filter` from `.p-dialog`. The mask behind the dialog is opaque, so the blur had no visible effect.
- `.p-dialog-mask.p-overlay-mask-leave-active { background: transparent !important; pointer-events: none !important; }`: the mask disappears and stops catching taps the moment the close starts, however long the transition takes.
- `.p-dialog.p-dialog-leave-active { pointer-events: none !important; }`: the fading panel cannot catch taps either.

`!important` is required because PrimeVue sets `pointer-events` inline on both elements.

## Verify

- Source guard: `core/web/tests/dialog-mask.spec.ts`.
- Real iPhone Safari (private tab, so no cached build): Personalize → Done, X, and a tap outside the panel; the page must be usable straight away. Repeat for the Work page's evidence-examples dialog, which uses the same `UiDialog`.
- Chromium passing is not proof; see also `sticky-backdrop-filter-kills-touch.md` for the related sticky-header case.
