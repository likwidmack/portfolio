import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCdn } from '../app/composables/useCdn';

describe('useCdn', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delegates to createCdnHelper when CDN is configured', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { cdnUrl: 'https://cdn.example.com' },
    }));

    const cdn = useCdn();
    expect(cdn.cdnUrl).toBe('https://cdn.example.com');
    expect(cdn.isEnabled).toBe(true);
    expect(cdn.resolvePath('/images/hero.webp')).toBe('https://cdn.example.com/images/hero.webp');
    expect(cdn.resolvePaths(['/a.png', 'b.png'])).toEqual([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.png',
    ]);
    expect(cdn.config.enabled).toBe(true);
    expect(cdn.config.resolve('/x.svg')).toBe('https://cdn.example.com/x.svg');
  });

  it('passes through paths when CDN is unset', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { cdnUrl: undefined },
    }));

    const cdn = useCdn();
    expect(cdn.cdnUrl).toBe('');
    expect(cdn.isEnabled).toBe(false);
    expect(cdn.resolvePath('/images/hero.webp')).toBe('/images/hero.webp');
    expect(cdn.config.enabled).toBe(false);
  });
});
