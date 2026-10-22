import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  normalizeMediaBaseUrl,
  PRODUCTION_MEDIA_BASE_URL,
  sitePublicMediaBase,
  sitePublicMediaUrl,
} from '../shared/media-public';

const webRoot = join(import.meta.dirname, '..');

describe('media-public: production media base for builds without a media server', () => {
  it('PRODUCTION_MEDIA_BASE_URL is empty (same origin) or an absolute https origin without a trailing slash', () => {
    expect(normalizeMediaBaseUrl(PRODUCTION_MEDIA_BASE_URL)).toBe(PRODUCTION_MEDIA_BASE_URL);
    if (PRODUCTION_MEDIA_BASE_URL) expect(PRODUCTION_MEDIA_BASE_URL).toMatch(/^https:\/\/[^/]+(?:\/[^?#]*[^/])?$/);
  });

  it('defaults to the production constant without an override', () => {
    expect(sitePublicMediaBase()).toBe(PRODUCTION_MEDIA_BASE_URL);
    expect(sitePublicMediaBase(null)).toBe(PRODUCTION_MEDIA_BASE_URL);
    expect(sitePublicMediaBase({})).toBe(PRODUCTION_MEDIA_BASE_URL);
    expect(sitePublicMediaBase({ public: {} })).toBe(PRODUCTION_MEDIA_BASE_URL);
    expect(sitePublicMediaBase({ public: { mediaBaseUrl: '' } })).toBe(PRODUCTION_MEDIA_BASE_URL);
    expect(sitePublicMediaBase({ public: { mediaBaseUrl: '   ' } })).toBe(PRODUCTION_MEDIA_BASE_URL);
  });

  it('runtimeConfig.public.mediaBaseUrl (NUXT_PUBLIC_MEDIA_BASE_URL) overrides it, trimmed and without trailing slashes', () => {
    expect(sitePublicMediaBase({ public: { mediaBaseUrl: 'https://d123.cloudfront.net/' } })).toBe(
      'https://d123.cloudfront.net'
    );
    expect(sitePublicMediaBase({ public: { mediaBaseUrl: ' https://media.example.com//' } })).toBe(
      'https://media.example.com'
    );
    expect(sitePublicMediaBase({ public: { mediaBaseUrl: 'http://localhost:9000/portfolio-assets' } })).toBe(
      'http://localhost:9000/portfolio-assets'
    );
  });

  it('ignores overrides that are not absolute http(s) URLs (falls back to the constant)', () => {
    for (const bad of [
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '//cdn.example.com',
      '/m',
      'cdn.example.com',
      'https://cdn.example.com/?v=1',
      'https://cdn.example.com/#x',
      'https://user:pass@cdn.example.com',
      42,
      true,
      { url: 'https://x' },
    ]) {
      expect(sitePublicMediaBase({ public: { mediaBaseUrl: bad } }), String(bad)).toBe(PRODUCTION_MEDIA_BASE_URL);
      expect(normalizeMediaBaseUrl(bad), String(bad)).toBe('');
    }
  });

  it('sitePublicMediaUrl joins the base and a catalog key with exactly one slash', () => {
    const cdn = { public: { mediaBaseUrl: 'https://d123.cloudfront.net/' } };
    expect(sitePublicMediaUrl('m/pf/i/hero@640.webp', cdn)).toBe('https://d123.cloudfront.net/m/pf/i/hero@640.webp');
    expect(sitePublicMediaUrl('/m/pf/i/hero.png', cdn)).toBe('https://d123.cloudfront.net/m/pf/i/hero.png');
    expect(sitePublicMediaUrl('m/pf/d/resume.pdf')).toBe(`${PRODUCTION_MEDIA_BASE_URL}/m/pf/d/resume.pdf`);
  });

  it('is client-safe: no imports at all (no server, Node or Nuxt dependency)', () => {
    const source = readFileSync(join(webRoot, 'shared', 'media-public.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\(|process\.env/);
  });

  it('nuxt.config declares runtimeConfig.public.mediaBaseUrl so NUXT_PUBLIC_MEDIA_BASE_URL can override it', () => {
    const config = readFileSync(join(webRoot, 'nuxt.config.ts'), 'utf8');
    const runtimeConfig = config.slice(config.indexOf('\n  runtimeConfig: {\n'));
    expect(runtimeConfig.slice(runtimeConfig.indexOf('\n    public: {\n'))).toMatch(/\n {6}mediaBaseUrl: '',/);
  });
});
