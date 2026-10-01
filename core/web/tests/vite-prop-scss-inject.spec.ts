import { describe, expect, it } from 'vitest';

import {
  appCssRoot,
  scssAdditionalData,
  scssLoadPaths,
  themeScssRoot,
} from '../config-properties/scss-additional-data';
import { shouldInjectAppMixins, shouldInjectScssAutoUse } from '../config-properties/scss-auto-use';

describe('shouldInjectScssAutoUse', () => {
  it('injects only for Vue SFC style bodies', () => {
    expect(shouldInjectScssAutoUse('.btn { color: red; }', 'app/components/UiButton.vue')).toBe(true);
  });

  it('skips misrouted SFC / script content', () => {
    expect(shouldInjectScssAutoUse('<template></template>', 'app/pages/index.vue')).toBe(false);
    expect(shouldInjectScssAutoUse("import x from 'y'", 'app/pages/index.vue')).toBe(false);
    expect(shouldInjectScssAutoUse('definePageMeta({})', 'app/pages/index.vue')).toBe(false);
  });

  it('skips theme entry, launch chain, and node_modules paths', () => {
    expect(shouldInjectScssAutoUse('$x: 1;', '/theme/core/scss/globals/_root.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/node_modules/foo/bar.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/assets/css/styles.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/assets/css/portfolio-launch.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', 'plain.scss')).toBe(false);
  });

  it('skips app partials on the launch emit chain', () => {
    expect(shouldInjectScssAutoUse('$x: 1;', '/assets/css/_globals.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/assets/css/_mixins.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/assets/css/_variables.scss')).toBe(false);
  });
});

describe('shouldInjectAppMixins', () => {
  it('matches the Vue-only theme auto-use gate (never injects globals)', () => {
    expect(shouldInjectAppMixins('@include portfolio-stack;', 'app/pages/about.vue')).toBe(true);
    expect(shouldInjectAppMixins('@include portfolio-stack;', 'app/pages/index.scss')).toBe(false);
    expect(shouldInjectAppMixins('@include portfolio-stack;', '/assets/css/portfolio-launch.scss')).toBe(false);
  });
});

describe('scssLoadPaths', () => {
  it('includes app assets/css so standalone sheets can @use mixins', () => {
    const normalized = scssLoadPaths.map((p) => p.replace(/\\/g, '/'));
    expect(normalized).toContain(appCssRoot.replace(/\\/g, '/'));
    expect(normalized.some((p) => p.endsWith('/assets/css'))).toBe(true);
  });

  it('includes theme SCSS plus PrimeVue and Foundation Sass roots', () => {
    const normalized = scssLoadPaths.map((p) => p.replace(/\\/g, '/'));
    expect(normalized).toContain(themeScssRoot.replace(/\\/g, '/'));
    expect(normalized.some((p) => p.endsWith('/theme/primevue'))).toBe(true);
    expect(normalized.some((p) => p.endsWith('/theme/foundation'))).toBe(true);
  });
});

describe('scssAdditionalData prepend', () => {
  it('prepends theme nuxt-auto and app mixins for Vue SFC styles', () => {
    const body = '.hero { @include portfolio-stack; }';
    const out = scssAdditionalData(body, 'app/pages/about.vue');
    const themeRootNorm = themeScssRoot.replace(/\\/g, '/');
    const appRootNorm = appCssRoot.replace(/\\/g, '/');
    expect(out.startsWith(`@use "${themeRootNorm}/nuxt-auto" as *;\n@use "${appRootNorm}/mixins" as *;\n`)).toBe(true);
    expect(out.endsWith(body)).toBe(true);
    expect(out).not.toMatch(/globals/);
  });

  it('leaves standalone .scss and launch-chain files unchanged', () => {
    const body = '@use "mixins" as *;\n.block { color: red; }';
    expect(scssAdditionalData(body, 'app/pages/index.scss')).toBe(body);
    expect(scssAdditionalData(body, '/assets/css/portfolio-launch.scss')).toBe(body);
    expect(scssAdditionalData(body, '/assets/css/_globals.scss')).toBe(body);
  });
});
