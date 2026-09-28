# App SCSS (`core/web/assets/css`)

App-owned styles sit beside the Nuxt CSS entries. Theme tokens remain in `@tgmc/theme` — see [packages/theme.md](../../packages/theme.md).

## Partials

| File                    | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_variables.scss`       | App `:root` / `html[data-theme]` for the `--portfolio-*` atmosphere tokens that are actually used, the IBM Plex font-family overrides, and `--type-*` chrome metrics. Never redeclares theme layout / space / radius / shadow / ratio / role tokens. Colour values come from theme CSS vars / Sass tokens / mixes — not a second hex palette                                                                                                                      |
| `_mixins.scss`          | Mixin-only recipes (`portfolio-box-contain`, `portfolio-soft-surface($mix?)`, `portfolio-type-*` / `portfolio-eyebrow`, `portfolio-stack($gap?)`) — no selectors                                                                                                                                                                                                                                                                                                  |
| `_globals.scss`         | Selectors used on **more than one page**: `.page-content` element fit, headings via type recipes, links, eyebrows, tags, `.portfolio-hero`, phone `.button-row`, anchor scroll padding, PrimeVue dialog glass (teleported, so it cannot be scoped), motion preferences. Breakpoints via `bp-down()` / `bp-up()` only. Page-only rules live in the page sheet; component-only rules in the component sheet. Emitted **once** via launch — do not `@use` from pages |
| `styles.scss`           | Thin theme entry (`@use 'theme/scss'` — document shell lives in `theme/core/scss/_layout.scss`)                                                                                                                                                                                                                                                                                                                                                                   |
| `portfolio-launch.scss` | Entry only: `@use` variables + globals, and the IBM Plex `@font-face`s. No selectors (guarded by `tests/app-scss-sot.spec.ts`)                                                                                                                                                                                                                                                                                                                                    |

## Load order

1. `styles.scss` → theme
2. `portfolio-launch.scss` → `@use './variables'` (emits CSS) → `@use './globals'` (emits tag/selector CSS; it `@use`s `mixins`) → `@font-face`s
3. Standalone page/component `.scss` → `@use 'mixins' as *` (resolved via Vite Sass `loadPaths` → `assets/css`) — **never** `@use` `_globals.scss` from pages (avoids duplicated selectors)
4. Vue `<style lang="scss">` — Vite `additionalData` prepends theme `nuxt-auto` **and** app `_mixins.scss` (absolute paths; Vue-only, same exclusion gate). Prefer `var(--portfolio-*)` / theme vars for tokens; **do not** inject `_globals.scss`

`nuxt-auto` forwards theme variables, colors, **`theme-*` color helpers** (`tokens/_color-fns.scss`), and button mixins. Standalone sheets that need helpers `@use 'theme/scss/nuxt-auto' as *` or `@use 'theme/scss/tokens' as *` (via Sass `loadPaths`).

Nuxt/Vite wiring lives in `core/web/config-properties/scss-additional-data.ts` (prepend + `loadPaths` for theme / PrimeVue / Foundation / app CSS), `scss-auto-use.ts` (Vue-only gate), `primevue-prop.ts` (Nora preset → `--accent-color`), and `vite-prop.ts`. Theme entry flags: `assets/css/styles.scss` (`$theme-enable-foundation: true`, `$theme-enable-primevue: false` while Nora styled mode is on). Contract tests: `core/web/tests/app-scss-sot.spec.ts`, `core/web/tests/vite-prop-scss-inject.spec.ts`, and theme `scss-color-fns.spec.ts` (nuxt-auto forward).

## Naming

- App props: `--portfolio-*` only
- Do not shadow theme names (except the documented coral → accent bridge)
- `--portfolio-coral` aliases `--accent-color` (FOUC / personalization; accent is complementary of primary)
- `--portfolio-teal` is emitted by theme `_root.scss` (success twin) — do not redeclare hex in web
- Ivory / ink flip with `data-theme`: bridge to `--main-background` / `--text-color` / Sass `$main-background-*` (not `$ink-*` greys)

## Type recipes

Theme emits `--font-family-display|title|header` (Sass `$header-font-family` may be empty). The app binds those roles in `_variables.scss` to the IBM Plex Sans stack so recipes never resolve to an empty family. `--font-family-header` aliases title.

Chrome metrics live on `:root` as `--type-eyebrow-*` and `--type-meta-*`. Mixins apply the ladder:

| Role               | Mixin                                                | Family                  |
| ------------------ | ---------------------------------------------------- | ----------------------- |
| Primary page title | `portfolio-type-display`                             | `--font-family-display` |
| Section title      | `portfolio-type-title`                               | `--font-family-title`   |
| Eyebrow / kicker   | `portfolio-type-eyebrow` (alias `portfolio-eyebrow`) | mono + wide tracking    |
| Meta / label / tag | `portfolio-type-meta`                                | mono + tighter tracking |

`.portfolio-page h1` / `h2` and shared eyebrow/tag selectors consume these from `_globals.scss`. Pages and components `@include` the same mixins instead of inventing one-off `font-family` rules. See CONCEPTS: Type recipe / Chrome type tier. Contract: `core/web/tests/type-recipes.spec.ts`.

## Color SoT hygiene

1. **Measure before delete.** Run `node scripts/measure-app-scss.mjs` — it emits `scss_lines` and `duplicate_color_sot` (starter twin map + exact hex / JS const overlaps). Coral is an accent bridge, not a static theme-primary hex twin.
2. **Delete only proven twins.** Rebind call sites to theme CSS vars or Sass tokens; do not invent coral as a static hex twin.
3. **Theme-derived chrome.** Keep `--portfolio-haze-*` / particles / rose / `grid-glow` names; derive values with `theme-*` helpers / `color.mix` from theme brand/oxblood/surface tokens — no raw `#…` SoT in `_variables.scss` for those names.
4. **JS recipe parity.** Atmosphere chrome recipes are mirrored in `shared/portfolio-chrome.ts` (`getPortfolioChrome`) from the same theme named tokens. Pin tests compile `assets/css/export/portfolio-chrome-dump.scss` (Sass wins). UI keeps `var(--portfolio-*)`.
5. **CSS-only (no JS mirror):** coral → accent bridge; `--portfolio-rule` / `--portfolio-grid-line` and soft/semantic alias blocks that are pure `var()` / runtime `color-mix`; particle shadow multi-values.
6. **Personalization.** FOUC + `buildBrandTokens` + paper constants use `@tgmc/theme` `Color` / `themeColors` (ivory/ink via `portfolio-chrome`) — see [personalization.md](./personalization.md).

Contract tests: `core/web/tests/app-scss-sot.spec.ts`, `core/web/tests/portfolio-chrome.spec.ts`. Measure harness: `scripts/measure-app-scss.mjs`.

### Atmosphere recipe table (Sass ↔ JS)

| Token                    | Light (`:root`)                                                  | Dark                                      |
| ------------------------ | ---------------------------------------------------------------- | ----------------------------------------- |
| rose                     | `theme-lighten($oxblood-dark, 10%)`                              | `theme-lighten($oxblood-dark, 28%)`       |
| rose-strong              | `$primary-color-dark`                                            | `theme-lighten($oxblood-dark, 42%)`       |
| haze-1…4                 | `color.mix($main-background-light, $oxblood-dark, 72/78/84/90%)` | mixes + `theme-darken($oxblood-light, …)` |
| particle-strong/mid/soft | primary / mix / mix                                              | lighten recipes / `$text-color-dark`      |
| grid-glow                | mix 88%                                                          | `theme-darken($oxblood-dark, 8%)`         |

## When to add a mixin vs a global selector

- **Mixin** (`_mixins.scss`): same recipe in ≥2 sheets, or thinning launch chrome that pages also need via `@include`.
- **Selector** (`_globals.scss`): shared HTML tags / classes that should load once on every page (headings, default links, `.page-content` containment, eyebrows, tags).
- Prefer a mixin when Vue scoped styles need the recipe without emitting another global rule.

## Layers, units and breakpoints

`assets/css` is layer 2 of five (theme → app global → layout → page → component). Pages and components are scoped; `site.scss` is the only layout sheet. Units are relative (`rem` / `em` / `%` / `dvh` / container units) — px only for hairlines, focus rings, shadows, blur, the `--touch-target` / `--type-min` floors and `/* units: scene */` sheets. Breakpoints come from `bp-up()` / `bp-down()` (em, range syntax) or container queries; never raw `min-width` / `max-width`. Policy and guards: [theme.md § Style layers and units](../../packages/theme.md#style-layers-and-units); the 768px pitfall: [solutions/ui-bugs/breakpoint-overlap-at-768px.md](../../solutions/ui-bugs/breakpoint-overlap-at-768px.md).
