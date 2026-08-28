<script setup lang="ts">
import { computed } from 'vue';

import { buildCdnUrl, createCdnHelper, resolveCdnPath } from '#shared/utils/cdn';

definePageMeta({
  title: 'CDN Configuration Test',
  layout: 'default',
});

const { cdnUrl, resolvePath, isEnabled, config } = useCdn();
const runtimeConfig = useRuntimeConfig();

const exampleAssets = ['/images/hero.webp', '/css/main.css', '/js/app.js', '/fonts/inter.woff2', '/icons/logo.svg'];

const resolvedAssets = computed(() =>
  exampleAssets.map((asset) => ({
    original: asset,
    resolved: resolvePath(asset),
    isCdn: isEnabled,
  }))
);

const utilityTests = computed(() => [
  {
    name: 'resolveCdnPath',
    result: resolveCdnPath('/images/logo.png', cdnUrl),
  },
  {
    name: 'buildCdnUrl',
    result: buildCdnUrl(cdnUrl, 'images', 'hero.webp'),
  },
  {
    name: 'createCdnHelper.resolve',
    result: createCdnHelper(cdnUrl).resolve('/images/icon.svg'),
  },
]);
</script>

<template>
  <div class="cdn-test-page">
    <h1>CDN Configuration Test</h1>

    <section>
      <h2>CDN Status</h2>
      <p v-if="isEnabled"><strong>CDN is enabled</strong> — {{ cdnUrl }}</p>
      <p v-else><strong>CDN is disabled</strong> — assets resolve locally</p>
    </section>

    <section>
      <h2>Resolved Assets</h2>
      <ul>
        <li v-for="asset in resolvedAssets" :key="asset.original">
          <code>{{ asset.original }}</code>
          <span> → </span>
          <code>{{ asset.resolved }}</code>
        </li>
      </ul>
    </section>

    <section>
      <h2>Utility Checks</h2>
      <ul>
        <li v-for="test in utilityTests" :key="test.name">
          <strong>{{ test.name }}</strong
          >: <code>{{ test.result }}</code>
        </li>
      </ul>
    </section>

    <section>
      <h2>Runtime Config</h2>
      <pre><code>{{ JSON.stringify({ public: { cdnUrl: runtimeConfig.public.cdnUrl }, theme: config }, null, 2) }}</code></pre>
    </section>
  </div>
</template>

<style scoped>
.cdn-test-page {
  padding: 2rem;
}

section {
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--text-color) 15%, transparent);
  border-radius: 0.5rem;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
}

li + li {
  margin-top: 0.5rem;
}

pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>
