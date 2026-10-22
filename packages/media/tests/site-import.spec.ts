import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sha256Hex } from '@tgmc/utilities';

import { createSqliteMediaStores, type SqliteMediaStores } from '../src/create-media-library.js';
import { SITE_IMPORT_AUDIT_ACTION, importSiteMedia, type SiteImportItem } from '../src/site-import.js';
import { siteMediaId, type SiteMediaEntry } from '../src/site-manifest.js';

function item(name: string, bytes: Buffer, overrides: Partial<SiteMediaEntry> = {}): SiteImportItem {
  const legacyPath = `/d/${name}.pdf`;
  return {
    bytes,
    entry: {
      id: siteMediaId(legacyPath),
      tenant: 'portfolio',
      kind: 'document',
      name,
      ext: 'pdf',
      path: `m/pf/d/${name}.pdf`,
      title: `Document ${name}`,
      alt: null,
      description: null,
      credit: 'Tamara Mack',
      sha256: sha256Hex(bytes),
      width: null,
      height: null,
      durationSec: null,
      lqip: null,
      dominantColor: null,
      variants: [],
      legacyPath,
      ...overrides,
    },
  };
}

describe('importSiteMedia (SQLite target)', () => {
  let root: string;
  let stores: SqliteMediaStores;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-site-import-'));
    stores = createSqliteMediaStores({ dbPath: join(root, 'media.sqlite'), blobDir: join(root, 'blobs') });
  });

  afterEach(() => {
    stores.close();
    rmSync(root, { recursive: true, force: true });
  });

  const target = () => ({ catalog: stores.catalog, blobs: stores.blobs, audit: stores.audit });

  it('copies entries with the manifest ids, tagged site, then skips them on a rerun', async () => {
    const a = item('resume', Buffer.from('%PDF-resume'));
    const b = item('deck', Buffer.from('%PDF-deck'));
    const first = await importSiteMedia({ items: [a, b], target: target() });
    expect(first.copied.sort()).toEqual([a.entry.id, b.entry.id].sort());
    expect(first.refused).toEqual([]);
    const asset = await stores.catalog.getAsset(a.entry.id);
    expect(asset).toMatchObject({ path: 'm/pf/d/resume.pdf', mime: 'application/pdf', byteSize: 11 });
    expect(asset?.meta).toMatchObject({ tags: ['site'], title: 'Document resume', legacyPath: '/d/resume.pdf' });
    expect((await stores.blobs.get('m/pf/d/resume.pdf')).toString()).toBe('%PDF-resume');
    const events = await stores.audit.listByEntity(a.entry.id);
    expect(events.map((event) => event.action)).toEqual([SITE_IMPORT_AUDIT_ACTION]);

    const second = await importSiteMedia({ items: [a, b], target: target() });
    expect(second.copied).toEqual([]);
    expect(second.skipped.sort()).toEqual([a.entry.id, b.entry.id].sort());
  });

  it('dry run writes nothing', async () => {
    const report = await importSiteMedia({ items: [item('resume', Buffer.from('x'))], target: target(), dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.copied).toHaveLength(1);
    expect(await stores.catalog.listAssets()).toEqual([]);
  });

  it('reports a conflict when the name is held by another asset, and never overwrites it', async () => {
    const other = item('resume', Buffer.from('owner upload'), { id: '00000000-0000-4000-8000-000000000001' });
    await importSiteMedia({ items: [other], target: target() });
    const mine = item('resume', Buffer.from('%PDF-resume'));
    const report = await importSiteMedia({ items: [mine], target: target() });
    expect(report.conflicts).toEqual([mine.entry.id]);
    expect(report.conflictReasons[mine.entry.id]).toMatch(/held on the target/);
    expect((await stores.blobs.get('m/pf/d/resume.pdf')).toString()).toBe('owner upload');
  });

  it('reports a conflict when the same id already has other bytes', async () => {
    await importSiteMedia({ items: [item('resume', Buffer.from('v1'))], target: target() });
    const report = await importSiteMedia({ items: [item('resume', Buffer.from('v2'))], target: target() });
    expect(report.conflicts).toHaveLength(1);
  });

  it('refuses entries with unresolved review notes unless allowUnreviewed', async () => {
    const draft = item('resume', Buffer.from('x'), { reviewNotes: ['check: alt text'] });
    const refused = await importSiteMedia({ items: [draft], target: target() });
    expect(refused.copied).toEqual([]);
    expect(refused.refused).toEqual([{ id: draft.entry.id, reason: expect.stringMatching(/review notes.*alt text/) }]);
    const rehearsal = await importSiteMedia({ items: [draft], target: target(), allowUnreviewed: true });
    expect(rehearsal.copied).toEqual([draft.entry.id]);
    expect((await stores.catalog.getAsset(draft.entry.id))?.meta.reviewNotes).toBeUndefined();
  });

  it('refuses entries that fail the metadata policy', async () => {
    const bad = item('resume', Buffer.from('x'), { title: 'IMG_1234' });
    const report = await importSiteMedia({ items: [bad], target: target() });
    expect(report.refused[0]).toMatchObject({ id: bad.entry.id, reason: expect.stringMatching(/title/) });
  });

  it('skips an entry already imported with the same id, path and manifest sha256, even if fresh bytes differ (tool upgrade)', async () => {
    const imported = item('resume', Buffer.from('%PDF-resume'));
    await importSiteMedia({ items: [imported], target: target() });
    const rerun = { entry: imported.entry, bytes: Buffer.from('%PDF-resume re-sanitized by a newer tool') };
    for (const dryRun of [true, false]) {
      const report = await importSiteMedia({ items: [rerun], target: target(), dryRun });
      expect(report.failed).toEqual([]);
      expect(report.skipped).toEqual([imported.entry.id]);
    }
    expect((await stores.blobs.get('m/pf/d/resume.pdf')).toString()).toBe('%PDF-resume');
  });

  it('loads lazy bytes only for entries it imports: a rerun with no ffmpeg skips cleanly', async () => {
    const video = item('reel', Buffer.from('%PDF-reel'));
    await importSiteMedia({ items: [video], target: target() });
    let loads = 0;
    const noFfmpeg = () => {
      loads += 1;
      return Promise.reject(new Error('No ffmpeg found for MP4 sanitizing'));
    };
    const rerun = await importSiteMedia({ items: [{ entry: video.entry, bytes: noFfmpeg }], target: target() });
    expect(rerun.skipped).toEqual([video.entry.id]);
    expect(rerun.failed).toEqual([]);
    expect(loads).toBe(0);

    const fresh = item('new-reel', Buffer.from('x'));
    const report = await importSiteMedia({ items: [{ entry: fresh.entry, bytes: noFfmpeg }], target: target() });
    expect(report.failed).toEqual([{ id: fresh.entry.id, error: expect.stringMatching(/No ffmpeg/) }]);
    expect(loads).toBe(1);
    const ok = await importSiteMedia({
      items: [{ entry: fresh.entry, bytes: async () => fresh.bytes }],
      target: target(),
    });
    expect(ok.copied).toEqual([fresh.entry.id]);
  });

  it('fails an entry whose bytes do not hash to the manifest sha256', async () => {
    const stale = item('resume', Buffer.from('x'), { sha256: 'b'.repeat(64) });
    const report = await importSiteMedia({ items: [stale], target: target() });
    expect(report.failed).toEqual([
      { id: stale.entry.id, error: expect.stringMatching(/sha256.*media:site-manifest/) },
    ]);
    expect(await stores.catalog.listAssets()).toEqual([]);
  });
});
