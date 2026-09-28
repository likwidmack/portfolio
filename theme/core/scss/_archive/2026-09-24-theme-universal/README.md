# Archived styling: 2026-09-24 (theme universal-only, plan Task 2)

Not compiled or shipped (no `@use` points here).

| Archived                             | Replaced by                                                                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme/core/scss/_layout.scss`       | Theme keeps only `*` box sizing, `html`, `body`. The page shell (`#site_page` column, sticky header, flexing `main`, splash lock) moved to `core/web/app/layouts/site.scss` (`.app-site-layout`). The unused `body.quiet-grid` background was dropped. |
| `theme/core/scss/globals/_docs.scss` | `.page-nav` moved to `core/web/app/components/AppPageNav/AppPageNav.scss` (also loaded by `AppWorkSubNav`).                                                                                                                                            |

Also in Task 2 (edited in place, previous values in git history):

- Root font size `--font-size-default`: `16px` / `20px` → `100%` / `125%`.
- Floors: `--touch-target: max(2.75rem, 44px)`, `--type-min: max(0.75rem, 12px)`.
- Media queries: `max-width` / `min-width` px → `bp-down()` / `bp-up()` em range syntax; `--theme-breakpoint-*` / `--breakpoint` in em.
- `--portfolio-teal` / `$portfolio-teal-*` → theme-neutral `--teal-signal` / `$teal-signal-*` (the app aliases `--portfolio-teal`); `--portfolio-max` and the `.portfolio-hero` / `.home-hero` rule moved to the app layer.
- Motion distances and 3D perspective in `_animate.scss` / `_button.scss` transforms: px → em; `1440px` caps → `90rem`.
