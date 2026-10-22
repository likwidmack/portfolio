import {
  SITE_MEDIA_TAG,
  serializeSiteManifest,
  siteEntryFromAsset,
  siteEntryToAsset,
  siteMediaId,
  uniqueSiteMediaName,
  uuidV5,
  validateSiteManifest,
  type SiteMediaEntry,
} from '../src/site-manifest.js';
import type { MediaChild } from '../src/types.js';

const SHA = 'a'.repeat(64);

function entry(overrides: Partial<SiteMediaEntry> = {}): SiteMediaEntry {
  return {
    id: siteMediaId('/i/portfolio/manhattan-2150-keyframe.png'),
    tenant: 'portfolio',
    kind: 'image',
    name: 'manhattan-2150-keyframe',
    ext: 'png',
    path: 'm/pf/i/manhattan-2150-keyframe.png',
    title: 'Manhattan 2150 keyframe',
    alt: 'Futuristic Manhattan skyline keyframe',
    description: null,
    credit: 'Tamara Mack',
    sha256: SHA,
    width: 1672,
    height: 941,
    durationSec: null,
    lqip: 'data:image/webp;base64,AAAA',
    dominantColor: '#1c558e',
    variants: [],
    legacyPath: '/i/portfolio/manhattan-2150-keyframe.png',
    ...overrides,
  };
}

describe('ids', () => {
  it('uuidV5 matches the RFC 4122 reference vector', () => {
    expect(uuidV5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
      '2ed6657d-e927-568b-95e1-2665a8aea6a2'
    );
  });

  it('siteMediaId is deterministic per legacy path and distinct across paths', () => {
    expect(siteMediaId('/d/Resume2026.pdf')).toBe(siteMediaId('/d/Resume2026.pdf'));
    expect(siteMediaId('/d/Resume2026.pdf')).not.toBe(siteMediaId('/d/resume2026.pdf'));
    expect(siteMediaId('/d/Resume2026.pdf')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});

describe('uniqueSiteMediaName', () => {
  it('returns the name when free and the first free -n suffix otherwise', () => {
    const taken = new Set(['social-card']);
    expect(uniqueSiteMediaName('hero', 'png', (name) => taken.has(name))).toBe('hero');
    expect(uniqueSiteMediaName('social-card', 'png', (name) => taken.has(name))).toBe('social-card-2');
    taken.add('social-card-2');
    expect(uniqueSiteMediaName('social-card', 'png', (name) => taken.has(name))).toBe('social-card-3');
  });
});

describe('validateSiteManifest', () => {
  it('accepts a valid manifest', () => {
    const result = validateSiteManifest({ version: 1, entries: [entry()] });
    expect(result.errors).toEqual([]);
    expect(result.manifest?.entries).toHaveLength(1);
    expect(result.metaIssues).toEqual({});
  });

  it('rejects structural problems with the entry named', () => {
    const result = validateSiteManifest({
      version: 1,
      entries: [
        entry({ path: 'm/pf/i/other.png' }),
        entry({ id: 'x', sha256: 'nope', width: -1, variants: ['p'], dominantColor: 'blue', lqip: 'http://x' }),
        { ...entry({ id: siteMediaId('/b') }), titel: 'typo' },
      ],
    });
    expect(result.manifest).toBeNull();
    const text = result.errors.join('\n');
    expect(text).toMatch(/path must be m\/pf\/i\/manhattan-2150-keyframe\.png/);
    expect(text).toMatch(/id must be a UUID/);
    expect(text).toMatch(/sha256/);
    expect(text).toMatch(/width/);
    expect(text).toMatch(/variants/);
    expect(text).toMatch(/dominantColor/);
    expect(text).toMatch(/lqip/);
    expect(text).toMatch(/unknown key "titel"/);
  });

  it('rejects duplicate ids, names and legacy paths', () => {
    const a = entry();
    const result = validateSiteManifest({ version: 1, entries: [a, { ...a }] });
    const text = result.errors.join('\n');
    expect(text).toMatch(/duplicate id/);
    expect(text).toMatch(/duplicate name/);
    expect(text).toMatch(/duplicate legacyPath/);
  });

  it.each(['/i/../secret.png', '/../x.png', '/i/./a.png', 'i/a.png', '/i/a\\b.png'])(
    'rejects legacyPath %s',
    (legacyPath) => {
      const result = validateSiteManifest({ version: 1, entries: [entry({ legacyPath })] });
      expect(result.errors.join('\n')).toMatch(/legacyPath/);
    }
  );

  it.each([
    { kind: 'image', ext: 'pdf' },
    { kind: 'image', ext: 'svg' },
    { kind: 'svg', ext: 'png' },
    { kind: 'video', ext: 'gif' },
    { kind: 'document', ext: 'mp4' },
    { kind: 'image', ext: 'xyz' },
  ] as const)('rejects kind $kind with extension $ext', ({ kind, ext }) => {
    const kindCode = { image: 'i', svg: 's', video: 'v', document: 'd' }[kind];
    const result = validateSiteManifest({
      version: 1,
      entries: [entry({ kind, ext, path: `m/pf/${kindCode}/manhattan-2150-keyframe.${ext}` })],
    });
    expect(result.errors.join('\n')).toMatch(new RegExp(`ext \\.${ext} does not match kind ${kind}`));
  });

  it.each([
    { kind: 'image', ext: 'jpg', code: 'i' },
    { kind: 'image', ext: 'gif', code: 'i' },
    { kind: 'svg', ext: 'svg', code: 's' },
    { kind: 'video', ext: 'mp4', code: 'v' },
    { kind: 'document', ext: 'pdf', code: 'd' },
  ] as const)('accepts kind $kind with extension $ext', ({ kind, ext, code }) => {
    const result = validateSiteManifest({
      version: 1,
      entries: [entry({ kind, ext, path: `m/pf/${code}/manhattan-2150-keyframe.${ext}` })],
    });
    expect(result.errors).toEqual([]);
  });

  it('rejects a wrong version or shape', () => {
    expect(validateSiteManifest({ version: 2, entries: [] }).errors[0]).toMatch(/version/);
    expect(validateSiteManifest([]).errors[0]).toMatch(/object/);
  });

  it('reports metadata policy issues per entry without failing the structure (drafts)', () => {
    const draft = entry({ title: '', alt: null, reviewNotes: ['check: title derived from filename'] });
    const result = validateSiteManifest({ version: 1, entries: [draft] });
    expect(result.errors).toEqual([]);
    expect(result.metaIssues[draft.id].map((issue) => issue.field)).toEqual(['title', 'alt']);
  });
});

describe('catalog mapping', () => {
  it('siteEntryToAsset keeps id / name / path and puts editorial + computed fields in meta (no review notes)', () => {
    const asset = siteEntryToAsset(entry({ reviewNotes: ['check: x'] }), {
      byteSize: 10,
      mime: 'image/png',
      createdAt: '2026-10-02T00:00:00.000Z',
    });
    expect(asset).toMatchObject({
      id: entry().id,
      tenant: 'portfolio',
      kind: 'image',
      name: 'manhattan-2150-keyframe',
      path: 'm/pf/i/manhattan-2150-keyframe.png',
      sha256: SHA,
      byteSize: 10,
      mime: 'image/png',
    });
    expect(asset.meta).toEqual({
      tags: [SITE_MEDIA_TAG],
      filename: 'manhattan-2150-keyframe.png',
      title: 'Manhattan 2150 keyframe',
      alt: 'Futuristic Manhattan skyline keyframe',
      credit: 'Tamara Mack',
      width: 1672,
      height: 941,
      lqip: 'data:image/webp;base64,AAAA',
      dominantColor: '#1c558e',
      legacyPath: '/i/portfolio/manhattan-2150-keyframe.png',
    });
  });

  it('siteEntryFromAsset round-trips and lists ready catalog variants in order', () => {
    const original = entry();
    const asset = siteEntryToAsset(original, { byteSize: 10, mime: 'image/png', createdAt: 'now' });
    const child = (variant: string, status: MediaChild['status'] = 'ready'): MediaChild => ({
      id: `c-${variant}`,
      assetId: asset.id,
      role: variant,
      variant: variant as MediaChild['variant'],
      recipe: { kind: 'image', ops: [] },
      status,
      path: `m/pf/i/manhattan-2150-keyframe@${variant}.webp`,
      meta: {},
      createdAt: 'now',
      updatedAt: 'now',
    });
    const back = siteEntryFromAsset(asset, [
      child('1280'),
      child('t'),
      child('640', 'pending'),
      child('custom'),
      child('1280'),
    ]);
    expect(back).toEqual({ ...original, variants: ['t', '1280'] });
  });
});

describe('serializeSiteManifest', () => {
  it('writes keys in schema order with a trailing newline', () => {
    const text = serializeSiteManifest({ version: 1, entries: [{ ...entry(), reviewNotes: ['check: x'] }] });
    expect(text.endsWith('}\n')).toBe(true);
    const keys = Object.keys(JSON.parse(text).entries[0]);
    expect(keys.slice(0, 4)).toEqual(['id', 'tenant', 'kind', 'name']);
    expect(keys.at(-1)).toBe('reviewNotes');
  });
});
