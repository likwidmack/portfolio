# Quick Start Guide

Get up and running in 5 minutes.

## Installation & Setup

### 1. Prerequisites

- Node.js **>= 24** (see repo `.nvmrc`)
- npm
- Git

### 2. Install dependencies (repository root)

```bash
npm ci
npm run db:migrate:local
```

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:4200`

---

## Basic Usage

### Vue Components

```vue
<script setup lang="ts">
const { resolvePath, isEnabled } = useCdn();
const imageUrl = resolvePath('/images/hero.webp');
</script>

<template>
  <img v-if="isEnabled()" :src="imageUrl" alt="Hero" />
</template>
```

`useCdn()` is auto-imported from `core/web/app/composables/useCdn.ts`. Server path helpers import from `#shared/utils/cdn`.

### Server Code

```typescript
import { resolveCdnPath } from '#shared/utils/cdn';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const cdnUrl = config.public.cdnUrl;
  const logoUrl = resolveCdnPath('/images/logo.png', cdnUrl);
  return { logoUrl };
});
```

---

## Common Commands

| Command                    | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`              | Start dev server                                                           |
| `npm run db:migrate:local` | Apply local SQLite migrations                                              |
| `npm run build`            | Build for production                                                       |
| `npm run build:libs`       | Build workspace libraries                                                  |
| `npm run test`             | Run tests                                                                  |
| `npm run lint`             | Prettier + lint all Nx packages with a lint target                         |
| `npm run format`           | Format code only                                                           |

---

## With CDN

Enable CDN for faster asset delivery:

```bash
NUXT_APP_CDN_URL=https://cdn.example.com npm run dev
```

See [Code Examples](./examples.md) for CDN usage.

---

## With HTTPS

For local HTTPS development:

```bash
# Generate SSL certificates (once)
npm run ssl:gen:linux  # or ssl:gen:windows on PowerShell

# Start HTTPS server
npm run start:ssl:4200
```

See [SSL Setup](../setup/ssl-setup.md) for details.

---

## Next Steps

1. Explore the **[Project Structure](../reference/project-structure.md)**
2. Check **[Code Examples](./examples.md)**
3. Review **[TypeScript Configuration](../reference/typescript-config.md)**

---

**Need more help?** See the full documentation index: [docs/README.md](../../README.md).
