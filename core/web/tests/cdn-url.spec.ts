import { describe, expect, it } from 'vitest';

import { resolveNuxtCdnUrl, resolvePublicAssetUrl } from '../config-properties/cdn-url';

describe('resolveNuxtCdnUrl', () => {
  it('accepts absolute http(s) CDN origins', () => {
    expect(resolveNuxtCdnUrl('https://cdn.example.com')).toBe('https://cdn.example.com');
    expect(resolveNuxtCdnUrl('https://cdn.example.com/assets/')).toBe('https://cdn.example.com');
    expect(resolveNuxtCdnUrl('http://localhost:9000')).toBe('http://localhost:9000');
  });

  it('rejects relative and non-http values that break router base', () => {
    expect(resolveNuxtCdnUrl('./')).toBe('');
    expect(resolveNuxtCdnUrl('/')).toBe('');
    expect(resolveNuxtCdnUrl('localhost:4200')).toBe('');
    expect(resolveNuxtCdnUrl('ftp://cdn.example.com')).toBe('');
    expect(resolveNuxtCdnUrl('')).toBe('');
    expect(resolveNuxtCdnUrl(undefined)).toBe('');
  });

  it('joins public asset paths onto a CDN origin', () => {
    expect(resolvePublicAssetUrl('/favicon.ico', '')).toBe('/favicon.ico');
    expect(resolvePublicAssetUrl('/favicon.ico', 'https://d3.cloudfront.net')).toBe(
      'https://d3.cloudfront.net/favicon.ico'
    );
  });
});
