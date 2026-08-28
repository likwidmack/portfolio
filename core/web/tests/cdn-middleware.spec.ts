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
