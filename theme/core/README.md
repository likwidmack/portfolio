# `@tgmc/theme`

Design tokens and SCSS for the portfolio monorepo.

**Canonical docs:** [`docs/packages/theme.md`](../../docs/packages/theme.md) (Color/Theme APIs, page-fit, ratios, container fit, layer map).

**Floors (repo UI rule: responsive · accessible · touch):** `--touch-target` (44px) and `--type-min` (12px) tokens, `touch-target` / `font-size-floor` mixins and `.touch-target` / `.back-link` classes — see [theme.md § Touch and type floors](../../docs/packages/theme.md#touch-and-type-floors).

**Archive, don't delete:** replaced styling lives in [`scss/_archive/`](scss/_archive/2026-09-24-pre-a11y/README.md) (never imported or compiled).

Runtime helpers: `Color` (parse/manipulate/lookup) and `Theme` (ready-made packs + CSS variable updates) from `@tgmc/theme` / `@tgmc/theme/tokens`.

```bash
# From repo root — rebuild dist after SCSS/token changes
npm run build --workspace=@tgmc/theme
# or prepare the web app so Nuxt resolves theme/core/dist
npm run postinstall
```

Consumers import `@tgmc/theme` / `@tgmc/theme/tokens` (Nuxt maps to `theme/core/dist`).
