# TypeScript Types

TypeScript type definitions are consolidated in the `types/` directory.

## Structure

```
types/
├── nuxt/                     # Nuxt module augmentations
│   ├── cdn.d.ts             # CDN plugin types
│   ├── theme-tokens.d.ts    # Theme tokens API
│   └── toast.d.ts           # Toast service
└── README.md                # Detailed guide
```

## Module Augmentations

Type definitions in `types/nuxt/` automatically augment Nuxt modules:

### Global Access (No Import Needed)

```typescript
// Types are available globally via module augmentations
const { $cdn, $toast, $themeTokens } = useNuxtApp();
```

### Explicit Imports

```typescript
import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';
import { useCdn } from '#shared/utils/cdn';

const { cdnUrl } = useCdn();
```

## Available Types

### CDN Types

- `CdnConfig` - CDN configuration interface
- `CdnHelper` - CDN helper interface with methods

### Augmented Modules

- `#app` - Nuxt app module
- `@vue/runtime-core` - Vue runtime
- `vue` - Vue component types

## Adding New Types

1. Create `types/nuxt/my-feature.d.ts`
2. Add module augmentations:

```typescript
declare module '#app' {
  interface NuxtApp {
    $myFeature: MyFeatureApi;
  }
}
```

3. TypeScript automatically includes it via `tsconfig.app.json`

## Configuration

TypeScript paths configured in `tsconfig.app.json`:

- `#shared/*` → `./shared/*`
- `#types/*` → `./types/*`
- `@tgmc/theme` → `../../theme/core/dist`

## Related Documentation

- **Detailed Guide**: `types/README.md`
- **Import Cleanup**: See `reference/cleanup-summary.md`
- **TypeScript Config**: `reference/typescript-config.md`
