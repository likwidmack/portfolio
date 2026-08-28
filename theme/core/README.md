# `@tgmc/theme`

Design tokens and SCSS for the portfolio monorepo.

**Canonical docs:** [`docs/packages/theme.md`](../../docs/packages/theme.md) (page-fit, ratios, container fit, layer map).

```bash
# From repo root — rebuild dist after SCSS/token changes
npm run build --workspace=@tgmc/theme
# or prepare the web app so Nuxt resolves theme/core/dist
npm run postinstall
```

Consumers import `@tgmc/theme` / `@tgmc/theme/tokens` (Nuxt maps to `theme/core/dist`).
