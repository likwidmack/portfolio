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

## `:root` hygiene

- Keep **variables** on `:root` — not font-smoothing, vendor text-shadow prefixes, or decorative shadows.
- Font smoothing lives on `html`; default text shadow uses `--text-shadow-root` on `body`.
- Space / radius / blur / transition / shadow CSS vars mirror Sass tokens (`--space-*`, `--border-radius-*`, `--blur-*`, etc.).

## Opt-in surface classes

| Class              | Use                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `.theme-wallpaper` | Conic brand tile background (also default on `body`)                                      |
| `.theme-motion`    | Soft color/shadow transitions (also default on `body`; respects `prefers-reduced-motion`) |
| `.site-chrome`     | Glass bar finish for sticky header/footer (`site.vue` applies this)                       |
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

Drop shadows share one scale on `:root` (brand ink via `--rgb-shadow`):

| Token         | Use                                       |
| ------------- | ----------------------------------------- |
| `--shadow-sm` | Soft surfaces, light lifts                |
| `--shadow-md` | Panels, toasts, figures, tables, chrome   |
| `--shadow-lg` | Overlays / menus (e.g. primary nav panel) |

App aliases: `--portfolio-shadow-sm|md|lg` → theme tokens. Focus rings and decorative insets stay separate from this elevation scale. Buttons keep `--button-shadow*`.

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

| Kind            | Sass                                                                                                                                                                       | CSS                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Brand roles** | `$primary-color-*` / `$secondary-color-*` / `$accent-color-*` (primary ember; secondary analogous; accent complementary)                                                   | `--primary-color`, `--secondary-color`, `--accent-color` (focus: see Contrast roles)   |
| **Hue scale**   | `$navy-*`, `$azure-dark`, `$forest-*`, `$oxblood-*`, `$violet-*`, `$wine-*`, `$sea-*`, `$olive-*`, `$plum-*` / `$tangerine-dark`, `$taupe-*`, `$ink-*` / `$parchment-dark` | `--tertiary-color` … `--denary-color` (compatibility **hue aliases**, not brand roles) |

Portfolio signal teal is `--portfolio-teal` (and `--success`); do not overwrite chroma `--color-teal` / `$css-teal-*`. Applied controls: About Digital CV résumé button (`.about-cv__resume`), Gallery view/like stats (`.gallery-grid__stats` / `.gallery-feed-card__stats`), and Code language tags (`.code-page__lang`). Surfaces/text/borders keep existing keys (`--main-background`, `--surface-color`, `--text-color`, `--border-color`).

The web app must not re-own those hexes in `core/web/assets/css/_variables.scss`. Inventory / gate: `node scripts/measure-app-scss.mjs` (`duplicate_color_sot`). Atmosphere chrome (`--portfolio-haze-*`, particles, rose) keeps app names but mixes from theme tokens — see [App SCSS](../web/features/app-scss.md) and `CONCEPTS.md` (Duplicate color SoT / Theme-derived chrome).

Personalization brand roles live in `core/web/shared/personalization.ts` (storage `tgmc-brand-roles`). Studio presets (`Theme.presets()` / `theme-presets.json`) are palette collections plus Light/Dark pairs in `colors.json` `sass`. Each preset derives primary, secondary, and accent from that source, plus a background triad (extra swatches, or the same roles when the source has no extras). Secondary is an analogous step (60°, then 48°, then 36°). Colorfulness is saturation scaled by distance from black and white. When blackness is larger than whiteness and beats that colorfulness, the hue swings negative and the partner is lighter. When whiteness is larger and beats colorfulness, the hue swings positive and the partner is darker. A saturated mid color searches both directions. The other direction is a fallback when the preferred step cannot clear contrast. Applying a preset adjusts the brand triad against paper (≥ 3:1) and the background triad against ink (≥ 4.5:1). Named **style setups** (`tgmc-style-setups`) apply via Personalize quick-apply or Style Studio (`/styles`). Deep role / motion / background editing is on Style Studio; Personalize stays thin (mode + apply + Open studio). See [web/features/personalization.md](../web/features/personalization.md).

## Style layers and units

Styles live in the layer they belong to — top is universal, bottom is most specific. Plan: 2026-09-24 SCSS hierarchy and units.

| Layer               | Where                              | Owns                                                                                                                                                                    | Must not                                                               |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1 Theme (universal) | `theme/core/scss`                  | Tokens (color, type, space, radius, shadow, breakpoints, floors), reset, base type, primitives (buttons, forms, tabs), utilities, PrimeVue / Foundation bridges, mixins | Reference app ids, routes or components                                |
| 2 App global        | `core/web/assets/css`              | App tokens (`--portfolio-*`), cross-page selectors (prose, skip link, focus), app mixin recipes                                                                         | Page / component selectors; re-declare theme tokens                    |
| 3 Layout            | `core/web/app/layouts`             | Page shell, header / footer chrome, layout modifiers                                                                                                                    | Page selectors                                                         |
| 4 Page              | `core/web/app/pages` (scoped)      | Page composition                                                                                                                                                        | Restyle child internals with `:deep()` — use props / custom properties |
| 5 Component         | `core/web/app/components` (scoped) | Its own box and internals; container queries                                                                                                                            | Global selectors (teleported dialogs: one named global class)          |

**Files:** long, scrolling style blocks go in an external sheet beside the `.vue` (`<style lang="scss" scoped src="./Name.scss">`); short blocks stay inline.

**Pages (layer 4).** Scoped only. A child component's **root** element carries the page's scope, so the page can size it without `:deep()`; anything inside a component is the component's job — add a prop / variant instead (`AppWorkCard layout="row"`, `AppBrowseToolbar inline`, `AppPageNav embedded`). The one exception is rendered markdown (`/blog/[slug]`, `/docs/[...slug]`), which isn't a component. Guarded by `core/web/tests/pages-scss.spec.ts`.

**Box-driven layouts use container queries.** When a layout depends on the width of its own box rather than the screen — the /work card row, the /code reader's side list, the blog feature card, an `alternate` timeline — use `container-type: inline-size` on the box (or its list) and `@container (width >= …rem)`. A viewport breakpoint would give a 768px tablet the desktop split with a cramped column. Don't put `container-type` on an element that sizes to its content (an auto grid track, a shrink-to-fit or `fit-content` box): inline-size containment collapses it. Where a switch is really a device-class decision (the browse toolbar's segments ↔ pickers, the Style Studio workbench in a `fit-content` region), keep a viewport query written as an exact range pair — `@media (width <= #{$breakpoint-tablet})` / `(width > …)` — so 768px keeps the tablet layout and exactly one rule applies.

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

## Touch and type floors

Repo UI rule: every change covers **responsive · accessible · touch** (`docs/agents/README.md`). The theme owns the floors so pages don't re-size controls one by one.

| Token / helper                                                 | Value   | Use                                                                                                                       |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--touch-target`                                               | `44px`  | Minimum height (and width for icon-only) of every control. `--form-control-height` is `max(var(--touch-target), 2.5rem)`. |
| `--type-min`                                                   | `12px`  | No text renders smaller. `--font-size-xs` and the app's eyebrow / meta mixins are floored with it.                        |
| `@include touch-target($display: inline-flex, $square: false)` | mixin   | `globals/_mixins.scss`; forwarded by the app's `assets/css/_mixins.scss`.                                                 |
| `@include font-size-floor($size)`                              | mixin   | `font-size: max(var(--type-min), $size)`.                                                                                 |
| `.touch-target`, `.back-link`                                  | classes | `globals/_class-selectors.scss` — for templates without their own styles.                                                 |

Built in: theme buttons (`.btn`, `button-size-sm`), PrimeVue tabs, page-nav links, checkbox / radio / switch labels (`label:has(input)`, `input + label`) and small PrimeVue text (`.p-badge`, `.p-tag`, `.p-progressbar-label`). Nora’s default badge/progress label size is `0.625rem` (10px); `themePrimeVuePreset` floors those tokens to `max(var(--type-min), 0.75rem)` so styled-mode CSS vars stay readable (`theme/core/src/primevue.ts`, guarded by `tests/primevue-type-floors.spec.ts`). Phone body text stays **16px** (`--font-size-default` no longer drops ×0.75 below 768px). Page-nav links keep a visible focus ring.

### Archive, don't delete

Replaced styling moves to `theme/core/scss/_archive/<date>-<slug>/` (mirrors the repo path; `.vue` files keep only their old `<style>` block) with a README of what changed. Nothing in `_archive/` is imported, compiled or shipped. Current: [`_archive/2026-09-24-pre-a11y/`](https://github.com/likwidmack/portfolio/tree/main/theme/core/scss/_archive/2026-09-24-pre-a11y).

## Five-input colour model

The app sets five colours; the theme derives the rest.

| Input                      | CSS                                                      | Default                          |
| -------------------------- | -------------------------------------------------------- | -------------------------------- |
| Primary, secondary, accent | `--primary-color`, `--secondary-color`, `--accent-color` | brand pack (Style Studio)        |
| Paper (background)         | `--paper`                                                | light `#faf6f3` · dark `#0f0908` |
| Ink (foreground / pen)     | `--ink`                                                  | light `#0f0908` · dark `#faf6f3` |

**Pen & paper per mode.** Paper is always the background and ink always the foreground. Each mode has its own pair (Sass `$light-paper` / `$light-ink`, `$dark-paper` / `$dark-ink`; the light pair is set in `theme-light-vars`). Dark mode's default pair is light mode's, inverted. In JS: `DEFAULT_PAPER_INK`, `invertPaperInk()`.

**Neutral scale.** `--neutral-0` (paper) … `--neutral-1000` (ink): `color-mix(in oklab, var(--ink) N%, var(--paper))` with steps 25, 50, 75, 100, 150, 200, 300, 400, 450, 500, 550 … 900, 925, 950, 975. It follows the active pair, so step 0 is always the background. Legacy `--gray-*` names alias the nearest step per mode.

**Alpha variants.** `--paper-a<N>` / `--ink-a<N>` = the colour at N % over transparent (N = 4, 8, 12, 16, 24, 32, 48, 64, 80, 90; `PAPER_INK_ALPHA_STEPS`). Use them for hairlines, scrims and washes; they follow the active mode.

**Roles pick steps per mode** (`NEUTRAL_ROLE_STEPS` in `src/paper-ink.ts`):

| Role                                             | Dark       | Light      |
| ------------------------------------------------ | ---------- | ---------- |
| `--main-background`                              | 0          | 0          |
| `--main-background-secondary`, `--surface-color` | 50         | 50         |
| `--surface-variant`                              | 75         | 100        |
| `--text-color`                                   | 975        | 950        |
| `--text-secondary-color`                         | 700        | 700        |
| `--border-strong` (controls)                     | 450        | 500        |
| `--border-color` (hairline)                      | `--ink-a8` | `--ink-a8` |

**Status tones.** Success, warning, error and info keep a fixed hue per mode (`--success` …). `--<status>-ink` (text / borders) is the hue mixed toward `--text-color` just enough for ≥ 4.5:1 on page, surface, variant and the tinted surface — dark: success 80 %, warning 100 %, error 80 %, info 90 %; light: success 100 %, warning 70 %, error 90 %, info 100 %. `--<status>-border` = the ink tone; `--<status>-surface` = 14 % hue over the surface. `--danger-ink` = `--error-ink`.

**Where the maths lives.** CSS derives at runtime (`globals/_root.scss`), so a live `--paper` / `--ink` change reaches every child. Sass computes the same defaults (`tokens/_colors.scss`: `neutral($step, $mode)`, `tone()`) for `colors.json`, the TS mirror and the Foundation / PrimeVue bridges. `src/color-mix.ts` (`mixOklab`, `contrastHex`) mirrors it in JS. Derived roles are **never written inline** (`DERIVED_ROLE_TOKENS`, `getInlineTokensForMode`) — an inline hex would pin the default. Read a painted value with `resolveCssColorToHex()` (`core/web/shared/utils/resolve-css-color.ts`), not `getPropertyValue`.

**Runtime API.** `Theme.create(name, { colors: { primary, secondary, accent, paper, ink } })`. `background` / `surface` / `text` overrides still work but are deprecated. `Theme` no longer overrides `--focus-ring` with the primary (the focus ring is a contrast role).

**Checking a pair.** `checkPaperInk(pair, mode)` returns text, secondary text (≥ 4.5:1 on page, surface and variant) and control borders (≥ 3:1). Style Studio shows it live. Very dark papers (pure `#000`) crush the OKLab steps, so borders can dip under 3:1 — the check flags it.

**Theme washes follow the roles.** Container / aside / helper washes use `color-mix(in srgb, var(--surface-color) N%, transparent)` rather than build-time `light-dark()` hexes, so they follow paper / ink too (archive: `scss/_archive/2026-09-24-studio-paper-ink/`).

**Guard.** `theme/core/tests/five-input-colors.spec.ts`: Sass, CSS and JS agree; every derived pair passes AA in both modes (also for other paper / ink pairs and their inverse); alpha variants exist; derived roles are never inline.

## Contrast roles

Brand roles are for **fills**. Text, focus and controls use these accessible roles (Sass `$css-*` in `tokens/_colors.scss` → `globals/_root.scss` → `src/colors.json` `cssVariables` → `darkCssVariables` / `lightCssVariables`). They are additive: no existing variable was removed. `theme/core/tests/contrast-roles.spec.ts` fails if a value drops below its minimum.

| CSS variable                      | Dark               | Light              | Use                                                                    | Minimum                                          |
| --------------------------------- | ------------------ | ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `--focus-ring`                    | `#ffb38f`          | `#b83f16`          | Every focus outline (PrimeVue, Foundation, buttons)                    | 3:1 on `--main-background` and `--surface-color` |
| `--link-color`                    | `#f0876a`          | `#a8360e`          | Inline links, active nav underline, “Read the story →”                 | 4.5:1 on `--main-background`                     |
| `--border-strong`                 | `#7a675e`          | `#8a7870`          | Inputs, toggles, outline buttons; `--form-border-color` now aliases it | 3:1 on `--surface-color`                         |
| `--primary-fill` / `--on-primary` | `#ac1922` / `#fff` | `#b83f16` / `#fff` | Solid primary buttons where white text must read                       | 4.5:1                                            |
| `--success-ink`                   | `#3fb5ad`          | `#146060`          | Success text and icons                                                 | 4.5:1 on `--main-background`                     |
| `--danger-ink`                    | `#f26b4b`          | `#b33a0f`          | Error text, invalid-field messages                                     | 4.5:1 on `--main-background`                     |

Personalization no longer writes `--focus-ring` at runtime (it used to copy the brand primary, 2.7:1 on the dark ground). `--border-color` stays an 8 % hairline for decorative dividers only.

### Brand role harmony

Secondary is an **analogous** partner of primary (hand-tuned hex in tokens).
Accent is the **complementary** of primary — Sass `theme-complementary($primary-color-*)` and JS `Color.brandAccent(primary)` / CSS `--accent-color`.
See `CONCEPTS.md`.

### Sass color helpers (`theme-*`)

Compile-time helpers in `tokens/_color-fns.scss`, forwarded from `@tgmc/theme/scss/tokens` and from Nuxt inject entry `_nuxt-auto.scss` (Vue SFC `<style lang="scss">` via Vite `additionalData`).
Names are `theme-`-prefixed to avoid clashing with `sass:color`. Math is Sass-native — outputs may differ from JS `Color.*`. Quality / enhance stay in JS.

**App / Nuxt bridges:** Foundation layout mode keeps ZF palette keys; runtime `--foundation-accent` aliases `--accent-color`. PrimeVue Nora preset maps active / highlight accents to `--accent-color` (see `theme/core/src/primevue.ts` and `theme/primevue/.../_palette.scss`).

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
- **JS modules** (`tokens.ts`, `Color`, `Theme`) bind/export from that JSON — they must not embed hex/rgb literals for inventoried colors. Computed `--button-fg` stays in TS via `resolveButtonForeground`.
- When you change a brand/surface hex used at runtime: update Sass first, re-run `build:colors` (or full theme `build`), then pin coverage in `theme/core/tests/tokens-mirror.spec.ts`.
- Do not reverse-generate Sass from JSON.

## Color and Theme singletons

Preferred imports from `@tgmc/theme` (also on `@tgmc/theme/tokens` for Theme):

| API     | Role                                                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Color` | Create/parse, manipulate (lighten/darken/alpha/harmony), convert (hex/rgb/hsl), look up via `get` / `named` / `lookup` (unknown → `null`)      |
| `Theme` | Ready-made pack `list` / `get` / `select` / `create`; `update` / `set`; grouped `setText` / `setRatios` / `setBreakpoints`; thin mode wrappers |

```ts
import { Color, Theme } from '@tgmc/theme';

Color.create('#ac1922'); // throws if invalid; Color.parse returns null
Color.get('primary', 'dark'); // theme role — unknown → null
Color.named('darkAmethyst'); // palette / base / role / named catalog — unknown → null
Color.named('aliceblue'); // extended catalog
Color.harmony('#d9531d');

Theme.get('light'); // snapshot — unknown → undefined
Theme.select('dark', { dryRun: true }); // unknown select throws
Theme.create('studio', {
  colors: { primary: '#ac1922', secondary: '#8a6a56' },
  text: { color: '#f2ece8', secondary: '#baa8a0' },
  ratios: { media: '16 / 9', card: '16 / 9', surface: '16 / 9' },
  breakpoints: { current: '1440px' },
});
Theme.setRatios({ media: '16 / 9' });
```

Runtime ratio/breakpoint keys (aligned with `_root.scss`): `--surface-ratio`, `--card-ratio`, `--media-ratio`, `--breakpoint` (plus optional `--breakpoint-mobile` … `--breakpoint-ultrawide` when set via Theme). These layout tokens live in Sass media queries and `Theme.setRatios` / `Theme.setBreakpoints` — they are **not** part of the light/dark JS mode maps (`getCssVariablesForMode`), so mode switches do not clobber viewport-owned values.

`Theme.select('light'|'dark')` applies the full CSS variable map. Named palette packs (`midnightMagic`, …) are **accent packs**: `select` merges brand-role keys (including `--button-fg`) onto the current registry and does not replace surfaces/text. Use `Theme.applyModeVariables` / `Theme.set` when you need a full replace. The Nuxt plugin exposes bridge-bound `api.theme` on `$themeTokens` (PrimeVue/foundation writes default on) alongside low-level `updateTokens` (Personalize brand roles and FOUC still use the low-level path — see [personalization.md](../web/features/personalization.md)).

### Sass inject / Nuxt parity

Vue SFC `<style lang="scss">` receives `theme/scss/_nuxt-auto.scss` via Vite `additionalData` (variables, colors, **`theme-*` color-fns**, button mixins). Standalone sheets `@use` explicitly. Foundation layout aliases include `--foundation-accent` → `--accent-color`. After changing theme `src/`, run `npm run build --workspace=@tgmc/theme` so consumers resolve `dist`.

## Palette and quality helpers

Lower-level modules `color-palette.ts` and `color-quality.ts` remain exported (`createColorPalette`, `analyzeColorQuality`, `calculateContrastRatio`, `MAX_ANALOGOUS_COUNT`, …). Prefer `Color.harmony` / `Color.quality` when writing new code. Tests: `theme/core/tests/*.spec.ts`.

App-global breakpoints (`core/web/assets/css/_globals.scss`) use `bp-down()` / `bp-up()` (em, range syntax) — no raw `max-width` queries; the primary nav wraps below `standard` (1080px). Work Related links reuse `.page-nav` (sticky aside from tablet up; on phones a labelled "Related · <current>" disclosure — no sideways rail) via `AppWorkSubNav`
