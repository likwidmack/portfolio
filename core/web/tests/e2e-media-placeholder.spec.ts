import { minimatch } from 'minimatch';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const e2eRoot = join(import.meta.dirname, '..', '..', 'web-e2e', 'src');
const fixture = readFileSync(join(e2eRoot, 'fixtures', 'media-placeholder.webp'));
const support = readFileSync(join(e2eRoot, 'support', 'media.ts'), 'utf8');

/** Width and height of a lossy (`VP8 `) WebP: 14-bit fields after the frame start code. */
function lossyWebpSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8 ');
  expect([...bytes.subarray(23, 26)]).toEqual([0x9d, 0x01, 0x2a]);
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

describe('e2e catalog media placeholder', () => {
  it('is a tiny WebP whose size matches MEDIA_PLACEHOLDER_SIZE', () => {
    expect(fixture.byteLength).toBeLessThan(1024);
    const declared = support.match(/MEDIA_PLACEHOLDER_SIZE = \{ width: (\d+), height: (\d+) \}/);
    expect(declared).not.toBeNull();
    expect(lossyWebpSize(fixture)).toEqual({ width: Number(declared?.[1]), height: Number(declared?.[2]) });
  });

  it('matches catalog paths directly and through Nuxt Image (IPX), but no other prefix', () => {
    const glob = support.match(/MEDIA_PATHNAME_GLOB = '([^']+)'/)?.[1] ?? '';
    // Cypress matches a string `pathname` with minimatch and `matchBase: true`.
    const matches = (pathname: string) => minimatch(pathname, glob, { matchBase: true });
    for (const pathname of ['/m/pf/i/hero@640.webp', '/_ipx/w_640&f_webp/m/pf/i/hero.png', '/_ipx/_/m/pf/v/clip.mp4']) {
      expect(matches(pathname), pathname).toBe(true);
    }
    for (const pathname of ['/media/a.png', '/mm/a.png', '/_nuxt/m.js', '/i/portfolio/a.png', '/docs/m']) {
      expect(matches(pathname), pathname).toBe(false);
    }
  });

  it('is served for every catalog media request in every spec', () => {
    expect(support).toMatch(/\{ method: 'GET', pathname: MEDIA_PATHNAME_GLOB \}/);
    expect(support).toContain("MEDIA_PLACEHOLDER_FIXTURE = 'media-placeholder.webp'");
    expect(support).toMatch(/cy\.fixture\(MEDIA_PLACEHOLDER_FIXTURE, null\)/);
    expect(support).toMatch(/'content-type': 'image\/webp'/);
    const e2e = readFileSync(join(e2eRoot, 'support', 'e2e.ts'), 'utf8');
    expect(e2e).toMatch(/beforeEach\(\(\) => \{\s*stubCatalogMedia\(\);\s*\}\)/);
  });
});
