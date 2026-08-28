import {
  buildCdnUrl,
  createCdnHelper,
  isCdnUrl,
  resolveCdnPath,
  resolveCdnPaths,
  stripCdnPrefix,
} from '../src/lib/cdn.js';

describe('CDN utilities', () => {
  const testCdnUrl = 'https://cdn.example.com';

  describe('resolveCdnPath', () => {
    it('resolves a path with CDN URL', () => {
      expect(resolveCdnPath('/images/hero.webp', testCdnUrl)).toBe('https://cdn.example.com/images/hero.webp');
    });

    it('returns original path when CDN URL is empty or undefined', () => {
      const path = '/images/hero.webp';
      expect(resolveCdnPath(path, '')).toBe(path);
      expect(resolveCdnPath(path)).toBe(path);
    });

    it('handles paths without a leading slash', () => {
      expect(resolveCdnPath('images/hero.webp', testCdnUrl)).toBe('https://cdn.example.com/images/hero.webp');
    });
  });

  describe('resolveCdnPaths', () => {
    it('resolves multiple paths', () => {
      expect(resolveCdnPaths(['/css/main.css', '/js/app.js'], testCdnUrl)).toEqual([
        'https://cdn.example.com/css/main.css',
        'https://cdn.example.com/js/app.js',
      ]);
    });

    it('returns original paths when CDN URL is empty', () => {
      const paths = ['/css/main.css', '/js/app.js'];
      expect(resolveCdnPaths(paths, '')).toEqual(paths);
    });
  });

  describe('createCdnHelper', () => {
    it('creates an enabled helper', () => {
      const helper = createCdnHelper(testCdnUrl);
      expect(helper.isEnabled).toBe(true);
      expect(helper.url).toBe(testCdnUrl);
      expect(helper.config).toEqual({ enabled: true, url: testCdnUrl });
      expect(helper.resolve('/images/hero.webp')).toBe('https://cdn.example.com/images/hero.webp');
      expect(helper.resolvePaths(['/a', '/b'])).toEqual(['https://cdn.example.com/a', 'https://cdn.example.com/b']);
    });

    it('creates a disabled helper', () => {
      const helper = createCdnHelper();
      expect(helper.isEnabled).toBe(false);
      expect(helper.url).toBe('');
      expect(helper.config).toEqual({ enabled: false, url: '' });
    });
  });

  describe('buildCdnUrl', () => {
    it('builds URLs and normalizes slashes', () => {
      expect(buildCdnUrl(testCdnUrl, 'images', 'hero.webp')).toBe('https://cdn.example.com/images/hero.webp');
      expect(buildCdnUrl(testCdnUrl, '/images', '/hero.webp')).toBe('https://cdn.example.com/images/hero.webp');
      expect(buildCdnUrl('https://cdn.example.com/', 'images', 'hero.webp')).toBe(
        'https://cdn.example.com/images/hero.webp'
      );
      expect(buildCdnUrl('', 'images', 'hero.webp')).toBe('images/hero.webp');
    });
  });

  describe('isCdnUrl / stripCdnPrefix', () => {
    it('detects and strips CDN prefixes', () => {
      const url = 'https://cdn.example.com/images/logo.png';
      expect(isCdnUrl(url, testCdnUrl)).toBe(true);
      expect(isCdnUrl('https://example.com/images/logo.png', testCdnUrl)).toBe(false);
      expect(isCdnUrl(url)).toBe(false);
      expect(stripCdnPrefix(url, testCdnUrl)).toBe('/images/logo.png');
      expect(stripCdnPrefix(url)).toBe(url);
      expect(stripCdnPrefix('https://cdn.example.com//images/logo.png', testCdnUrl)).toBe('/images/logo.png');
    });
  });
});
