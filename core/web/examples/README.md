# CDN Examples

This directory contains examples demonstrating how to use the CDN capabilities in the Nuxt application.

## Files

- `cdn-usage.example.vue` - Complete example showing how to use the `useCdn()` composable to resolve asset paths and access CDN configuration.

## Running the Examples

To test CDN capabilities locally:

### 1. Development Mode (No CDN)

```bash
npm run dev
# Assets are served from the origin server
```

### 2. Development Mode with CDN

```bash
# Set a local CDN URL (e.g., for testing)
NUXT_APP_CDN_URL=https://cdn.example.com npm run dev
```

### 3. Using the Example Component

To use the example component:

1. Copy `cdn-usage.example.vue` to one of your page or component directories
2. Rename it from `.example.vue` to `.vue`
3. Import and use it in your app

Example:

```vue
<template>
  <CDNExample />
</template>

<script setup lang="ts">
import CDNExample from '~/examples/cdn-usage.example.vue';
</script>
```

## Testing CDN Integration

### Test with AWS CloudFront

```bash
NUXT_APP_CDN_URL=https://d123456789abcdef.cloudfront.net npm run dev
```

### Test with Cloudflare

```bash
NUXT_APP_CDN_URL=https://cdn.example.com npm run dev
```

## Key Takeaways

- The `useCdn()` composable is available in all Vue components
- Use `resolvePath()` for single asset URLs
- Use `resolvePaths()` for multiple asset URLs
- Check `isEnabled()` to conditionally load CDN-served assets
- Access `config` for raw CDN configuration

## Further Reading

See `CDN_GUIDE.md` in the root of the app for comprehensive CDN documentation.
