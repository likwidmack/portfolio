# Archive: 2026-10-06 — #267 review follow-ups (focus-ring polish)

Not imported. Snapshots taken at `f03727084` (development after #265 / #267); the `.vue` snapshot keeps only its `<style>` block. Live recipe: [docs/packages/theme.md § Focus rings](../../../../../docs/packages/theme.md#focus-rings).

| File                                         | What changed                                                                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme/core/scss/tokens/_button-mixins.scss` | **Removed:** `outline-color 180ms ease` from `button-theme`'s transition. Focus sets a transparent outline (`focus-ring-shadow`), so the outline faded in from `currentcolor` and flashed a text-coloured ring on native button focus.          |
| `core/web/app/components/ui/UiButton.vue`    | `<style>` only. **Removed:** `@include focus-ring` stacked on the 3px glow (a 4px double ring, also on mouse `:focus`). **Now:** `@include focus-ring-shadow(0 0 0 3px …, var(--button-shadow-hover, …))` — the native buttons' single ring. |
