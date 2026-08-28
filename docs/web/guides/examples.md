# Code Examples

Practical examples for common tasks.

## CDN Usage

### Vue Component

```vue
<script setup lang="ts">
const { cdnUrl, resolvePath, isEnabled } = useCdn();
const heroImage = resolvePath('/images/hero.webp');
const icon = resolvePath('/images/icon.svg');
</script>

<template>
  <div class="hero">
    <img v-if="isEnabled()" :src="heroImage" alt="Hero" class="hero-image" />
    <img v-if="isEnabled()" :src="icon" alt="Icon" class="hero-icon" />
    <p v-if="isEnabled()" class="cdn-info">Serving assets from: {{ cdnUrl }}</p>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hero-image {
  max-width: 100%;
  height: auto;
}
</style>
```

### Server API Route

```typescript
// server/api/config.get.ts
import { resolveCdnPath, createCdnHelper } from '#shared/utils/cdn';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const cdnUrl = config.public.cdnUrl;

  // Resolve single paths
  const logoUrl = resolveCdnPath('/images/logo.png', cdnUrl);
  const faviconUrl = resolveCdnPath('/images/favicon.ico', cdnUrl);

  // Or use helper for multiple operations
  const cdn = createCdnHelper(cdnUrl);
  const assets = {
    logo: cdn.resolve('/images/logo.png'),
    favicon: cdn.resolve('/images/favicon.ico'),
    style: cdn.resolve('/css/main.css'),
  };

  return {
    cdnUrl,
    cdnEnabled: !!cdnUrl,
    logoUrl,
    faviconUrl,
    assets,
  };
});
```

### Plugin

```typescript
// plugins/custom-cdn.ts
export default defineNuxtPlugin(({ $cdn }) => {
  console.log('CDN Enabled:', $cdn.enabled);
  console.log('CDN URL:', $cdn.url);

  // Global CDN helper
  const resolvePath = (path: string) => {
    return $cdn.resolve(path);
  };

  return {
    provide: {
      resolveCdn: resolvePath,
    },
  };
});

// Usage in component
const { $resolveCdn } = useNuxtApp();
const imageUrl = $resolveCdn('/images/hero.webp');
```

## TypeScript Types

### Using Module Augmentations

```typescript
// Types are automatically available
const nuxtApp = useNuxtApp();

// Full type support for injected properties
nuxtApp.$cdn.enabled;        // boolean
nuxtApp.$cdn.url;             // string
nuxtApp.$cdn.resolve(...);    // method
nuxtApp.$toast.error(...);    // method
nuxtApp.$themeTokens.getToken(...); // method
```

### Importing Specific Types

```typescript
import type { CdnConfig, CdnHelper } from '#types/nuxt/cdn';
import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';

interface MyComponent {
  cdn: CdnConfig;
  themeApi: ThemeTokensApi;
}
```

## Composables

### useThemeTokens

```typescript
// composables/useMyTheme.ts
export default defineComponent({
  setup() {
    const { getToken, setThemeMode } = useThemeTokens();

    const primaryColor = getToken('color-primary');

    const toggleDarkMode = () => {
      setThemeMode('dark');
    };

    return { primaryColor, toggleDarkMode };
  },
});
```

## Testing

### Test CDN Utilities

```typescript
// tests/shared/cdn.spec.ts
import { describe, it, expect } from 'vitest';
import { resolveCdnPath, createCdnHelper } from '#shared/utils/cdn';

describe('CDN Utilities', () => {
  it('resolves CDN paths correctly', () => {
    const cdnUrl = 'https://cdn.example.com';
    const result = resolveCdnPath('/images/logo.png', cdnUrl);

    expect(result).toBe('https://cdn.example.com/images/logo.png');
  });

  it('creates working CDN helper', () => {
    const cdn = createCdnHelper('https://cdn.example.com');

    expect(cdn.enabled).toBe(true);
    expect(cdn.resolve('/images/icon.svg')).toBe('https://cdn.example.com/images/icon.svg');
  });
});
```

## Configuration

### Environment Variables

```bash
# Development with CDN
NUXT_APP_CDN_URL=https://cdn.example.com npm run dev

# Production build with CDN
NUXT_APP_CDN_URL=https://cdn.example.com npm run build

# Local development (no CDN)
npm run dev

# HTTPS development
npm run start:ssl:4200
```

`npm start` is an alias for the **dev** server. Production is `npm run build` (Nitro output). Local HTTP is port **4200**.

`useCdn()` is auto-imported from `core/web/app/composables/useCdn.ts`. Path helpers for server code live on `#shared/utils/cdn`.

## Common Patterns

### Conditional Rendering Based on CDN

```vue
<template>
  <div>
    <img v-if="cdnEnabled" :src="cdnImageUrl" alt="From CDN" />
    <img v-else src="/images/local.png" alt="Local" />
  </div>
</template>

<script setup lang="ts">
const { isEnabled, resolvePath } = useCdn();
const cdnEnabled = isEnabled();
const cdnImageUrl = resolvePath('/images/hero.webp');
</script>
```

### Error Handling

```typescript
const config = useRuntimeConfig();
const cdnUrl = config.public.cdnUrl;

if (!cdnUrl) {
  console.warn('CDN not configured, using local assets');
}

const imageUrl = resolveCdnPath('/images/logo.png', cdnUrl);
if (!imageUrl) {
  console.error('Failed to resolve CDN path');
}
```

## See Also

- [Quick Start](./quickstart.md)
- [TypeScript Configuration](../reference/typescript-config.md)
