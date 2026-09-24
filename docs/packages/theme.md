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

The web app now owns document shell structure (`html`/`body`/`#site_page`) in `core/web/assets/css/_layout.scss`.
App-specific portfolio chrome (work cards, case studies, gallery) lives in `core/web/assets/css/portfolio-launch.scss` and consumes the theme tokens above.

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

| Attribute           | Use                                                             | Horizontal                                                     | Vertical                                                        |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| `data-fit="screen"` | Home, work index, product, styles, gallery, code, media, AI Lab | Full width within `--page-pad` (`--page-screen-max`)           | `--page-fill-min`; heroes ≈ 72–85% of fill                      |
| `data-fit="prose"`  | About, blog, docs, process, case studies                        | Shell uses `--page-shell-max`; body/`prose` uses `--prose-max` | Same `--page-fill-min` so short pages still occupy the viewport |

### Page-fit tokens

| Token               | Role                                                          |
| ------------------- | ------------------------------------------------------------- |
| `--page-pad`        | Inline padding on `.page-content`                             |
| `--page-shell-max`  | Max width for reading / default rail shells                   |
| `--page-screen-max` | Max width for immersive (`screen`) pages                      |
| `--prose-max`       | Readable measure for body regions under `data-fit="prose"`    |
| `--page-chrome`     | Sticky header allowance subtracted from fill                  |
| `--page-fill-min`   | `calc(100dvh - var(--page-chrome))` so short pages still fill |

Tokens live on `:root` in `globals/_root.scss` and scale per breakpoint. Split pages (`.page-with-nav`) span the shell; the reading column stays in `--prose-max`.

Pages opt in on the root `.page-content` element (`data-fit="screen"` | `"prose"`). Contract tests: `core/web/tests/page-fit.spec.ts`.

## Landscape ratios (horizontal screens)

| Token             | Portrait / narrow | Landscape | Ultrawide landscape |
| ----------------- | ----------------- | --------- | ------------------- |
| `--media-ratio`   | `4 / 3`           | `16 / 9`  | `16 / 9`            |
| `--card-ratio`    | `5 / 4`           | `16 / 10` | `16 / 9`            |
| `--surface-ratio` | `5 / 4`           | `16 / 10` | `21 / 9`            |

Applied to **media frames** only:

- Theme: `[data-region='media']`, `.card-media`, and `figure > img|video` in `_container.scss`
- App: work-card media (column layouts), gallery exhibit/frame, artifact / case-study images, image-led gallery tiles

Text containers (work-card copy, principle/evidence tiles, feed cards, prose sections) **size to their content**. Landscape preference is side-by-side layout (grid/flex), not a card-level `aspect-ratio` that clips copy.

## Content must fit containers

When changing layout SCSS or card templates:

1. Prefer `min-width: 0`, `max-width: 100%`, and `minmax(0, …)` grid tracks so flex/grid children can shrink.
2. Put `aspect-ratio` on the **media box** (or the image), never on a text-heavy card that also uses `overflow: hidden`.
3. Media inside a fixed frame uses `object-fit: cover` (or `contain` for diagrams); captions stay outside the ratio box.
4. Portfolio shell helpers in `portfolio-launch.scss` wrap long words (`overflow-wrap`) and cap media at `max-width: 100%`.

## Brand roles vs hue scale

`tokens/_colors.scss` separates:

| Kind            | Sass                                                                                                                                                                       | CSS                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Brand roles** | `$primary-color-*` / `$secondary-color-*` / `$accent-color-*` (ember / crimson)                                                                                            | `--primary-color`, `--secondary-color`, `--accent-color`, `--focus-ring`               |
| **Hue scale**   | `$navy-*`, `$azure-dark`, `$forest-*`, `$oxblood-*`, `$violet-*`, `$wine-*`, `$sea-*`, `$olive-*`, `$plum-*` / `$tangerine-dark`, `$taupe-*`, `$ink-*` / `$parchment-dark` | `--tertiary-color` … `--denary-color` (compatibility **hue aliases**, not brand roles) |

Portfolio signal teal is `--portfolio-teal` (and `--success`); do not overwrite chroma `--color-teal` / `$css-teal-*`. Applied controls: About Digital CV résumé button (`.about-cv__resume`), Gallery view/like stats (`.gallery-grid__stats` / `.gallery-feed-card__stats`), and Code language tags (`.code-page__lang`). Surfaces/text/borders keep existing keys (`--main-background`, `--surface-color`, `--text-color`, `--border-color`).

Personalization accents (`ember` / `crimson`) live in `core/web/shared/personalization.ts` and rebind brand CSS vars per resolved light/dark mode.

## Sass ↔ JS sync rule

- **Sass is compile-time source of truth** for token values (`scss/tokens/_colors.scss`, `_variables.scss` → `globals/_root.scss`).
- **JS mirrors** live in `theme/core/src/tokens.ts` (`themeColors`, `palettes`, `lightCssVariables` / `darkCssVariables`) for runtime personalization and Theme packs.
- When you change a brand/surface hex or a `:root` key used at runtime, update Sass first, then the JS mirror, then pin coverage in `theme/core/tests/tokens-mirror.spec.ts`.
- Do not generate JS from Sass in this package yet — manual sync + tests.

## Color and Theme singletons

Preferred imports from `@tgmc/theme` (also on `@tgmc/theme/tokens` for Theme):

| API     | Role                                                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Color` | Create/parse, manipulate (lighten/darken/alpha/harmony), convert (hex/rgb/hsl), look up base/semantic/role/palette colors                      |
| `Theme` | Ready-made pack `list` / `get` / `select` / `create`; `update` / `set`; grouped `setText` / `setRatios` / `setBreakpoints`; thin mode wrappers |

```ts
import { Color, Theme } from '@tgmc/theme';

Color.create('#ac1922'); // throws if invalid; Color.parse returns null
Color.get('primary', 'dark'); // theme role
Color.harmony('#d9531d');

Theme.select('dark', { dryRun: true });
Theme.create('studio', {
  colors: { primary: '#ac1922', secondary: '#8a6a56' },
  text: { color: '#f2ece8', secondary: '#baa8a0' },
  ratios: { media: '16 / 9', card: '16 / 10', surface: '21 / 9' },
  breakpoints: { current: '1440px' },
});
Theme.setRatios({ media: '16 / 9' });
```

Runtime ratio/breakpoint keys (aligned with `_root.scss`): `--surface-ratio`, `--card-ratio`, `--media-ratio`, `--breakpoint` (plus optional `--breakpoint-mobile` … `--breakpoint-ultrawide` when set via Theme). These layout tokens live in Sass media queries and `Theme.setRatios` / `Theme.setBreakpoints` — they are **not** part of the light/dark JS mode maps (`getCssVariablesForMode`), so mode switches do not clobber viewport-owned values.

`Theme.select('light'|'dark')` applies the full CSS variable map. Named palette packs (`midnightMagic`, …) are **accent packs**: `select` merges brand-role keys (including `--button-fg`) onto the current registry and does not replace surfaces/text. Use `Theme.applyModeVariables` / `Theme.set` when you need a full replace. The Nuxt plugin exposes bridge-bound `api.theme` on `$themeTokens` (PrimeVue/foundation writes default on) alongside low-level `updateTokens` (personalization accents still use the low-level path).

## Palette and quality helpers

Lower-level modules `color-palette.ts` and `color-quality.ts` remain exported (`createColorPalette`, `analyzeColorQuality`, `calculateContrastRatio`, `MAX_ANALOGOUS_COUNT`, …). Prefer `Color.harmony` / `Color.quality` when writing new code. Tests: `theme/core/tests/*.spec.ts`.

Home / nav chrome breakpoints in `portfolio-launch.scss` use Sass `$breakpoint-*` (stack Home hero and wrap the five-link primary nav below `$breakpoint-standard` = 1080px). Work Related links reuse `.page-nav` (sticky aside from tablet up; compact horizontal rail on small viewports) via `AppWorkSubNav`.
