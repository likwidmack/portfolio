# App SCSS (`core/web/assets/css`)

App-owned styles sit beside the Nuxt CSS entries. Theme tokens remain in `@tgmc/theme` — see [packages/theme.md](../../packages/theme.md).

## Partials

| File                    | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_variables.scss`       | App `:root` / `html[data-theme]` for the `--portfolio-*` tokens, the IBM Plex font-family overrides, and `--type-*` chrome metrics. Never redeclares theme layout / space / radius / shadow / ratio / role tokens. Colour variables are `--portfolio-*-color` blends of the theme's active colours (`color-mix()` of `--theme-*-color`) — no hex, no Sass colour values, no old-name aliases                                                                      |
| `_mixins.scss`          | Mixin-only recipes (`portfolio-box-contain`, `portfolio-soft-surface($mix?)`, `portfolio-type-*` / `portfolio-eyebrow`, `portfolio-stack($gap?)`) — no selectors                                                                                                                                                                                                                                                                                                  |
| `_globals.scss`         | Selectors used on **more than one page**: `.page-content` element fit, headings via type recipes, links, eyebrows, tags, `.portfolio-hero`, phone `.button-row`, anchor scroll padding, PrimeVue dialog glass (teleported, so it cannot be scoped), motion preferences. Breakpoints via `bp-down()` / `bp-up()` only. Page-only rules live in the page sheet; component-only rules in the component sheet. Emitted **once** via launch — do not `@use` from pages |
| `styles.scss`           | Thin theme entry (`@use 'theme/scss'` — document shell lives in `theme/core/scss/_layout.scss`)                                                                                                                                                                                                                                                                                                                                                                   |
| `portfolio-launch.scss` | Entry only: `@use` variables + globals, and the IBM Plex `@font-face`s. No selectors (guarded by `tests/app-scss-sot.spec.ts`)                                                                                                                                                                                                                                                                                                                                    |

## Load order

1. `styles.scss` → theme
2. `portfolio-launch.scss` → `@use './variables'` (emits CSS) → `@use './globals'` (emits tag/selector CSS; it `@use`s `mixins`) → `@font-face`s
3. Standalone page/component `.scss` → `@use 'mixins' as *` (resolved via Vite Sass `loadPaths` → `assets/css`) — **never** `@use` `_globals.scss` from pages (avoids duplicated selectors)
4. Vue `<style lang="scss">` — Vite `additionalData` prepends theme `nuxt-auto` **and** app `_mixins.scss` (absolute paths; Vue-only, same exclusion gate). Use `var(--portfolio-*-color)` / `var(--theme-*-color)` for colours (see [Colour rules for pages and components](#colour-rules-for-pages-and-components)); **do not** inject `_globals.scss`

`nuxt-auto` forwards theme variables, colors, **`theme-*` color helpers** (`tokens/_color-fns.scss`), and button mixins. Standalone sheets that need helpers `@use 'theme/scss/nuxt-auto' as *` or `@use 'theme/scss/tokens' as *` (via Sass `loadPaths`).

Nuxt/Vite wiring lives in `core/web/config-properties/scss-additional-data.ts` (prepend, `loadPaths` for theme / app CSS, and `scssImporters` — the `sass-embedded` Node package importer that resolves the theme's `pkg:foundation-sites/...` imports), `scss-auto-use.ts` (Vue-only gate), `primevue-prop.ts` (Nora preset → `--theme-accent-color`), and `vite-prop.ts`. Theme entry flags: `assets/css/styles.scss` (`$theme-enable-foundation: true`, `$theme-foundation-mode: 'layout'`; PrimeVue is Nora styled mode with no Sass layer — see [theme.md § Third-party layers](../../packages/theme.md#third-party-layers)). Contract tests: `core/web/tests/app-scss-sot.spec.ts`, `core/web/tests/vite-prop-scss-inject.spec.ts`, `core/web/tests/scss-pkg-importer.spec.ts`, and theme `scss-color-fns.spec.ts` (nuxt-auto forward) and `foundation-css-equivalence.spec.ts`.

## Naming

- App props: `--portfolio-*` only. **Colour** variables are `--portfolio-<stem>-color` (colour system, spec rule 4); non-colour ones keep their names (`--portfolio-space`, `--portfolio-stack-gap*`, `--portfolio-surface-mix`, `--portfolio-background-{image,repeat,size,position,attachment,blend-mode}`, `--portfolio-particle-shadow-strong`)
- A colour variable holds only `var(--theme-…-color)` / `var(--portfolio-…-color)`, `color-mix()` of them and `transparent` — no hex, `rgb()`, `hsl()` or Sass `$` (rule 6). Guard: `core/web/tests/colors-scss.spec.ts`
- The old names (`--portfolio-rose`, `--portfolio-primary`, `--portfolio-depth-custom` …) are gone: they were aliases until colour system Task 8 removed them (archived in `theme/core/scss/_archive/2026-09-29-color-aliases/`). The map `core/web/shared/portfolio-color-names.ts` stays for the codemod, the guard (an old name is refused) and the stored Background → Custom key migration
- Do not shadow theme names (except the documented coral → accent bridge)
- `--portfolio-coral-color` is `var(--theme-accent-color)`; `--portfolio-teal-color` is the theme's success colour (dark: blended with paper to keep today's depth) — do not redeclare hex in web
- `--portfolio-rose-color` is `var(--theme-link-color)` (the theme's builder-computed link ink) and `--portfolio-rose-strong-color` an OKLab mix of it toward `--theme-text-color` (85 % light / 50 % dark) — colour-system rule 3, 2026-10-05
- `--portfolio-teal-fill-color` / `--portfolio-on-teal-color` pair a teal fill with its text (/about résumé button): light `--theme-success-color` / `--theme-paper-color`, dark `--theme-success-background-color` / `--theme-ink-color` — each ≥ 4.5:1 by construction, for any paper / ink
- `--portfolio-ivory-color` / `--portfolio-ink-color` are the active paper / ink (dark ink: ink with 3% paper, today's text colour)
- Preset / custom background roles (`--portfolio-{primary,secondary,accent}-color`, `--portfolio-background-{primary,secondary,accent}-color` and their `-{light,dark}-color` per-mode names, `--portfolio-depth-custom-color`) are written at runtime by Preferences (`shared/preferences/paint.ts`, through `usePersonalization`); untouched they fall back to the theme colours

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
3. **Blended chrome.** The atmosphere (`--portfolio-rose-color`, `-haze-*`, `-particle-*`, `-grid-*`, `-rule`, `-teal`, `-coral`, `-ink`, `-ivory`) is `color-mix(in srgb, …)` (rose-strong: `in oklab`) of the theme's **active** paper / ink / primary / accent / success and the link / text / success-background roles, so it follows mode switches and Style Studio edits live. No hex, no Sass colour values.
4. **JS recipe parity.** `shared/portfolio-chrome.ts` holds the recipe table (`PORTFOLIO_CHROME_BLENDS`), renders it to CSS (`portfolioBlendCss`) and resolves it (`getPortfolioChrome(mode, inputs?)`). `portfolio-chrome.spec.ts` checks that `_variables.scss` declares exactly `portfolioBlendCss(recipe)` for each colour and mode, and that the JS values match the Sass dump `assets/css/export/portfolio-chrome-dump.scss` (the same blends with Sass `color.mix` from the theme's default colours). UI keeps `var(--portfolio-*-color)`.
5. **CSS-only (no JS mirror):** the translucent `--portfolio-rule-color` (ink 21%) and `--portfolio-grid-line-color` (rose-strong 26% light / rose 50% dark), and the dark `--portfolio-particle-shadow-strong` (`0 0 10px` rose 70%).
6. **Personalization.** FOUC + `buildBrandTokens` + paper constants use `@tgmc/theme` `Color` / `themeColors` (ivory/ink via `portfolio-chrome`) — see [personalization.md](./personalization.md).

Contract tests: `core/web/tests/app-scss-sot.spec.ts`, `core/web/tests/portfolio-chrome.spec.ts`. Measure harness: `scripts/measure-app-scss.mjs`.

### Atmosphere blend table

`mix(a p, b)` = `color-mix(in srgb, var(--theme-a-color) p%, var(--theme-b-color))`, with the mode's active colours (light: paper `#faf6f3`, ink `#0f0908`, primary `#d9531d`, accent `#1b95c7`, success `#146060`; dark: paper `#0f0908`, ink `#faf6f3`, primary `#be1c26`, accent `#19aca3`, success `#1f8b8b`). **Before** is the pre-blend Sass value (oxblood / brand mixes), **after** the blend with the default theme. ΔE is the OKLab distance ×100 computed from the **displayed** hex values (≈ 2 is a just-noticeable difference; translucent values composited over the mode's paper at the displayed alpha). Tuned so the default atmosphere stays close to the old look, except the light rose family, which is tuned for contrast (below); the recipes live in `shared/portfolio-chrome.ts`.

| `--portfolio-…-color` | Light blend (`:root`)                                           | Light before → after          | ΔE   | Dark blend (`html[data-theme='dark']`)                          | Dark before → after           | ΔE   |
| --------------------- | --------------------------------------------------------------- | ----------------------------- | ---- | --------------------------------------------------------------- | ----------------------------- | ---- |
| `rose`                | `link` (2026-10-05; was `mix(primary 70%, ink)` `#9c3d17`)      | `#c63549` → `#883412`         | 14.1 | `link` (was `mix(primary 56%, ink)` `#d87c80`)                  | `#dc7b88` → `#e96a72`         | 4.2  |
| `rose-strong`         | `oklab(link 85%, text)` (was `mix(primary 60%, ink)` `#883515`) | `#ac1922` → `#762f15`         | 11.2 | `oklab(link 50%, text)` (was `mix(primary 30%, ink)` `#e8b5b5`) | `#ebb3bb` → `#f3afae`         | 2.0  |
| `haze-1`              | `mix(accent 10%, mix(primary 30%, paper))`                      | `#e0bdbf` → `#dbc0b5`         | 1.98 | `mix(primary 49%, paper)`                                       | `#621c25` → `#651217`         | 2.08 |
| `haze-2`              | `mix(accent 8%, mix(primary 23%, paper))`                       | `#e6c9ca` → `#e1ccc2`         | 1.73 | `mix(primary 10%, paper)`                                       | `#21090d` → `#210b0b`         | 0.83 |
| `haze-3`              | `mix(accent 6%, mix(primary 16%, paper))`                       | `#ebd5d5` → `#e8d8d0`         | 1.27 | `mix(primary 12%, paper)`                                       | `#25070e` → `#240b0c`         | 1.34 |
| `haze-4`              | `mix(accent 4%, mix(primary 10%, paper))`                       | `#f1e2e1` → `#eee2dd`         | 0.72 | `paper`                                                         | `#0b0204` → `#0f0908`         | 4.07 |
| `particle-strong`     | `mix(primary 71%, ink)`                                         | `#ac1922` → `#9e3e17`         | 6.02 | `mix(primary 53%, ink)`                                         | `#ec7c83` → `#da8286`         | 3.18 |
| `particle-mid`        | `mix(accent 31%, primary)`                                      | `#a46169` → `#9e6752`         | 4.27 | `mix(primary 56%, ink)`                                         | `#dc7b88` → `#d87c80`         | 1.42 |
| `particle-soft`       | `mix(accent 6%, mix(primary 19%, paper))`                       | `#e9d1d2` → `#e7d3ca`         | 1.41 | `mix(ink 97%, paper)`                                           | `#f3efec` → `#f3efec`         | 0    |
| `grid-glow`           | `mix(accent 4%, mix(primary 12%, paper))`                       | `#efdedd` → `#eddfd9`         | 0.74 | `mix(primary 65%, paper)`                                       | `#7e212e` → `#81151c`         | 2.34 |
| `grid-line`           | rose-strong 26% over transparent                                | `#ac1922`/26% → `#883515`/26% | 2.43 | rose 50% over transparent                                       | `#dc7b88`/50% → `#d87c80`/50% | 0.79 |
| `rule`                | ink 21% over transparent                                        | `#181211`/22% → `#0f0908`/21% | 0.12 | ink 21% over transparent                                        | `#f3efec`/22% → `#faf6f3`/21% | 0.32 |
| `teal`                | `success`                                                       | `#146060` → `#146060`         | 0    | `mix(success 87%, paper)`                                       | `#1b7a7a` → `#1d7a7a`         | 0.09 |
| `coral`               | `accent`                                                        | `#1b95c7` → `#1b95c7`         | 0    | `accent`                                                        | `#19aca3` → `#19aca3`         | 0    |
| `ink`                 | `ink`                                                           | `#0f0908` → `#0f0908`         | 0    | `mix(ink 97%, paper)`                                           | `#f3efec` → `#f3efec`         | 0    |
| `ivory`               | `paper`                                                         | `#faf6f3` → `#faf6f3`         | 0    | `paper`                                                         | `#0f0908` → `#0f0908`         | 0    |

Where the ΔE budget (≤ ~3) is not met:

- **Rose / rose-strong follow the link ink (rule 3, 2026-10-05).** `rose` is `--theme-link-color` — `buildLinkTokens` moves the primary's lightness until it reads ≥ 4.5:1 on page, surfaces, variant and its own 12 % / 16 % washes, for any pick and paper / ink (the old blends were never checked: random picks reached 3.75:1, 3.08:1 on the nav wash) — and `rose-strong` mixes it toward the text colour in OKLab, which keeps it ≥ 4.5:1. The ΔE above is the owner-approved change (light crimson-orange → deeper brick, dark coral-pink → rose-red).
- **Light rose / rose-strong (by design, before rule 3).** The old values are crimson (oxblood family); since colour-system Task 3 the light primary is orange (`#d9531d`), and the owner accepted that the rose family follows the primary. The light recipes are darker than the closest blend (the closest, `mix(primary 87%, ink)`, only reached 4.12:1 on the surface) so rose text passes WCAG AA everywhere it is painted — see the contrast table below.
- **Light particle-strong / particle-mid.** The crimson originals cannot be reached from paper / ink / primary / accent / success (every blend stays on the orange side); these are the closest blends.
- **Dark haze-4.** The old value (`#0b0204`) is darker than dark paper, and every blend is at least as light as paper; `paper` is the closest.

#### Rose text contrast (WCAG, default theme)

`rose` is link / hover text (`_globals.scss`, AppPrimaryNav on a 12% rose tint, gallery tabs on a 4% text wash, UiButton outlined hover); `rose-strong` is link hover and the active work filter text (on a 16% rose tint, `pages/work`). Tints are composited over paper and over the surface (the header's 92% surface glass is ≈ surface). Guarded by `portfolio-chrome.spec.ts` (≥ 4.5:1 on every row, both modes) and, for all 21 presets and 300 random paper / ink pairs, `theme/core/tests/derived-roles-contrast.spec.ts`.

| Background                       | Light `rose` `#883412` | Light `rose-strong` `#762f15` | Dark `rose` `#e96a72` | Dark `rose-strong` `#f3afae` |
| -------------------------------- | ---------------------- | ----------------------------- | --------------------- | ---------------------------- |
| paper                            | 7.67                   | 8.93                          | 6.37                  | 10.87                        |
| surface                          | 6.77                   | 7.88                          | 5.97                  | 10.19                        |
| surface variant                  | 5.95                   | 6.93                          | 5.71                  | 9.75                         |
| soft surface 88%                 | 6.89                   | 8.03                          | 6.02                  | 10.28                        |
| text 4% wash on paper / surface  | 7.08 / 6.24            | —                             | 5.97 / 5.48           | —                            |
| rose 12% tint on paper / surface | 6.33 / 5.60            | —                             | 5.58 / 5.11           | —                            |
| rose 16% tint on paper / surface | —                      | 6.88 / 6.11                   | —                     | 8.97 / 8.24                  |
| **worst case**                   | **5.60**               | **6.11**                      | **5.11**              | **8.24**                     |

Before this tuning the light worst cases were 3.54 (rose on the 12% tint over the surface) and 4.46 (rose-strong on the 16% tint over the surface); at the pre-blend base, light rose `#c63549` was 4.88:1 on paper and 4.30:1 on the surface.

Only `rose`, `rose-strong`, `rule` and `teal` are painted today (links, hairlines, teal signals); the haze / particle / grid-glow names have no consumers and are kept for the atmosphere.

## Colour rules for pages and components

Layouts, pages and components (`core/web/app/**/*.{vue,scss}`) follow spec rule 5: they use colour variables and never define colours.

**Names to use.** Colour `var()`s name one of these:

- A theme colour, `--theme-*-color`. Examples: `--theme-text-color`, `--theme-surface-color`, `--theme-border-strong-color`, `--theme-link-color`, `--theme-focus-ring-color`, `--theme-primary-color`, `--theme-on-primary-color`, the status colours `--theme-success-color` / `--theme-error-color` (and their `-ink` roles), the alpha steps `--theme-ink-a24-color`, and the fixed per-mode variations such as `--theme-paper-dark-color`.
- An app colour, `--portfolio-*-color`. Examples: `--portfolio-rule-color`, `--portfolio-rose-color`, `--portfolio-teal-color`, `--portfolio-primary-color`.
- A palette name the owner keeps: `--red-color` … `--magenta-color`, and the `palette` list in `theme/core/src/color-rename-map.json`.

The name must be declared: by the theme's `:root` (`theme/core/scss/globals/_root.scss`), by `_variables.scss`, or by the runtime writers (`RUNTIME_COLOR_TOKEN_NAMES`, `--portfolio-depth-custom-color`). A typo such as `--theme-primry-color` fails the guard.

**Text uses `-ink` roles.** `color:`, `-webkit-text-fill-color:` and SVG text `fill:` (a rule for `text` or a `…label`) never read a main variation — `--theme-primary-color`, `--theme-secondary-color` or `--theme-accent-color`, not even as a `var()` fallback or a `color-mix()` argument: they reach only 3:1 (fills, borders, graphics). Brand-coloured words use `--theme-primary-ink-color`, secondary-coloured words `--theme-secondary-ink-color` (both ≥ 4.5:1 on page, surface and variant; a `color-mix()` that tints text mixes from the ink role); status text uses `--theme-<status>-ink-color`; links `--theme-link-color`. Fills, borders, `text-decoration-color`, `accent-color` and `outline` stay on the main variation. Guarded by the "text never paints a 3:1 main variation" tests (`core/web/tests/colors-scss.spec.ts`, `core/admin/tests/colors-scss.spec.ts`; engine `mainVariationTextProblems` in `core/web/tests/support/colors-scss-guard.ts`; the theme layer: `theme/core/tests/text-roles.spec.ts`). The allowlist counts exact occurrences; its one entry is the architecture diagram's edges (`currentColor` for strokes and arrowheads, not text). The diagram's SVG group labels and the `/styles` column labels sit on tints, so they mix `--theme-secondary-ink-color` toward `--theme-text-color` (75 % and 60 % ink), checked for every preset in `core/web/tests/secondary-ink-sites.spec.ts`.

A tint is a `color-mix()` of those names with `transparent`, or of two of those names. Old names such as `--text-color`, `--primary-color`, `--portfolio-rule` and `--focus-ring` are gone (colour system Task 8): the stylesheet no longer declares them, so they paint nothing, and the guard refuses them.

**No literals.** No hex, no `rgb()` / `hsl()`, no `oklch()` / `oklab()` / `lab()` / `lch()` / `hwb()` / `color()` (a `color-mix()` of the names above is fine), no named colours, and no Sass `$` colour values: no top-level `$x: <colour>` and no `$x` passed to an `@include`. This applies in style blocks and `.scss` files, including shadows, gradients, masks, `filter: drop-shadow()` and SVG stops. It also applies to inline styles: a static `style="…"` and the string values of a `:style` object or array literal (`div(style="color: white")` and `:style="{ color: 'black' }"` both fail).

When a design needs a colour that no name covers, use the nearest variation (R-T5e): ink, paper, a main colour or a status colour, with alpha where needed. Two examples:

- Black that must stay black in both modes (a video letterbox, a mask, a darkening mix) becomes `var(--theme-paper-dark-color)`.
- The code window's traffic-light dots are decoration, not status, so they use the owner-kept palette: `--red-color`, `--amber-color` and `--green-color` (owner decision).

**No colour variables.** A component declares no colour custom property. It points at the theme or app name directly.

- Where the colour is data, it is set inline on the property itself. For example, a Style Studio palette swatch is `background: <hex> !important`, and a `UiImage` dominant colour and its ink are set as `background-color` and `color`.
- Custom properties are set in SCSS, never inline: the guard refuses every inline `:style="{ '--x': … }"` / `style['--x'] = …`. Non-colour hooks such as `--ui-image-zoom` (set by a host sheet) and `--work-card-media-width` are declared in SCSS and are fine.

**Data, not styling.** Hex strings that are data are allowed only when they are listed, with a reason and an exact occurrence count, in the guard's `APP_DATA_LITERALS` (a second, painted use of the same hex fails). Data here means picker values, contrast-maths fallbacks and documentation specimens.

**Codemod.** `node scripts/rename-color-vars.mjs <dir>…` rewrites every `var(<old>` to `var(<new>`.

- It reads its map from the theme `renames` and from `shared/portfolio-color-names.ts`.
- It matches exact names only, so `--primary-color` never matches inside `--primary-color-inverted`.
- It prints a per-file count and skips `components/AnalogClock.vue` (by path), `components.d.ts`, `_archive/`, `*.generated.scss` and the guard specs whose fixtures use old names on purpose.
- `node scripts/rename-color-vars.mjs --check core theme packages` reports 0 since Task 8 (guarded by a node test).
- `--check` reports without writing, and exits 1 if any old name remains (2 without a directory).
- Tests: `scripts/rename-color-vars.test.mjs`.

**Guard.** `core/web/tests/colors-scss.spec.ts`, in the "pages, layouts and components" block, scans every `.vue` file (style, template and script) and every `.scss` file under `core/web/app`. `components/AnalogClock.vue` is excluded by path: it is unreferenced and the owner leaves it alone. The guard fails on three things:

- a literal
- a declared colour variable
- a `var()` of an old or undeclared colour name

**core/admin (Task 6).** `core/admin/app/**` and the admin global sheet (`core/admin/assets/css/admin.scss`) follow the same rules via `core/admin/tests/colors-scss.spec.ts`, which imports the matching engine from `core/web/tests/support/colors-scss-guard.ts` (R-T6b) instead of a second copy of it — only the package-specific inputs (declared names, palette, non-colour var pattern, data-literal allowlist) differ. Admin declares no colour custom properties of its own: every admin colour points straight at a `--theme-*-color` name (R-T6a — a `--web-*-color` family is reserved for a colour genuinely shared across admin pages that isn't already a plain theme role; none exists yet, so none is declared). Admin's pre-rename names (`--surface-border`, `--surface-card`, `--primary-color`, `--border-strong`, `--link-color`, `--focus-ring`, `--surface-variant`, `--border-color`, `--surface-color`, `--success-ink`, `--warning`, `--danger-ink`, `--text-color-secondary`) are gone; `AdminNav`, `AdminDatabaseSelector`, the CDN and Media pages, and `admin.scss` now reference `--theme-border-color`, `--theme-surface-color`, `--theme-primary-color`, `--theme-border-strong-color`, `--theme-link-color`, `--theme-focus-ring-color`, `--theme-surface-variant-color` and `--theme-text-secondary-color` directly, with no hex fallback (the codemod renames `var(` references only, so every literal fallback was removed by hand).

## When to add a mixin vs a global selector

- **Mixin** (`_mixins.scss`): same recipe in ≥2 sheets, or thinning launch chrome that pages also need via `@include`.
- **Selector** (`_globals.scss`): shared HTML tags / classes that should load once on every page (headings, default links, `.page-content` containment, eyebrows, tags).
- Prefer a mixin when Vue scoped styles need the recipe without emitting another global rule.

## Layers, units and breakpoints

`assets/css` is layer 2 of five (theme → app global → layout → page → component). Pages and components are scoped; `site.scss` is the only layout sheet. Units are relative (`rem` / `em` / `%` / `dvh` / container units) — px only for hairlines, focus rings, shadows, blur, the `--touch-target` / `--type-min` floors and `/* units: scene */` sheets. Breakpoints come from `bp-up()` / `bp-down()` (em, range syntax) or container queries; never raw `min-width` / `max-width`. Policy and guards: [theme.md § Style layers and units](../../packages/theme.md#style-layers-and-units); the 768px pitfall: [solutions/ui-bugs/breakpoint-overlap-at-768px.md](../../solutions/ui-bugs/breakpoint-overlap-at-768px.md).
