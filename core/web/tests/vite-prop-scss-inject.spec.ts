import { describe, expect, it } from 'vitest';

import { shouldInjectScssAutoUse } from '../config-properties/scss-auto-use';

describe('shouldInjectScssAutoUse', () => {
  it('injects only for Vue SFC style bodies', () => {
    expect(shouldInjectScssAutoUse('.btn { color: red; }', 'app/components/UiButton.vue')).toBe(true);
  });

  it('skips misrouted SFC / script content', () => {
    expect(shouldInjectScssAutoUse('<template></template>', 'app/pages/index.vue')).toBe(false);
    expect(shouldInjectScssAutoUse("import x from 'y'", 'app/pages/index.vue')).toBe(false);
    expect(shouldInjectScssAutoUse('definePageMeta({})', 'app/pages/index.vue')).toBe(false);
  });

  it('skips theme entry and node_modules paths', () => {
    expect(shouldInjectScssAutoUse('$x: 1;', '/theme/core/scss/globals/_root.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/node_modules/foo/bar.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', '/assets/css/styles.scss')).toBe(false);
    expect(shouldInjectScssAutoUse('$x: 1;', 'plain.scss')).toBe(false);
  });
});
