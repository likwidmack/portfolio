# Nuxt Layer Base (`@tgmc/nuxt-layer-base`)

`@tgmc/nuxt-layer-base` is the standard Nuxt 4 base layer for applications in the `@tgmc` monorepo. It establishes shared defaults across accessibility, design tokens, safe utility runtime boundaries, and icons.

## Features

### 1. Accessibility (WCAG 2.2 AA)

- Integrates `@nuxt/a11y` configured with axe-core rule sets (`wcag2a`, `wcag2aa`, `wcag22aa`, `best-practice`).
- Generates Markdown violation reports (`a11y-report.md`) in dev/CI.
- Provides accessible shell components:
  - `<UiSkipLink />`: Offscreen skiplink targeting `#main-content`, revealed on keyboard focus with visible `--theme-focus-ring-color`.
  - `<UiAnnouncer />`: Visually hidden `aria-live` status container.
  - `useA11yAnnouncer()`: Composable to trigger polite or assertive announcements for screen readers.

### 2. Design Tokens & Styling

- Injects `@tgmc/theme` tokens, color variables (`--theme-*-color`), touch-target floors (`--touch-target` $\ge$ 44px), and typography floors (`--type-min` $\ge$ 12px).
- Pre-configures Vite SCSS `preprocessorOptions.scss.additionalData` to auto-inject `theme/core/scss/_nuxt-auto.scss` into Vue SFC `<style lang="scss">` blocks.

### 3. Utility Runtime Boundaries

- Auto-imports no utilities: import SSR-safe helpers explicitly from `@tgmc/utilities/universal` (its exports: `docs/packages/utilities.md`).
- Establishes strict isolation: browser-only helpers (`@tgmc/utilities/browser`) are forbidden in SSR contexts to prevent hydration mismatches and Lambda runtime failures.

### 4. Icons

- Pre-configures `@nuxt/icon` with Lucide inline SVG, bundling server collections to eliminate runtime external requests.

## Usage

In any child Nuxt app `nuxt.config.ts`:

```typescript
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  extends: ['@tgmc/nuxt-layer-base'],
});
```
