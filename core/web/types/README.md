# TypeScript Types Organization

This directory contains all TypeScript type definitions for the Nuxt application, organized by purpose.

## 📁 Structure

```
types/
├── nuxt/                     # Nuxt module augmentations
│   ├── cdn.d.ts             # CDN plugin type definitions
│   ├── theme-tokens.d.ts    # Theme tokens API type definitions
│   └── toast.d.ts           # Toast service type definitions
└── README.md                # This file
```

## 📝 Purpose

- **`nuxt/`** - Contains `.d.ts` files that augment Nuxt modules (`#app`, `@vue/runtime-core`, `nuxt/app`, etc.)
- Module augmentations extend TypeScript's understanding of injected properties and global types
- All definitions are automatically included via `tsconfig.app.json` pattern

## 🔧 TypeScript Configuration

The `tsconfig.app.json` automatically includes:

```json
"include": [
  "types/**/*",
  "types/**/*.d.ts"
]
```

## 📚 Usage Examples

### In Vue Components (Automatic)

```typescript
// Module augmentations make these types available globally
export default {
  setup() {
    const { $cdn, $toast, $themeTokens } = useNuxtApp();
    // Full type support - no imports needed
  },
};
```

### In TypeScript Files (Explicit)

```typescript
import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';
import { useCdn } from '#shared/utils/cdn';

const { cdnUrl } = useCdn();
```

## ➕ Adding New Type Definitions

1. Create `types/nuxt/my-feature.d.ts`
2. Add module augmentations for your feature
3. No configuration changes needed - TypeScript includes automatically

Example:

```typescript
declare module '#app' {
  interface NuxtApp {
    $myFeature: MyFeatureApi;
  }
}
```

## 🔗 Related

- **Shared Types**: `shared/theme/theme-tokens-api.d.ts` (utility-level definitions)
- **Type Alias**: `#types` → `./types` (configured in `nuxt.config.ts`)
- **Main Guide**: See `../DOCUMENTATION.md` for overview
