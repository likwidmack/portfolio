<!--
  CDN Usage Example

  This file demonstrates how to use the CDN capabilities in the Nuxt application.
  The useCdn() composable provides utilities to work with CDN URLs.
-->

<script setup lang="ts">
import { useCdn } from '#shared/utils/cdn';

// Using the useCdn composable to work with CDN URLs
const { cdnUrl, isEnabled, resolvePath, resolvePaths, config } = useCdn();

// Example asset paths to resolve
const assetPaths = ['/images/hero.webp', '/css/main.css', '/js/app.js'];

// Resolve single paths
const heroImageUrl = resolvePath('/images/hero.webp');

// Resolve multiple paths
const resolvedPaths = resolvePaths(assetPaths);
</script>

<template>
  <div class="cdn-example">
    <h1>CDN Capabilities Example</h1>

    <!-- Show CDN status -->
    <section>
      <h2>CDN Status</h2>
      <div v-if="isEnabled">
        <p><strong>CDN is enabled!</strong></p>
        <p>
          Base URL: <code>{{ cdnUrl }}</code>
        </p>
      </div>
      <div v-else>
        <p><strong>CDN is disabled (development mode)</strong></p>
        <p>Assets are served from the origin server.</p>
      </div>
    </section>

    <!-- Show resolved URLs -->
    <section>
      <h2>Resolved Asset URLs</h2>
      <div>
        <h3>Single Path Resolution</h3>
        <p>
          Original: <code>/images/hero.webp</code>
          <br />
          Resolved: <code>{{ heroImageUrl }}</code>
        </p>
      </div>

      <div>
        <h3>Multiple Paths Resolution</h3>
        <ul>
          <li v-for="(path, index) in assetPaths" :key="index">
            <code>{{ path }}</code>
            <br />
            <em>→ {{ resolvedPaths[index] }}</em>
          </li>
        </ul>
      </div>
    </section>

    <!-- Show configuration -->
    <section>
      <h2>CDN Configuration</h2>
      <pre><code>{{ JSON.stringify(config, null, 2) }}</code></pre>
    </section>

    <!-- Example image loading with CDN -->
    <section v-if="isEnabled">
      <h2>CDN-served Image</h2>
      <img :src="heroImageUrl" alt="Example" />
    </section>
  </div>
</template>

<style scoped>
.cdn-example {
  padding: 2rem;
  font-family: monospace;
}

section {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: #f9f9f9;
}
</style>
