import { describe, expect, it } from 'vitest';
import { cdnStaticAssetRedirectUrl, isStaticAsset } from '../server/utils/cdn-static-asset';

describe('CDN middleware scope', () => {
  it('treats known static extensions as assets', () => {
    expect(isStaticAsset('/_nuxt/entry.js')).toBe(true);
    expect(isStaticAsset('/images/hero.PNG')).toBe(true);
    expect(isStaticAsset('/fonts/Inter.woff2?v=2')).toBe(true);
  });

  it('treats public PDF and HTML files as static assets', () => {
    expect(isStaticAsset('/d/resume.pdf')).toBe(true);
    expect(isStaticAsset('/d/htm/case-study.html')).toBe(true);
  });

  it('does not treat query-string fake extensions as assets', () => {
    expect(isStaticAsset('/api/messages?x=.js')).toBe(false);
    expect(isStaticAsset('/about#section.css')).toBe(false);
    expect(isStaticAsset('/api/content/home')).toBe(false);
  });

  it('treats favicon.ico as a static asset', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true);
    expect(isStaticAsset('/favicon.ico?v=2')).toBe(true);
  });
});

describe('cdnStaticAssetRedirectUrl', () => {
  it('redirects favicon and hashed assets to the CDN origin', () => {
    expect(cdnStaticAssetRedirectUrl('/favicon.ico', 'https://d3.cloudfront.net')).toBe(
      'https://d3.cloudfront.net/favicon.ico'
    );
    expect(cdnStaticAssetRedirectUrl('/_nuxt/entry.js', 'https://cdn.example.com')).toBe(
      'https://cdn.example.com/_nuxt/entry.js'
    );
  });

  it('does not redirect SPA routes or API paths, or when CDN is unset', () => {
    expect(cdnStaticAssetRedirectUrl('/favicon.ico', undefined)).toBeUndefined();
    expect(cdnStaticAssetRedirectUrl('/', 'https://cdn.example.com')).toBeUndefined();
    expect(cdnStaticAssetRedirectUrl('/about', 'https://cdn.example.com')).toBeUndefined();
    expect(cdnStaticAssetRedirectUrl('/api/greet', 'https://cdn.example.com')).toBeUndefined();
  });

  it('redirects public PDF and HTML files to the CDN origin', () => {
    expect(cdnStaticAssetRedirectUrl('/d/resume.pdf', 'https://cdn.example.com')).toBe(
      'https://cdn.example.com/d/resume.pdf'
    );
    expect(cdnStaticAssetRedirectUrl('/d/htm/case-study.html', 'https://d3.cloudfront.net')).toBe(
      'https://d3.cloudfront.net/d/htm/case-study.html'
    );
  });
});

describe('cdnStaticAssetRedirectUrl for media objects (/m/**)', () => {
  const cdn = 'https://shared-cdn.example.com';

  it('leaves /m/ to the local stand-in when local media is on, even with an absolute CDN URL', () => {
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero@t.webp', cdn, { localMedia: true })).toBeUndefined();
    expect(cdnStaticAssetRedirectUrl('/m/pf/v/clip.mp4?x=1', cdn, { localMedia: true })).toBeUndefined();
    // Only the media prefix is exempt.
    expect(cdnStaticAssetRedirectUrl('/_nuxt/entry.js', cdn, { localMedia: true })).toBe(`${cdn}/_nuxt/entry.js`);
    expect(cdnStaticAssetRedirectUrl('/media/hero.png', cdn, { localMedia: true })).toBe(`${cdn}/media/hero.png`);
  });

  it('sends /m/ to the media public base when one is given (the test stack CDN does not serve m/*)', () => {
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero.png', cdn, { mediaBaseUrl: 'https://d9own.cloudfront.net' })).toBe(
      'https://d9own.cloudfront.net/m/pf/i/hero.png'
    );
    expect(cdnStaticAssetRedirectUrl('/d/resume.pdf', cdn, { mediaBaseUrl: 'https://d9own.cloudfront.net' })).toBe(
      `${cdn}/d/resume.pdf`
    );
  });

  it('keeps the CDN redirect for /m/ when no media base is known and local media is off', () => {
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero.png', cdn, { localMedia: false })).toBe(`${cdn}/m/pf/i/hero.png`);
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero.png', cdn, { mediaBaseUrl: '' })).toBe(`${cdn}/m/pf/i/hero.png`);
  });

  it('covers every DAM kind: audio, 3D / XR and AVIF are static assets too', () => {
    for (const ext of ['.mp3', '.m4a', '.wav', '.ogg', '.glb', '.gltf', '.usdz', '.avif']) {
      expect(isStaticAsset(`/m/pf/x/file${ext}`), ext).toBe(true);
      expect(isStaticAsset(`/m/pf/x/FILE${ext.toUpperCase()}`), ext).toBe(true);
    }
    const base = { mediaBaseUrl: 'https://d9own.cloudfront.net' };
    expect(cdnStaticAssetRedirectUrl('/m/pf/a/theme.mp3', cdn, base)).toBe(
      'https://d9own.cloudfront.net/m/pf/a/theme.mp3'
    );
    expect(cdnStaticAssetRedirectUrl('/m/pf/o/chair.glb', cdn, base)).toBe(
      'https://d9own.cloudfront.net/m/pf/o/chair.glb'
    );
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero@1920.avif', cdn, base)).toBe(
      'https://d9own.cloudfront.net/m/pf/i/hero@1920.avif'
    );
  });

  it('sends any media object to the media base, whatever its extension (documents: .md, .txt)', () => {
    const base = { mediaBaseUrl: 'https://d9own.cloudfront.net' };
    expect(cdnStaticAssetRedirectUrl('/m/pf/d/notes.md', cdn, base)).toBe(
      'https://d9own.cloudfront.net/m/pf/d/notes.md'
    );
    expect(cdnStaticAssetRedirectUrl('/m/pf/d/readme.txt?v=2', cdn, base)).toBe(
      'https://d9own.cloudfront.net/m/pf/d/readme.txt'
    );
    expect(cdnStaticAssetRedirectUrl('/m/pf/d/notes.md', cdn, { localMedia: true })).toBeUndefined();
    // Outside /m/ the extension list still decides.
    expect(cdnStaticAssetRedirectUrl('/notes.md', cdn, base)).toBeUndefined();
  });

  it('sends /m/ to the media base even without a static-asset CDN (e.g. MinIO on Docker dynamodb)', () => {
    const base = { mediaBaseUrl: 'http://localhost:4430/portfolio-assets' };
    expect(cdnStaticAssetRedirectUrl('/m/pf/d/notes.md', undefined, base)).toBe(
      'http://localhost:4430/portfolio-assets/m/pf/d/notes.md'
    );
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero.png', '', base)).toBe(
      'http://localhost:4430/portfolio-assets/m/pf/i/hero.png'
    );
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero.png', undefined, { ...base, localMedia: true })).toBeUndefined();
    // Neither base: nothing to redirect to. Static assets still need the CDN.
    expect(cdnStaticAssetRedirectUrl('/m/pf/i/hero.png', undefined, { mediaBaseUrl: '' })).toBeUndefined();
    expect(cdnStaticAssetRedirectUrl('/_nuxt/entry.js', undefined, base)).toBeUndefined();
  });
});
