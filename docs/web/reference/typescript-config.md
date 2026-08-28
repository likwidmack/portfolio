# TypeScript Configuration

Reference for TypeScript compiler options and path aliases.

## Configuration Files

- `tsconfig.json` - Root configuration with project references
- `tsconfig.app.json` - Application TypeScript configuration
- `tsconfig.spec.json` - Test TypeScript configuration

## Compiler Options

### Base Configuration

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": ".",
    "outDir": "dist",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  }
}
```

### Key Options

| Option             | Value      | Purpose            |
| ------------------ | ---------- | ------------------ |
| `jsx`              | `preserve` | Keep JSX for Vite  |
| `jsxImportSource`  | `vue`      | Use Vue for JSX    |
| `module`           | `esnext`   | Modern ES modules  |
| `moduleResolution` | `bundler`  | Bundler resolution |

## Path Aliases

Configured in `tsconfig.app.json`:

```json
"paths": {
  "#shared/*": ["shared/*"],
  "#types/*": ["types/*"],
  "theme/scss": ["../../theme/core/scss"],
  "theme/scss/*": ["../../theme/core/scss/*"],
  "#theme/scss": ["../../theme/core/scss"],
  "#theme/scss/*": ["../../theme/core/scss/*"],
  "@tgmc/theme": ["../../theme/core/dist/index.d.ts"],
  "@tgmc/theme/tokens": ["../../theme/core/dist/tokens-public.d.ts"],
  "@tgmc/theme/primevue": ["../../theme/core/dist/primevue.d.ts"]
}
```

### Alias Reference

| Alias                  | Resolves To             | Purpose          |
| ---------------------- | ----------------------- | ---------------- |
| `#shared/*`            | `./shared/*`            | Shared utilities |
| `#types/*`             | `./types/*`             | Type definitions |
| `theme/scss`           | `../../theme/core/scss` | Theme SCSS       |
| `#theme/scss`          | `../../theme/core/scss` | Alt theme SCSS   |
| `@tgmc/theme`          | Theme dist              | Theme package    |
| `@tgmc/theme/tokens`   | Tokens dist             | Theme tokens     |
| `@tgmc/theme/primevue` | PrimeVue dist           | PrimeVue theme   |

## Type Inclusion

Files automatically included:

```json
"include": [
  ".nuxt/nuxt.d.ts",
  ".nuxt/content/types.d.ts",
  "app/**/*",
  "app/**/*.json",
  "config-properties/**/*",
  "shared/**/*",
  "types/**/*",
  "types/**/*.d.ts",
  "server/**/*",
  "services/**/*",
  "config"
]
```

## Usage Examples

### Importing Utilities

```typescript
import { useCdn } from '#shared/utils/cdn';
import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';
```

### Importing Theme

```typescript
import tokens from '@tgmc/theme/tokens';
import primevueTheme from '@tgmc/theme/primevue';
```

### Importing SCSS

```scss
@import 'theme/scss/variables';
@import '#theme/scss/mixins';
```

### Importing Types

```typescript
// Optional - types are globally available via module augmentations
import type { CdnConfig } from '#types/nuxt/cdn';
```

## Adding New Path Alias

1. Edit `tsconfig.app.json`
2. Add entry in `compilerOptions.paths`:

```json
"#myalias/*": ["my-directory/*"]
```

3. Also add in `nuxt.config.ts` for runtime resolution:

```typescript
alias: {
  '#myalias': resolvePath('./my-directory'),
}
```

## Verify Configuration

Check TypeScript compilation:

```bash
npx tsc --noEmit --skipLibCheck
```

## Related Files

- `tsconfig.json` - Root TypeScript config
- `nuxt.config.ts` - Nuxt aliases (must match tsconfig)
- `vitest.config.ts` - Test TypeScript options

## See Also

- [Types Documentation](./types.md)
- [Project Structure](./project-structure.md)
- [Theme layout / page fit](../../packages/theme.md)
