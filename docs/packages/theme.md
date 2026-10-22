# `@tgmc/theme` SCSS layout & tokens

Canonical guide for the workspace theme package (`theme/core`). Rebuild after SCSS changes so Nuxt resolves `@tgmc/theme` from `theme/core/dist` (`npm run postinstall` / `nx prepare @tgmc/web`).

In-app `/docs` reads this file from the repo `docs/` tree (no copy into `core/web/content/`). See [gallery-and-docs.md](../web/features/gallery-and-docs.md).

## Layers

| File                            | Role                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `tokens/_variables.scss`        | Sass SoT for space, radius, blur, transition, shadow, card mins, breakpoints            |
| `globals/_root.scss`            | CSS custom properties only (colors + bridges from Sass tokens, page-fit + ratio tokens) |
| `globals/_layouts.scss`         | CUBE composition algorithms (rail / split / auto / stack / cluster) + `data-fit`        |
| `globals/_container.scss`       | Section/article/panel surfaces; media frames (`--media-ratio`); grid track containment  |
| `globals/_class-selectors.scss` | Stylized formats + utilities (wallpaper, chrome, rules, nav pills)                      |
| `globals/_mixins.scss`          | Shared recipes (`theme-wallpaper`, `site-chrome`, `backdrop-blur`, `sr-only`)           |
| `_layout.scss`                  | Document shell (`html` / `body` / `#site_page`), imported by theme `scss/index.scss`    |

Document shell (`html` / `body` / `#site_page`) lives in `theme/core/scss/_layout.scss` (imported by `@tgmc/theme` `scss/index.scss`).
App portfolio tokens live in `core/web/assets/css/_variables.scss` (emitted via `portfolio-launch.scss`); shared mixins live in `_mixins.scss`; shared HTML/tag selectors live in `_globals.scss`. See [App SCSS](../web/features/app-scss.md).

Theme `:root` exposes `--font-family-display|title|header` from Sass `$header-font-family` (often empty). The web app rebinds those roles to a real stack and owns `--type-*` chrome metrics / `portfolio-type-*` mixins — do not treat empty theme header families as the portfolio type SoT.

### Third-party layers

`scss/index.scss` declares `@layer normalize, foundation, primevue, theme;` (the order `themePrimeVueCssLayerOrder` in `src/primevue.ts` also uses). The switches live in `scss/_config.scss`; the app entry `core/web/assets/css/styles.scss` sets them:

| Switch                     | Default    | Loads                                                                                                                                                                                              |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$theme-enable-normalize`  | `false`    | `layers/contents/_normalize.scss`: Foundation's `foundation-normalize`, from upstream `pkg:foundation-sites/scss/vendor/normalize`                                                                 |
| `$theme-enable-foundation` | `false`    | `contents/_foundation-layout.scss` (XY Grid, flex and visibility classes) or, in `full` mode, `contents/_foundation-full.scss` (`foundation-everything`); then `contents/_foundation-runtime.scss` |
| `$theme-foundation-mode`   | `'layout'` | `'layout'` or `'full'`                                                                                                                                                                             |

The web app turns Foundation on in `layout` mode and leaves normalize off.

- **Foundation** is npm `foundation-sites`, pinned to `6.9.0` as a dependency of `@tgmc/theme`. Theme Sass imports it with `pkg:` URLs (`@import 'pkg:foundation-sites/scss/xy-grid/xy-grid'`), so every compiler needs a Node package importer. The apps pass `scssImporters` from `core/web/config-properties/scss-additional-data.ts`, a `sass-embedded` `NodePackageImporter`: Vite compiles with `sass-embedded` and only accepts that package's importer class. Tests that compile with `sass` pass `new sass.NodePackageImporter()`. Normalize is upstream's, with no theme override. The vendored copy's `input[type='file']::-webkit-file-upload-button` fix had no effect (normalize is off and both apps use `layout` mode). It is archived, with restore steps, in `theme/core/scss/_archive/2026-10-14-foundation-normalize/`. `tests/foundation-css-equivalence.spec.ts` snapshots the compiled layout and normalize CSS, and `core/web/tests/scss-pkg-importer.spec.ts` compiles the layout layer through the app importers.
- **PrimeVue** is styled mode only: the Nora preset (`src/primevue.ts`) writes its CSS into the `primevue` layer. There is no PrimeVue Sass layer. The PrimeVue v3 Sass theme (`mytheme` + `theme-base`) and the classic Sass path are archived in `theme/core/scss/_archive/2026-10-14-primevue-v3/`.

`.prettierignore` lists both archived third-party copies (the normalize archive's `normalize.scss` and the whole PrimeVue v3 folder) so they stay verbatim; their archive READMEs are formatted like any other file.

## `:root` hygiene

- Keep **variables** on `:root` — not font-smoothing, vendor text-shadow prefixes, or decorative shadows.
- Font smoothing lives on `html`; default text shadow uses `--text-shadow-root` on `body`.
- Space / radius / blur / transition / shadow CSS vars mirror Sass tokens (`--space-*`, `--border-radius-*`, `--blur-*`, etc.).

## Opt-in surface classes

| Class              | Use                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `.theme-wallpaper` | Conic brand tile background (also default on `body`)                                      |
| `.theme-motion`    | Soft color/shadow transitions (also default on `body`; respects `prefers-reduced-motion`) |
| `.site-chrome`     | Glass bar finish for header/footer (`site.vue` applies this). Includes `backdrop-blur(md)` — sticky consumers must clear it on the sticky box and put blur on a `::before` (see `docs/solutions/ui-bugs/sticky-backdrop-filter-kills-touch.md`) |
| `.theme-rule`      | Soft section divider (`hr` uses the same recipe)                                          |
| `.nav-pills`       | Pill-cluster nav links                                                                    |

## CUBE track mins

`--card-min`, `--card-min-md`, `--card-min-compact`, `--stack-min` drive auto/stack/split grids in `_layouts.scss`.

## Page fit (`data-fit`)

Breakpoints (Sass + CSS): **mobile 480 · tablet 768 · standard 1080 · widescreen 1440 · ultrawide 1920**.

| Attribute           | Use                                              | Horizontal                                                     | Vertical                                                                                                 |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `data-fit="fluid"`  | Code, gallery (working surfaces)                 | Full viewport width inside `--page-pad` — no max cap           | No tall hero minimum; the working surface starts under the header                                        |
| `data-fit="screen"` | Home, work index, product, styles, media, AI Lab | Full width within `--page-pad` (`--page-screen-max`)           | Fills flex `<main>` between in-flow header/footer; scrolls like every page when taller than the viewport |
| `data-fit="prose"`  | About, blog, docs, process, case studies         | Shell uses `--page-shell-max`; body/`prose` uses `--prose-max` | `min-height: 100%` of flex main so short pages still fill without re-adding chrome                       |

### Page-fit tokens

| Token               | Role                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `--page-pad`        | Inline padding on `.page-content`                                                              |
| `--page-shell-max`  | Max width for reading / default rail shells (hard cap **1440px**)                              |
| `--page-screen-max` | Max width for immersive (`screen`) pages (hard cap **1440px**)                                 |
| `--prose-max`       | Readable measure for body regions under `data-fit="prose"`                                     |
| `--page-chrome`     | Sticky header clearance (static default + live from `styleListener`)                           |
| `--page-fill-min`   | `calc(100dvh - var(--page-chrome))` — hero sizing / legacy fill; shell fill uses flex + `100%` |

Site chrome (header/footer) is **in-flow** flex rows on `#site_page`. Do **not** pad `<main>` by header/footer height — `--main-top-padding` / `--main-bottom-padding` are sticky-offset tokens for in-page rails (docs TOC), not main padding. Every page, home included, follows one rule: the shell (`core/web/app/layouts/site.scss`) is a `min-height: 100dvh` flex column with `<main>` taking the slack, so long pages scroll and the footer anchors to the viewport floor when content is short (no per-page scroll lock; the old home lock is archived in `theme/core/scss/_archive/2026-09-24-home-scroll/`). `site.scss` is the only layout sheet: `default` / `playground` / `snippet` just add a `.layout-*` modifier class, and the SSR fallback for `--main-*-padding` is declared once there (the client measures the real chrome in `shared/utils/style-listener.ts`). The footer switches from a centred stack to one row with a container query (`@container site-footer (width >= 46rem)`), so it follows the footer's real width rather than the viewport.

### Elevation (`--shadow-*`)

Drop shadows share one scale on `:root`, mixed from the shadow ink `--theme-shadow-color` (the dark end of the pen & paper pair: dark mode's paper, light mode's ink), so they follow a custom pair:

| Token         | Use                                       |
| ------------- | ----------------------------------------- |
| `--shadow-sm` | Soft surfaces, light lifts                |
| `--shadow-md` | Panels, toasts, figures, tables, chrome   |
| `--shadow-lg` | Overlays / menus (e.g. primary nav panel) |

There are no app aliases: pages and components read `--shadow-*` directly. Focus rings and decorative insets stay separate from this elevation scale. Buttons keep `--button-shadow*`.

Tokens live on `:root` in `globals/_root.scss` and scale per breakpoint. Split pages (`.page-with-nav`) span the shell; the reading column stays in `--prose-max`.

Pages opt in on the root `.page-content` element (`data-fit="screen"` | `"prose"`). Contract tests: `core/web/tests/page-fit.spec.ts`.

## Landscape ratios (horizontal screens)

Allowed frame ratios for media / image-led cards and subsections: **9:16 · 16:9 · 1:1** only.

| Token             | Portrait / narrow | Landscape | Ultrawide landscape |
| ----------------- | ----------------- | --------- | ------------------- |
| `--media-ratio`   | `9 / 16`          | `16 / 9`  | `16 / 9`            |
| `--card-ratio`    | `1 / 1`           | `16 / 9`  | `16 / 9`            |
| `--surface-ratio` | `9 / 16`          | `16 / 9`  | `16 / 9`            |

Applied to **media frames** only:

- Theme: `[data-region='media']`, `.card-media`, and `figure > img|video` in `_container.scss`
- App: work-card media (column layouts), gallery exhibit/frame, artifact / case-study images, image-led gallery tiles

Text containers (work-card copy, principle/evidence tiles, feed cards, nested sections) **size to their content** (`width: fit-content` on nested `section` / `article` / `.panel`). Direct `.page-content > section` bands stay **`width: 100%`**. Grouped items (`.auto-grid`, `.layout[data-algo='auto'|'stack']`) stay full-width: in a **vertical** group children are **`width: 100%`** (fit the container, overriding fit-content); **above tablet** they row-wrap with **equal** flex item sizing. Gallery media cards (`.gallery-grid` tiles / feed cards) keep their own aspect-driven tracks — not the equal flex group rule. Landscape preference for text is side-by-side layout (grid/flex), not a card-level `aspect-ratio` that clips copy. Content shells are fluid and centered with a hard max of **1440px** (`--page-shell-max` / `--page-screen-max`).

### Button radius

`--button-radius` resolves to `--border-radius-sm` (not md/pill). Theme `.btn` / native buttons, PrimeVue `.p-button` (including `rounded`), and app chrome control buttons use this token — no full-round / pill buttons.

## Content must fit containers

When changing layout SCSS or card templates:

1. Prefer `min-width: 0`, `max-width: 100%`, and `minmax(0, …)` / equal flex bases so group children can shrink.
2. Nested sections/articles/panels use `width: fit-content`; `.page-content > section` is full width. Only **groups** stretch sibling items equally above tablet.
3. Put `aspect-ratio` on the **media box** (or the image), never on a text-heavy card that also uses `overflow: hidden`.
4. Media inside a fixed frame uses `object-fit: cover` (or `contain` for diagrams); captions stay outside the ratio box.
5. Gallery media grids keep custom dense/`auto-fill` sizing — do not force equal flex wrap on those tiles.
6. Portfolio shell helpers in `core/web/assets/css/_globals.scss` (`.page-content`) wrap long words (`overflow-wrap`) and cap media at `max-width: 100%`. Emitted once via `portfolio-launch.scss` — see [App SCSS](../web/features/app-scss.md).

## Brand roles vs hue scale

`tokens/_colors.scss` separates:

| Kind            | Sass                                                                                                                                                                       | CSS                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Brand roles** | `$primary-color-*` / `$secondary-color-*` / `$accent-color-*` (primary ember; secondary analogous; accent complementary)                                                   | `--theme-<c>-color` (the active variation — see [Runtime model](#runtime-model)); focus: see Contrast roles |
| **Hue scale**   | `$navy-*`, `$azure-dark`, `$forest-*`, `$oxblood-*`, `$violet-*`, `$wine-*`, `$sea-*`, `$olive-*`, `$plum-*` / `$tangerine-dark`, `$taupe-*`, `$ink-*` / `$parchment-dark` | `--tertiary-color` … `--denary-color` (kept **palette** names for the hues, not brand roles)                |

Portfolio signal teal is `--portfolio-teal-color` (the success colour); do not overwrite the palette `--teal-color` / `$css-teal-*`. Applied controls: About Digital CV résumé button (`.about-cv__resume`), Gallery view/like stats (`.gallery-grid__stats` / `.gallery-feed-card__stats`), and Code language tags (`.code-page__lang`). Surfaces/text/borders use the theme roles (`--theme-main-background-color`, `--theme-surface-color`, `--theme-text-color`, `--theme-border-color`).

The web app must not re-own those hexes in `core/web/assets/css/_variables.scss`. Inventory / gate: `node scripts/measure-app-scss.mjs` (`duplicate_color_sot`). Atmosphere chrome (`--portfolio-haze-*-color`, particles, rose) is `color-mix()` blends of the theme's active colours — see [App SCSS](../web/features/app-scss.md#atmosphere-blend-table) and `CONCEPTS.md` (Duplicate color SoT / Theme-derived chrome).

Personalization brand roles live in Preferences (`core/web/shared/preferences/`, imported from `#shared/preferences`; stored as `brandRoles` inside `tgmc-preferences`). Studio presets (`Theme.presets()` / `theme-presets.json`) are palette collections plus Light/Dark pairs in `colors.json` `sass`. `theme-presets.json` is generated by `buildStudioPresets()` — regenerate it with `npm run build:presets --workspace=@tgmc/theme` (`bin/build-theme-presets.mjs`) after palettes or the preset rules change; `tests/theme-singleton.spec.ts` fails on drift. Each preset derives primary, secondary, and accent from that source, plus a background triad (extra swatches, or the same roles when the source has no extras). Secondary is an analogous step (60°, then 48°, then 36°). Colorfulness is saturation scaled by distance from black and white. When blackness is larger than whiteness and beats that colorfulness, the hue swings negative and the partner is lighter. When whiteness is larger and beats colorfulness, the hue swings positive and the partner is darker. A saturated mid color searches both directions. The other direction is a fallback when the preferred step cannot clear contrast; when nothing clears it, the most separated candidate is used so a preset never repeats its primary. Applying a preset adjusts the brand triad against paper (≥ 3:1); the app paints its background triad with the same colours, and moves pack-image stops to ≥ 4.5:1 under ink and, where that holds, ≥ 3:1 on paper. Named **style setups** (`tgmc-style-setups`) apply via Personalize quick-apply or Style Studio (`/styles`). Deep role / motion / background editing is on Style Studio; Personalize stays thin (mode + apply + Open studio). See [web/features/personalization.md](../web/features/personalization.md).

## Style layers and units

Styles live in the layer they belong to — top is universal, bottom is most specific. Plan: 2026-09-24 SCSS hierarchy and units.

| Layer               | Where                              | Owns                                                                                                                                                                    | Must not                                                               |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1 Theme (universal) | `theme/core/scss`                  | Tokens (color, type, space, radius, shadow, breakpoints, floors), reset, base type, primitives (buttons, forms, tabs), utilities, PrimeVue / Foundation bridges, mixins | Reference app ids, routes or components                                |
| 2 App global        | `core/web/assets/css`              | App tokens (`--portfolio-*`; colours `--portfolio-*-color`), cross-page selectors (prose, skip link, focus), app mixin recipes                                          | Page / component selectors; re-declare theme tokens                    |
| 3 Layout            | `core/web/app/layouts`             | Page shell, header / footer chrome, layout modifiers                                                                                                                    | Page selectors                                                         |
| 4 Page              | `core/web/app/pages` (scoped)      | Page composition                                                                                                                                                        | Restyle child internals with `:deep()` — use props / custom properties |
| 5 Component         | `core/web/app/components` (scoped) | Its own box and internals; container queries                                                                                                                            | Global selectors (teleported dialogs: one named global class)          |

**Files:** long, scrolling style blocks go in an external sheet beside the `.vue` (`<style lang="scss" scoped src="./Name.scss">`); short blocks stay inline.

**Pages (layer 4).** Scoped only. A child component's **root** element carries the page's scope, so the page can size it without `:deep()`; anything inside a component is the component's job — add a prop / variant instead (`AppWorkCard layout="row"`, `AppBrowseToolbar inline`, `AppPageNav embedded`). The one exception is rendered markdown (`/blog/[slug]`, `/docs/[...slug]`), which isn't a component. Guarded by `core/web/tests/pages-scss.spec.ts`.

**Box-driven layouts use container queries.** When a layout depends on the width of its own box rather than the screen — the /work card row, the /code reader's side list, the blog feature card, an `alternate` timeline — use `container-type: inline-size` on the box (or its list) and `@container (width >= …rem)`. A viewport breakpoint would give a 768px tablet the desktop split with a cramped column. Don't put `container-type` on an element that sizes to its content (an auto grid track, a shrink-to-fit or `fit-content` box): inline-size containment collapses it. Where a switch is really a device-class decision (the browse toolbar's segments ↔ pickers, the Style Studio workbench in a `fit-content` region), keep a viewport query written as an exact range pair in `em` — `@media (width <= #{bp(tablet)})` / `(width > #{bp(tablet)})` — so 48em (768px at the default text size) keeps the tablet layout, exactly one rule applies, and the switch follows the reader's text size like `bp-up` / `bp-down`.

**Components (layer 5).** Scoped, always. A teleported element keeps its scope when it is the component's own slot content (Personalize); only when a library teleports its _root_ (PrimeVue `Dialog`) may a sheet be global, and then under one named class with everything nested (`.evidence-examples-dialog`). `:deep()` only where a component styles markup it renders but doesn't template — its wrapped library (`UiTabs`, `UiTimeline`) or its v-html (`UiCodeBlock`). Hosts talk to children through props / variants or inherited custom properties (`--ui-image-zoom`), never by reaching in. Internals stay in `rem` where they already are: a blind `rem → em` swap would shrink spacing and targets inside 12px meta-text components; use `em` for new internals that should scale with the component's own text (pills, chips). Guarded by `core/web/tests/components-scss.spec.ts`.

### Units

| Use                                   | Unit                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Root font size                        | `100%` (ultrawide `125%`) — never px, so the reader's browser text size applies                                                  |
| Font sizes                            | `rem`; fluid `clamp(<rem>, <rem> + <vw>, <rem>)` — never `vw` alone (doesn't zoom, WCAG 1.4.4)                                   |
| Spacing, radius, widths               | `rem` in layouts / pages; `em` inside components (scales with the component's own text); no `em` font sizes in nested structures |
| Boxes / measure                       | `%`, `min()` / `max()` / `clamp()`, `ch`; container queries (`container-type: inline-size`, `cqi`)                               |
| Viewport height                       | `dvh` / `svh` (not `vh`)                                                                                                         |
| Media queries                         | `em`, range syntax, mobile-first (below)                                                                                         |
| Floors                                | `max(2.75rem, 44px)` touch, `max(0.75rem, 12px)` text                                                                            |
| Hairlines, focus rings, shadows, blur | `px` (1–2px) — sub-pixel rem values blur or drop them                                                                            |
| Decorative 3D scenes                  | `px` geometry in sheets marked `/* units: scene */` (depth field, orbit stage) — sized to the screen, not the reader's text      |

### Breakpoints (hybrid)

The theme's named scale stays; it is expressed in `em` and queried with range syntax so rules can't overlap (`max-width: 768px` and `min-width: 768px` both match at exactly 768px):

| Name         | px   | em       |
| ------------ | ---- | -------- |
| `mobile`     | 480  | `30em`   |
| `tablet`     | 768  | `48em`   |
| `standard`   | 1080 | `67.5em` |
| `widescreen` | 1440 | `90em`   |
| `ultrawide`  | 1920 | `120em`  |

Use `@include bp-up(tablet)` → `@media (width >= 48em)`, `@include bp-down(tablet)` → `@media (width < 48em)` and `@include bp-between(tablet, standard)`; `bp(tablet)` returns the em value for compound queries. Mixins live in `theme/core/scss/globals/_mixins.scss` and are forwarded by the app `_mixins.scss`. Write mobile-first. Components prefer `@container`.

### Guards

- `node scripts/scss-units-report.mjs [--files | --json]` — px per layer, split into **allowed** (policy) and **convertible**.
- `scripts/scss-units-report.test.mjs` — **strict**: every layer has 0 convertible px (all five reached 0 in plan Tasks 3–6; the ratchet and its baseline file are retired). Decorative 3D scene sheets opt out with `/* units: scene */`.
- `core/web/tests/pages-scss.spec.ts`, `core/web/tests/components-scss.spec.ts` — pages and components are scoped, don't restyle child internals, and use no raw min/max-width queries.
- Why range syntax (and when a container query or an exact `<=` / `>` pair): [solutions/ui-bugs/breakpoint-overlap-at-768px.md](../solutions/ui-bugs/breakpoint-overlap-at-768px.md).
- `core/web-e2e/src/e2e/ui-audit.cy.ts` — every public route at 375 / 768 / 1280: no page overflow, no controls under 44px, no text under 12px, no unnamed controls; plus 320px reflow (≈ 400% zoom).
- `core/web-e2e/src/e2e/responsive-components.cy.ts` — every public route (enumerated from `core/web/app/pages` + the case-study collection) at 375×812 / 768×1024 / 1024×768 (+ 320×640 reflow): clipped or spilling text, overlapping text, controls off-screen, media wider than its box, plus the same floors; and the interactive components (Menu sheet, Personalize, Style Studio, page nav, browse toolbars, code picker, media player, story pager, social links, evidence dialog) opened and measured at phone / tablet. Shared audit: `core/web-e2e/src/support/layout-audit.ts`. See [web/features/interaction-redesign.md § Responsive regression (e2e)](../web/features/interaction-redesign.md#responsive-regression-e2e).
- Code frames (`UiCodeBlock`, styled by `globals/_syntax.scss` `.syntax-frame`) scroll horizontally, so each is a keyboard-focusable named region (`role="region"`, `tabindex="0"`, `aria-label` "Code: <language>" unless the caller passes a non-empty label) with the site focus ring on `:focus-visible` (`2px solid var(--theme-focus-ring-color)`, offset 2px). Gallery wrappers keep `overflow: hidden` on media only so the outward ring is not clipped on code exhibits. In the gallery **grid** the code is a cropped preview: `UiCodeBlock` `focusable: false` (via `GalleryExhibit` `code-focusable`) drops `role` / `tabindex` / label and crops instead of scrolling, so it is no tab stop with a clipped ring — the tile's "Open in feed" button is its control. Guarded by `core/web/tests/code-block-focus.spec.ts` (mounts all three frames) and `core/web-e2e/src/e2e/code-frame-focus.cy.ts` (the ring box against every clipping ancestor, feed and grid).

## Touch and type floors

Repo UI rule: every change covers **responsive · accessible · touch** (`docs/agents/README.md`). The theme owns the floors so pages don't re-size controls one by one.

| Token / helper                                                 | Value                | Use                                                                                                                       |
| -------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--touch-target`                                               | `max(2.75rem, 44px)` | Minimum height (and width for icon-only) of every control. `--form-control-height` is `max(var(--touch-target), 2.5rem)`. |
| `--type-min`                                                   | `max(0.75rem, 12px)` | No text renders smaller. `--font-size-xs` and the app's eyebrow / meta mixins are floored with it.                        |
| `@include touch-target($display: inline-flex, $square: false)` | mixin                | `globals/_mixins.scss`; forwarded by the app's `assets/css/_mixins.scss`.                                                 |
| `@include font-size-floor($size)`                              | mixin                | `font-size: max(var(--type-min), $size)`.                                                                                 |
| `.touch-target`, `.back-link`                                  | classes              | `globals/_class-selectors.scss` — for templates without their own styles.                                                 |

Built in: theme buttons (`.btn`, `button-size-sm`), PrimeVue tabs, the PrimeVue Select (a `<div>`, so the native `select` floor in `_form.scss` misses it; `.p-select` gets `--form-control-height` in `globals/_primevue-union.scss`), page-nav links, checkbox / radio / switch labels (`label:has(input)`, `input + label`) and small PrimeVue text (`.p-badge`, `.p-tag`, `.p-progressbar-label`). Nora’s default badge/progress label size is `0.625rem` (10px); `themePrimeVuePreset` floors those tokens to `max(var(--type-min), 0.75rem)` so styled-mode CSS vars stay readable (`theme/core/src/primevue.ts`, guarded by `tests/primevue-type-floors.spec.ts`). Phone body text stays **16px** (`--font-size-default` no longer drops ×0.75 below 768px). Page-nav links keep a visible focus ring.

### Archive, don't delete

Replaced styling moves to `theme/core/scss/_archive/<date>-<slug>/` (mirrors the repo path; `.vue` files keep only their old `<style>` block) with a README of what changed. Nothing in `_archive/` is imported, compiled or shipped. Each change has its own dated folder (for example [`_archive/2026-09-24-pre-a11y/`](https://github.com/likwidmack/portfolio/tree/main/theme/core/scss/_archive/2026-09-24-pre-a11y)); see [`_archive/`](https://github.com/likwidmack/portfolio/tree/main/theme/core/scss/_archive) for the full list.

## Colour system

Spec: `docs/superpowers/specs/2026-09-24-color-system-design.md` (implemented, stages 1–8). The site is restyled from a handful of **solid colours**; every other colour is a named **variation** of them, and every colour variable says what it is. There are no aliases: the pre-colour-system names (`--primary-color`, `--text-color`, `--paper`, `--portfolio-rose` …) were removed in Task 8 and archived under [`_archive/2026-09-29-color-aliases/`](https://github.com/likwidmack/portfolio/tree/main/theme/core/scss/_archive/2026-09-29-color-aliases).

**Rules** (spec § Rules; agent rule 17 in agents/README.md). This list is numbered differently from the spec; each rule names its spec number.

1. (Spec rule 4.) Every colour variable in the theme and the app globals ends in `-color`. Theme: `--theme-*-color` (Sass `$theme-*`); core/web globals: `--portfolio-*-color`; core/admin globals: `--web-*-color`.
2. (Spec rule 3.) Every colour on a property is a solid colour, one of its variations, or a derived name (neutral step, alpha, role) — no independent colours. **Met for the custom properties** `globals/_root.scss` emits (see [Derived families](#derived-families); `tests/rule3-guard.spec.ts`). Not yet guarded: Sass colour values written straight onto properties in the other theme globals (`_container.scss`, `_objects.scss` … — TODO).
3. (Spec rules 5 and 6.) Pages and components have no colour literals and declare no colour variables; web apps use CSS variables, never Sass colour values.
4. (Owner decision; not a numbered spec rule.) **Exceptions (kept names):** the ten basic colours `--<hue>-color` and the data palettes (`--navy-color`, `--tertiary-color`, `--primary-default` …) — the owner kept them; Foundation's `--foundation-*` and PrimeVue's `--p-*` — third-party interfaces whose values read `--theme-*-color` names.

### Solid colours and variations

**Ten families, eleven names:** main `primary`, `secondary`, `accent`; grounds `ink` (foreground) and `paper` (background); flags `warning`, `error` (alias name `alert`), `info`, `success`, `focus`. The eight non-ground colours each have four generated variations; ink and paper have only the per-mode pair.

| Variation                                                                                        | What it is                                                                                                        | Contrast target                                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `--theme-<c>-light-color`                                                                        | The source hex, lightness-adjusted until it passes against light-mode paper                                       | main 3:1 · status 4.5:1 · focus 3:1                             |
| `--theme-<c>-dark-color`                                                                         | Same, against dark-mode paper                                                                                     | same                                                            |
| `--theme-<c>-light-background-color`                                                             | The source hex, lightness-adjusted toward/away from light-mode ink's lightness                                    | ink text ≥ 4.5:1                                                |
| `--theme-<c>-dark-background-color`                                                              | Same, for dark-mode ink                                                                                           | ink text ≥ 4.5:1                                                |
| `--theme-<c>-color` / `-background-color`                                                        | The active variation for the current mode                                                                         | —                                                               |
| `--theme-primary-ink-{light,dark}-color` → `--theme-primary-ink-color`                           | The primary **as text**: the source hex, lightness-adjusted per mode                                              | 4.5:1 on page, secondary page, surface and variant (worst case) |
| `--theme-secondary-ink-{light,dark}-color` → `--theme-secondary-ink-color`                       | The secondary **as text**, built the same way                                                                     | same                                                            |
| `--theme-<status>-ink-{light,dark}-color` → `--theme-<status>-ink-color`                         | Success / warning / error / info **as text**: the variation mixed toward the text colour, then lightness-adjusted | same                                                            |
| `--theme-{primary,secondary}-wash-{light,dark}-color` → `--theme-{primary,secondary}-wash-color` | Hover (primary) / active (secondary) washes behind primary-ink text, painted at `$theme-wash-alpha` (24 %)        | primary-ink ≥ 4.5:1 on the wash over page, surfaces and variant |
| `--theme-paper-light-color` / `-dark-color`, `--theme-ink-light-color` / `-dark-color`           | The per-mode grounds                                                                                              | text and status inks ≥ 4.5:1, borders ≥ 3:1 (`checkPaperInk`)   |

Only **lightness** moves (hue and saturation stay). `--theme-alert-color` / `-background-color` point at `--theme-error-*`.

**Lightness band (too dark / too light).** A contrast search alone can push a colour to near-black or near-white (Midnight Magic's dark backgrounds reached HSL lightness 5 and 11, `#11001c` / `#35012c`), where the hue is lost. After a variation passes, `withinLightnessBand(color, grounds, min)` moves it back toward HSL lightness `LIGHTNESS_FLOOR` (15) – `LIGHTNESS_CEILING` (90) in steps of 2, keeping each step only while the worst-case contrast still reaches `min`. Contrast always wins: a colour that only passes outside the band stays outside. `adjustLightnessFor` and `backgroundFor` both apply it, so variations, backgrounds and Preferences preset tokens share one rule. On-fill inks (`--theme-button-fg-*`, paper / ink) are deliberately extreme and are not banded.

The main variations reach **3:1** — right for fills, borders and graphics (WCAG 1.4.11), too faint for words. Brand-coloured text (eyebrows, `dt` labels, hover and current states, tabs, outline / text buttons) uses **`--theme-primary-ink-color`** instead, following the `-ink` convention of the status roles (`--theme-success-ink-color` …). It is derived from the primary source like a variation, but against every ground text sits on (`textGroundsFor(pair, mode)`: the `NEUTRAL_ROLE_STEPS` page, secondary page, surface and surface variant — the grounds `checkPaperInk` checks body text on), worst case, and keeps the best-reached fallback when 4.5:1 cannot be reached. Defaults: light `#a33e16` (6.00:1 on paper, 5.29:1 on surface, 4.65:1 on variant), dark `#e65059` (5.32 / 4.99 / 4.77). Every `theme-presets.json` primary reaches 4.5:1 in both modes (`tests/color-variations.spec.ts`). Secondary-coloured words (prose list markers, table headers, `dl dt`, the `/styles` column labels, the architecture diagram's group labels) use **`--theme-secondary-ink-color`**, built the same way from the secondary source (`buildSecondaryInkTokens`): defaults light `#6e1622` (the source unchanged — 10.85:1 on paper, 9.57:1 on surface, 8.42:1 on variant), dark `#a17e68` (5.36 / 5.03 / 4.81; the 3:1 main variation `#8a6a56` is 4.02 / 3.77 / 3.61). Every preset secondary reaches 4.5:1 in both modes (worst 4.54:1). Text on a tint the builder does not model mixes the ink toward `--theme-text-color`: table headers (on the 16 % `--theme-secondary-a16-color` `thead` tint, 32 % border) and the `/styles` column labels (on the column washes and the 16 % accent panel) at 60 % ink, the diagram's group labels (on the 8 % primary group fill) at 75 % ink — each checked on its real tint for the defaults and all 21 presets in both modes (`tests/secondary-ink-tints.spec.ts`, `core/web/tests/secondary-ink-sites.spec.ts`). `cite`, code text and inline code swap their secondary for the ink. The code-block language pill is text on a secondary fill, so it pairs the fill's `-background` variation with the ink (`--theme-secondary-background-color` / `--theme-ink-color`: 4.57:1 dark, 4.66:1 light). Code frames show at full opacity (no resting fade), and their line numbers use `--theme-gray-200-color`, a neutral that stays light on the always-dark code pane (5.24:1 dark, 13.09:1 light). `time` uses the neutral `--theme-text-secondary-color`. Accent paints no text, so it has no `-ink` role. The theme layer has its own guard, `tests/text-roles.spec.ts`: `color:` / `-webkit-text-fill-color:` in `scss/globals` and `scss/layers` never read `--theme-{primary,secondary,accent}-color` or `--foundation-{primary,secondary,accent}` (Sass nested `background: { color }` is background, not text); its allowlist is empty. Foundation's hover / active tab, accordion and menu text reads `--theme-primary-ink-color` directly (the `--foundation-*` names are unchanged).

**Builder** (`theme/core/src/color-variations.ts`): `SOLID_COLORS`, `CONTRAST_TARGET`, `adjustLightnessFor(color, against, min)` (tries the direction **away** from the ground first; also used by Preferences paint for Style Studio presets), `backgroundFor(color, ink)` (moves the colour until the ink reads on it; a source that already passes is returned unchanged unless it is outside the lightness band), `LIGHTNESS_FLOOR` / `LIGHTNESS_CEILING` / `withinLightnessBand(color, grounds, min)`, `buildColorVariations(sources, paperInk)`, `DEFAULT_COLOR_SOURCES` (from `colors.json` sass keys), `buttonInkFor(fill)` / `buildButtonInkTokens(variations)` (`BUTTON_INK_TARGET` 4.5:1), `buildPrimaryFillTokens`, `primaryInkFor(primary, grounds)` / `textGroundsFor(pair, mode)` / `buildPrimaryInkTokens(sources, paperInk)` (`PRIMARY_INK_TARGET` 4.5:1), `secondaryInkFor(secondary, grounds)` / `buildSecondaryInkTokens(sources, paperInk)` (`SECONDARY_INK_TARGET` 4.5:1), `STATUS_COLORS` / `STATUS_INK_MIX` / `statusInkFor(hue, text, mix, grounds)` / `buildStatusInkTokens(sources, paperInk)` (`STATUS_INK_TARGET` 4.5:1), `WASH_ALPHA` / `compositeOver(ground, colour, alpha)` / `washFor(tint, text, grounds)` / `buildWashTokens(variations, primaryInk, paperInk)` (`WASH_TARGET` 4.5:1), `LINK_WASH_ALPHAS` / `linkInkFor(primary, grounds)` / `buildLinkTokens(sources, paperInk)` (`LINK_TARGET` 4.5:1), `onPrimaryFor(variations)` (the light paper the fill is built for), and `gradientColorsOver(fill, from, to)` / `gradientStopFor(stop, uses, fill, label)` / `buildButtonStopTokens(variations)` (`SECONDARY_SHEEN_ALPHAS`; the button label ≥ 4.5:1 on every gradient point). `adjustLightnessFor` also takes a list of grounds (the worst-case ratio counts; it moves away from the first ground first). All exported from `@tgmc/theme`.

**Generated Sass**: `scss/tokens/_variations.generated.scss` holds the committed defaults as `$theme-<c>-<variation>-color` plus a `$theme-variations` map for the `@each` loop in `globals/_root.scss`, and `$theme-button-fg-dark-color` / `$theme-primary-fill-{light,dark}-color` / `$theme-primary-ink-{light,dark}-color` / `$theme-secondary-ink-{light,dark}-color` / `$theme-<status>-ink-{light,dark}-color` / `$theme-{primary,secondary}-wash-{light,dark}-color` / `$theme-link-{light,dark}-color` / `$theme-{secondary-fill,secondary-inverted,primary-sheen}-{light,dark}-color`, plus `$theme-wash-alpha`. Regenerate after a solid-colour source or the paper/ink defaults change with `npm run build:variations --workspace=@tgmc/theme`; `tests/color-variations.spec.ts` fails on drift.

### Derived families

Generated in CSS from the active names, so a live change (Style Studio) reaches them:

| Family        | Names                                                                                                                                                                                                                                                                                                                                                                                                                     | From                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Neutral scale | `--theme-neutral-<0…1000>-color` (0 = paper … 1000 = ink)                                                                                                                                                                                                                                                                                                                                                                 | `color-mix(in oklab, ink N%, paper)` — see [Five-input model](#five-input-colour-model) |
| Alpha         | `--theme-<ink\|paper\|primary\|secondary\|accent>-a<N>-color`, N ∈ 4 8 12 16 24 32 48 64 80 90 (`COLOR_ALPHA_STEPS`)                                                                                                                                                                                                                                                                                                      | `color-mix(in srgb, <c> N%, transparent)`                                               |
| Roles         | `--theme-text-color`, `--theme-text-secondary-color`, `--theme-surface-color`, `--theme-surface-variant-color`, `--theme-border-color`, `--theme-border-strong-color`, `--theme-primary-fill-color`, `--theme-primary-ink-color`, `--theme-secondary-ink-color`, `--theme-link-color`, `--theme-on-primary-color`, `--theme-gray-*-color`, status `-hue` / `-ink` / `-surface`, the form, button and shadow roles below … | a `var()` of a neutral step, an alpha or a solid variation                              |

**Spec rule 3 (rule 2 above) is met for custom properties:** every colour-valued custom property `globals/_root.scss` emits is a `var()` / `color-mix()` of declared variations. `tests/rule3-guard.spec.ts` compiles the root and fails on any literal or Sass hex outside its allowlist (each entry with a reason): the solid colours' generated per-mode defaults (below), the owner-kept palette data (`paletteNames` / `palette` in the rename map), the syntax-palette channels `--rgb-accent-soft` (the code-highlighting palette is data on an always-dark code pane) and the third-party `--foundation-*` / `--p-*` names (their values are `var()`s of theme roles). It also fails when a colour value reads an undeclared name. Contrast for every role below — defaults, all 21 presets and 300 random picks on random paper / ink pairs that pass `checkPaperInk`, both modes — is pinned in `tests/derived-roles-contrast.spec.ts`.

The roles derived with spec rule 3 (2026-10-05; before / after in the PR "Derive the rule-3 roles", replaced declarations archived in `scss/_archive/2026-10-05-derived-roles/`):

| Name                                                                                                                                     | Derivation                                                                                                                                                                                                                                                                                                                                                                                     | Target                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `--theme-link-{light,dark}-color` → `--theme-link-color`                                                                                 | `linkInkFor(primary, textGrounds)` (`buildLinkTokens`): the primary source, lightness only, until it reads on page, secondary page, surface, variant **and** on its own 12 % / 16 % wash over them. Defaults `#883412` / `#e96a72`                                                                                                                                                             | text 4.5:1 incl. its washes                               |
| `--theme-on-primary-color`                                                                                                               | `var(--theme-paper-light-color)` (the light paper — follows a custom paper); `primaryFillFor` / `buildPrimaryFillTokens` move the fill until it reads (`onPrimaryFor(variations)`). Default `#faf6f3` on `#be4919` (light) / `#be1c26` (dark)                                                                                                                                                  | text on the fill 4.5:1                                    |
| `--theme-primary-hover-color`                                                                                                            | `var(--theme-button-hover-fill-color)` — PrimeVue's primary hover keeps the button fill                                                                                                                                                                                                                                                                                                        | its label 4.5:1                                           |
| `--theme-primary-inverted-color`                                                                                                         | the other mode's primary variation (`--theme-primary-{light,dark}-color`) — 1px text-shadows                                                                                                                                                                                                                                                                                                   | decorative                                                |
| `--theme-secondary-fill-{light,dark}-color`, `--theme-secondary-inverted-{light,dark}-color`, `--theme-primary-sheen-{light,dark}-color` | `buildButtonStopTokens`: the secondary variation (resting sheen start, Foundation `.button.secondary` fill), the other mode's secondary (hover / active sheen start) and the primary (`--button-secondary-bg` end stop), each lightness-moved by `gradientStopFor` until the button label reads on **every colour the gradient paints** (`gradientColorsOver`, premultiplied sRGB, 17 samples) | label 4.5:1 on every gradient point                       |
| `--theme-main-color`                                                                                                                     | `var(--theme-primary-color)` (glass-button focus / active shadow tint)                                                                                                                                                                                                                                                                                                                         | decorative                                                |
| `--theme-form-background-color`                                                                                                          | dark `var(--theme-paper-a48-color)`, light `var(--theme-ink-a4-color)`                                                                                                                                                                                                                                                                                                                         | text on it 4.5:1                                          |
| `--theme-form-background-disabled-color`                                                                                                 | `var(--theme-ink-a12-color)` (dark was invalid CSS, so transparent)                                                                                                                                                                                                                                                                                                                            | exempt (inactive)                                         |
| `--theme-form-placeholder-color`                                                                                                         | `var(--theme-neutral-750-color)` (the step between secondary text and text; step 750 added)                                                                                                                                                                                                                                                                                                    | 4.5:1 on the form ground                                  |
| `--theme-form-help-color`                                                                                                                | `var(--theme-text-secondary-color)`                                                                                                                                                                                                                                                                                                                                                            | 4.5:1                                                     |
| `--theme-form-invalid-color`                                                                                                             | `var(--theme-error-ink-color)`                                                                                                                                                                                                                                                                                                                                                                 | text 4.5:1, border 3:1                                    |
| `--theme-button-secondary-fg-color`                                                                                                      | `var(--theme-button-fg-color)` (its stops are built for it)                                                                                                                                                                                                                                                                                                                                    | 4.5:1                                                     |
| `--button-bg`, `--button-primary-bg`, `--button-secondary-bg`                                                                            | gradients of `color-mix(in srgb, <role> N%, transparent)` over `--theme-secondary-fill-color`, `--theme-primary-color`, `--theme-primary-sheen-color` (`--button-primary-bg` is decorative: the /about kicker bar)                                                                                                                                                                             | label 4.5:1 (dark `--button-bg`, `--button-secondary-bg`) |
| `--theme-shadow-color`, `--theme-text-shadow-color`, `--shadow-*`, `--button-shadow*`, `--text-shadow-*`, `--text-shadow-root`           | the shadow ink (dark `var(--theme-paper-dark-color)`, light `var(--theme-ink-light-color)`) at the old alphas; `--text-shadow-root` mixes the inverted primary with `--theme-primary-color` (was the palette name `--primary-default`)                                                                                                                                                         | decorative                                                |
| `accent-color` (`:root` property)                                                                                                        | `var(--theme-accent-color)`                                                                                                                                                                                                                                                                                                                                                                    | —                                                         |

Also folded in: `globals/_button.scss` / `tokens/_button-mixins.scss` Sass `rgba()`s (white / light greys → the light paper, black / shadow navies → the shadow ink, same alphas) and the `globals/_texts.scss` title rule, link focus shadow, `p` / `blockquote` shadows and blockquote ground (alphas of `--theme-border-strong-color`, `--theme-text-secondary-color`, `--theme-secondary-color`, `--theme-ink-color`).

**Retired** (no reader; archived): `--theme-primary-action-color`, `--theme-main-secondary-color`, `--theme-main-background-accent-color`, `--theme-teal-signal-color`, `--theme-default-{white,black,grey}-color` with `--foundation-white` / `--foundation-black` (Foundation reads its Sass `$white` / `$black`), `--theme-button-border-color` (`$buttonBorder` in the archived PrimeVue v3 `mytheme` read `--theme-primary-color`), `--rgb-white`, `--rgb-neon`, `--rgb-shadow`, `--rgb-shadow-alt`. They are `retired` in the rename map, so an old key passed to the theme API is dropped with a dev warning.

The per-mode defaults `--theme-paper-{light,dark}-color`, `--theme-ink-{light,dark}-color`, `--theme-<c>-{light,dark}{,-background}-color`, `--theme-primary-fill-{light,dark}-color`, `--theme-primary-ink-{light,dark}-color`, `--theme-secondary-ink-{light,dark}-color`, `--theme-<status>-ink-{light,dark}-color`, `--theme-{primary,secondary}-wash-{light,dark}-color`, `--theme-link-{light,dark}-color`, `--theme-{secondary-fill,secondary-inverted,primary-sheen}-{light,dark}-color` and `--theme-button-fg-dark-color` are hexes by design: they are the generated variation defaults (`_variations.generated.scss`) the runtime overrides (rule-3 guard allowlist).

**Guard.** `theme/core/tests/five-input-colors.spec.ts`: Sass, CSS and JS agree; every derived pair passes AA in both modes for the default pairs, including the status inks built from the Task 3 status variations; other paper / ink pairs (and their inverse) pass every `checkPaperInk` row — text and secondary text ≥ 4.5:1 on page, surface and variant, control borders ≥ 3:1 on page and surface, and the four status inks ≥ 4.5:1 on page, surface and variant (built from the default status sources for that pair) — except dark-mode borders on pure black paper, which Style Studio flags; alpha variants exist; derived roles are never inline. `tests/inline-writers.spec.ts`: the mode writers pin no colour and the raw path moves old names to new ones.

## Contrast roles

Brand roles are for **fills** (`--theme-{primary,secondary,accent}-color` reach 3:1). Text never paints a main variation — it uses an `-ink` role or the link / text roles (guarded in `core/web` and `core/admin` `tests/colors-scss.spec.ts`). Text, focus and controls use these accessible roles (Sass `$css-*` in `tokens/_colors.scss` → `globals/_root.scss` → `src/colors.json` `cssVariables` → `darkCssVariables` / `lightCssVariables`). `theme/core/tests/contrast-roles.spec.ts` fails if a value drops below its minimum.

| CSS variable                                              | Dark                  | Light                 | Use                                                                                                | Minimum                                                                                                 |
| --------------------------------------------------------- | --------------------- | --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `--theme-focus-ring-color`                                | `#ffb38f`             | `#b83f16`             | Every focus outline (PrimeVue, Foundation, buttons)                                                | 3:1 on `--theme-main-background-color` and `--theme-surface-color`                                      |
| `--theme-link-color`                                      | `#e96a72`             | `#883412`             | Inline links (also core/web's `--portfolio-rose-color`), active nav underline, “Read the story →”  | 4.5:1 on page, secondary page, surface and variant, and on its own 12 % / 16 % wash (`buildLinkTokens`) |
| `--theme-border-strong-color`                             | `#7a675e`             | `#8a7870`             | Inputs, toggles, outline buttons (also the form border)                                            | 3:1 on `--theme-surface-color`                                                                          |
| `--theme-primary-fill-color` / `--theme-on-primary-color` | `#be1c26` / `#faf6f3` | `#be4919` / `#faf6f3` | Solid primary buttons; the label is the light paper and the fill is moved until it reads           | 4.5:1                                                                                                   |
| `--theme-primary-ink-color`                               | `#e65059`             | `#a33e16`             | Brand-coloured text: eyebrows, `dt` labels, hover / current states, tabs, outline and text buttons | 4.5:1 on page, secondary page, surface and variant                                                      |
| `--theme-secondary-ink-color`                             | `#a17e68`             | `#6e1622`             | Secondary-coloured text: list markers, table headers, `dl dt`, column and diagram group labels     | 4.5:1 on page, secondary page, surface and variant                                                      |
| `--theme-success-ink-color`                               | `#579f9e`             | `#146060`             | Success text and icons                                                                             | 4.5:1 on page, secondary page, surface and variant (warning / info inks too; recomputed on paper / ink) |
| `--theme-error-ink-color`                                 | `#de704a`             | `#a23713`             | Error text, invalid-field messages and borders (`--theme-form-invalid-color`)                      | same                                                                                                    |
| `--theme-{primary,secondary}-wash-color`                  | `#6e1016` / `#382b23` | `#f6cab8` / `#f3c3ca` | Hover / active washes (24 %) behind primary-ink text on outline, ghost and text buttons            | primary-ink 4.5:1 on the wash over every text ground                                                    |

Personalization never writes `--theme-focus-ring-color` at runtime (it used to copy the brand primary, 2.7:1 on the dark ground). `--theme-border-color` stays an 8 % hairline for decorative dividers only.

### Focus rings

One recipe, two mixins (`tokens/_focus.scss`; forwarded by `tokens/_index.scss` for standalone sheets and by `_nuxt-auto.scss` for Vue SFCs):

| Mixin                           | Emits                                                                                                                                              | Use                                                                                                                                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus-ring($offset: 2px)`      | `outline: 2px solid var(--theme-focus-ring-color); outline-offset: $offset`                                                                        | Every link, text field and custom control. `-2px` draws it inset, for a control inside a box that clips its overflow.                                                                                                                                               |
| `focus-ring-shadow($shadow...)` | `outline: 2px solid transparent; outline-offset: 2px; box-shadow: $shadow` and, under `@media (forced-colors: active)`, `outline-color: Highlight` | The buttons' 3px glow (`button-base` / `button-theme`, the file button, `UiButton`). Forced-colors mode drops box-shadows; the outline is repainted. Never transition `outline-color` on these controls: the transparent outline would fade in from `currentcolor`. |

Rules:

- **Never `outline: none`** without drawing the ring some other way that survives forced colours (`theme/core/tests/focus-rings.spec.ts` fails on any `outline: none` / `0` in the theme). A box-shadow alone disappears in Windows High Contrast (WCAG 2.4.7).
- **Focus never lowers contrast.** Text fields (native and PrimeVue) keep their resting `--theme-border-strong-color` border (≥ 3:1) on focus and add the standard ring — no alpha-mixed border or 1px 33 % ring (WCAG 1.4.11). The `.p-password` / `.p-inputnumber` wrappers draw no second ring; their inner `.p-inputtext` does.
- **Always the focus role**, never the brand primary (≈ 2.7:1 on the dark page): `AppPrimaryNav` "On view", the About résumé chip and contact link use `focus-ring` (guarded by `core/web/tests/focus-rings.spec.ts`).
- PrimeVue buttons and controls draw `semantic.focusRing` (`src/primevue.ts`: 2px solid `--theme-focus-ring-color`, offset 2px) — an outline, so it already survives forced colours. `UiButton` (both branches) draws the native buttons' ring: `focus-ring-shadow` — the 3px glow plus a transparent outline for forced colours (one ring, not an outline stacked on the glow).
- `scripts/scss-units-report.mjs` counts the px arguments of `focus-ring` / `focus-ring-shadow` as focus-ring px (allowed).

Replaced rules are archived in `_archive/2026-10-06-review-a11y/`.

### Brand role harmony

Secondary is an **analogous** partner of primary (hand-tuned hex in tokens).
Accent is the **complementary** of primary — Sass `theme-complementary($primary-color-*)` and JS `Color.brandAccent(primary)` / CSS `--theme-accent-color`.
See `CONCEPTS.md`.

### Sass color helpers (`theme-*`)

Compile-time helpers in `tokens/_color-fns.scss`, forwarded from `@tgmc/theme/scss/tokens` and from Nuxt inject entry `_nuxt-auto.scss` (Vue SFC `<style lang="scss">` via Vite `additionalData`).
Names are `theme-`-prefixed to avoid clashing with `sass:color`. Math is Sass-native — outputs may differ from JS `Color.*`. Quality / enhance stay in JS.

**App / Nuxt bridges:** Foundation layout mode keeps ZF palette keys; runtime `--foundation-accent` reads `--theme-accent-color`. PrimeVue Nora preset maps active / highlight accents to `--theme-accent-color` (see `theme/core/src/primevue.ts` and [Palettes and third-party exceptions](#palettes-and-third-party-exceptions)).

| Helper                                                                                                       | Role                                               |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `theme-lighten` / `theme-darken` / `theme-adjust-lightness`                                                  | HSL lightness ± percentage points (`color.adjust`) |
| `theme-add-alpha`                                                                                            | Set alpha (Sass color, not 8-digit hex)            |
| `theme-is-light` / `theme-contrast-ink`                                                                      | Lightness gate + dark/light ink fallbacks          |
| `theme-analogous` / `theme-complementary` / `theme-split-complementary` / `theme-triadic` / `theme-tetradic` | Hue-wheel harmony                                  |
| `theme-contrast-ratio`                                                                                       | WCAG 2 contrast ratio (opaque colors)              |

```scss
@use '@tgmc/theme/scss/tokens' as theme;

$accent-demo: theme.theme-complementary(theme.$primary-color-dark);
$softer: theme.theme-lighten(#808080, 10%);
```

JS mirrors for Personalize: `Color.resolveBrandRoles(primary, overrides?)` and `Color.brandSwatchCatalog()`.

Fill / gradient on-ink pairing remains in `tokens/_contrast.scss` (`fill-lightness`, `dyn-color-against-fill`, `contrast-fill`).

## Sass ↔ JSON ↔ JS sync rule

- **Sass is compile-time source of truth** for token values (`scss/tokens/_colors.scss`, `_variables.scss` → `globals/_root.scss`).
- **Catalog sources** (`theme/core/src/colors_2.json`, `extended-colors.json`) feed the named-color inventory.
- **Generated library** (`theme/core/src/colors.json`) is built by `npm run build:colors` (`bin/build-colors-json.mjs`):
  - Compiles `scss/export/colors-dump.scss` with dart-sass (wide emit of every resolvable `color`-typed `$` token, plus explicit structured routes).
  - Merges catalogs into `named`; **Sass-resolved values win** on conflict.
  - Flat wide map lives at `colors.json.sass` / export `sassColors`.
- **JS modules** (`tokens.ts`, `Color`, `Theme`) bind/export from that JSON — they must not embed hex/rgb literals for inventoried colors. `--theme-button-fg-color` defaults come from `buildButtonInkTokens` (generated into `_variations.generated.scss`); `resolveButtonForeground` remains for `Theme.create` packs.
- When you change a brand/surface hex used at runtime: update Sass first, re-run `build:colors` (or full theme `build`), then pin coverage in `theme/core/tests/tokens-mirror.spec.ts`.
- Do not reverse-generate Sass from JSON.

## Color and Theme singletons

Preferred imports from `@tgmc/theme` (also on `@tgmc/theme/tokens` for Theme):

| API     | Role                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Color` | Create/parse, manipulate (lighten/darken/alpha/harmony), convert (hex/rgb/hsl), look up via `get` / `named` / `lookup` (unknown → `null`)                                |
| `Theme` | Paint via `apply` / `select`; presets; pack helpers (`create` / `list` / `get` / `selected`); mode family; read/subscribe (`getToken` / `getTokens` / `subscribeTokens`) |

### Two modules (Theme + Preferences)

```
┌─────────────────────────────┐
│  Vue adapters (thin)        │  usePersonalization, Style Studio draft,
│                             │  Personalize / Style Studio UIs — reactivity only
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│  Preferences                │  preference document in → painted theme out
│  load / preview / commit /  │  + setups CRUD; owns committed + draft
│  discard / foucScript       │  storage inside (no port)
└─────────────┬───────────────┘
              │ seam (paint only)
┌─────────────▼───────────────┐
│  Theme + Color              │  apply / select / presets / mode
│  (@tgmc/theme)              │  Color: parse / contrast / harmony /
│  (+ read/subscribe)         │  brand roles / AA
└─────────────────────────────┘
```

Domain terms: CONCEPTS.md glossary (**Theme**, **Preferences**, **Committed vs draft**, **Painted theme**, …). Product surfaces: [personalization.md](../web/features/personalization.md).

### Public Theme surface

Preferences and apps paint with **`Theme.apply`** (token map or `ThemeDefinition`; bridges default on). Ready-made packs use `Theme.select` / `Theme.presets` / `Theme.preset`. Mode: `initMode` / `setMode` / `getMode` / `getResolvedMode` / `subscribeMode` (and related). Read/subscribe: `getToken` / `getTokens` / `subscribeTokens`. Pack helpers (`create` / `list` / `get` / `selected` / `applyModeVariables` / `reset`) stay on the Theme object for select-time use. `Color` remains on the `@tgmc/theme` main entry.

`@tgmc/theme/tokens` re-exports **Theme** (+ types), read/subscribe, pack helpers, and mode — **not** top-level registry writers (`updateTokens` / `updateToken` / `setTokens`). Callers use `Theme.apply` / `Theme.set` / `Theme.reset`.

```ts
import { Color, Theme } from '@tgmc/theme';

Color.create('#ac1922'); // throws if invalid; Color.parse returns null
Color.get('primary', 'dark'); // theme role — unknown → null
Color.named('darkAmethyst'); // palette / base / role / named catalog — unknown → null
Color.named('aliceblue'); // extended catalog
Color.harmony('#d9531d');

Theme.get('light'); // snapshot — unknown → undefined
Theme.select('dark', { dryRun: true }); // unknown select throws
Theme.apply(
  {
    colors: { primary: '#ac1922', secondary: '#8a6a56' },
    text: { color: '#f2ece8', secondary: '#baa8a0' },
    ratios: { media: '16 / 9', card: '16 / 9', surface: '16 / 9' },
    breakpoints: { current: '1440px' },
  },
  { dryRun: true }
);
Theme.apply({ '--media-ratio': '16 / 9' }, { dryRun: true });
```

Runtime ratio/breakpoint keys (aligned with `_root.scss`): `--surface-ratio`, `--card-ratio`, `--media-ratio`, `--breakpoint` (plus optional `--breakpoint-mobile` … `--breakpoint-ultrawide` when set via Theme). These layout tokens live in Sass media queries and `Theme.apply` / pack helpers — they are **not** part of the light/dark JS mode maps (`getCssVariablesForMode`), so mode switches do not clobber viewport-owned values.

### Colour-mode storage (opt-in)

Theme stores the mode preference only when asked: `initThemeMode({ storageKey })` (`Theme.initMode`) enables storage under that key, and there is **no default key**. With a key, init restores the stored preference (falling back to `preference`), `setThemeMode(next)` writes it unless `{ persist: false }`, and `system` removes it. Without a key, init uses `preference` as-is and neither function reads or writes storage, whatever `persist` says. The portfolio does not opt in: Preferences owns the colour mode in `tgmc-preferences` ([personalization.md](../web/features/personalization.md)).

`Theme.select('light'|'dark')` replaces the registry with the mode's **non-colour** tokens — colours stay with the stylesheet (colour-system stage 3). Named palette packs (`midnightMagic`, …) are **accent packs**: `select` merges brand-role keys onto the current registry and does not replace surfaces/text. Use `Theme.applyModeVariables` / `Theme.set` when you need a full replace. The Nuxt plugin exposes bridge-bound `api.theme` on `$themeTokens` (PrimeVue/foundation writes default on). Personalize / Style Studio paint via Preferences → `Theme.apply` / `Theme.remove` — see [personalization.md](../web/features/personalization.md).

### Sass inject / Nuxt parity

Vue SFC `<style lang="scss">` receives `theme/scss/_nuxt-auto.scss` via Vite `additionalData` (variables, colors, **`theme-*` color-fns**, button mixins). Standalone sheets `@use` explicitly. Foundation's `--foundation-*` names read the theme colours (`--foundation-accent` → `--theme-accent-color`). After changing theme `src/`, run `npm run build --workspace=@tgmc/theme` so consumers resolve `dist`.

## Palette and quality helpers

Lower-level modules `color-palette.ts` and `color-quality.ts` remain exported (`createColorPalette`, `analyzeColorQuality`, `calculateContrastRatio`, `MAX_ANALOGOUS_COUNT`, …). Prefer `Color.harmony` / `Color.quality` when writing new code. Tests: `theme/core/tests/*.spec.ts`.

App-global breakpoints (`core/web/assets/css/_globals.scss`) use `bp-down()` / `bp-up()` (em, range syntax) — no raw `max-width` queries; the primary nav wraps below `standard` (1080px). Work Related links reuse `.page-nav` (sticky aside from tablet up; on phones a labelled "Related · <current>" disclosure — no sideways rail) via `AppWorkSubNav`
