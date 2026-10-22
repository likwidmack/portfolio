# @tgmc/nuxt-layer-base

Standard Nuxt 4 base layer for applications in the `@tgmc` monorepo.

## Features

- **Accessibility Baseline**: Preconfigured `@nuxt/a11y` with axe-core (WCAG 2.2 AA), `<UiSkipLink />`, `<UiAnnouncer />`, and `useA11yAnnouncer()`.
- **Theme Tokens**: Automatic injection of `@tgmc/theme` SCSS mixins and CSS custom properties (`--theme-*-color`, `--touch-target`, etc.) into Vue SFC styles.
- **Universal Utilities**: import SSR-safe helpers explicitly from `@tgmc/utilities/universal` (the layer auto-imports none).
- **Icon Support**: Preconfigured `@nuxt/icon` with Lucide inline SVG.

## Usage

In any child Nuxt application `nuxt.config.ts`:

```typescript
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  extends: ['@tgmc/nuxt-layer-base'],
});
```
