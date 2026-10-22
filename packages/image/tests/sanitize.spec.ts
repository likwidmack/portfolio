import { PDFDocument, PDFName } from 'pdf-lib';
import sharp from 'sharp';

import {
  IDENTIFIER_DENYLIST,
  probeMedia,
  resolveFfmpegPath,
  sanitizeFormatForFilename,
  sanitizeMedia,
  scanForIdentifiers,
  sniffSanitizeFormat,
} from '../src/sanitize.js';
import {
  PLANTED,
  SVG_WITH_IDENTIFIERS,
  animatedGif,
  jpegWithIdentifiers,
  mp4WithIdentifiers,
  pdfWithIdentifiers,
  pngChunkTypes,
  pngWithIdentifiers,
  webpWithIdentifiers,
} from './support/sanitize-fixtures.js';

const ffmpeg = resolveFfmpegPath();
const mp4Fixture = mp4WithIdentifiers(ffmpeg);
const MP4_SKIP_REASON = 'skipped: no ffmpeg (FFMPEG_PATH, PATH or ffmpeg-static) can run here';

describe('denylist', () => {
  it('covers the plan tokens', () => {
    for (const token of [
      'c2pa',
      'xmp:DocumentID',
      'xmp:InstanceID',
      'Adobe',
      'Midjourney',
      'DALL',
      'openai',
      'Figma',
      'inkscape',
      'sodipodi',
    ]) {
      expect(IDENTIFIER_DENYLIST).toContain(token);
    }
  });

  it('finds planted tokens in every fixture before sanitizing (the fixtures are meaningful)', async () => {
    expect(scanForIdentifiers(await jpegWithIdentifiers(), 'jpeg')).toEqual(
      expect.arrayContaining(['exif', 'xmp', 'Adobe'])
    );
    expect(scanForIdentifiers(await pngWithIdentifiers(), 'png')).toEqual(
      expect.arrayContaining(['png:tEXt', 'png:iTXt', 'png:caBX', 'c2pa', 'Midjourney'])
    );
    expect(scanForIdentifiers(Buffer.from(SVG_WITH_IDENTIFIERS), 'svg')).toEqual(
      expect.arrayContaining(['inkscape', 'sodipodi', 'Figma', 'Adobe'])
    );
    expect(scanForIdentifiers(await pdfWithIdentifiers(), 'pdf')).toEqual(
      expect.arrayContaining(['xmp:DocumentID', 'Adobe', 'pdf:trailer-id'])
    );
  });
});

describe('sanitizeFormatForFilename', () => {
  it('maps extensions to sanitizer formats', () => {
    expect(sanitizeFormatForFilename('a.JPG')).toBe('jpeg');
    expect(sanitizeFormatForFilename('a.jpeg')).toBe('jpeg');
    expect(sanitizeFormatForFilename('b.png')).toBe('png');
    expect(sanitizeFormatForFilename('c.webp')).toBe('webp');
    expect(sanitizeFormatForFilename('d.svg')).toBe('svg');
    expect(sanitizeFormatForFilename('e.pdf')).toBe('pdf');
    expect(sanitizeFormatForFilename('f.mp4')).toBe('mp4');
    expect(sanitizeFormatForFilename('g.html')).toBeNull();
  });
});

describe('sniffSanitizeFormat', () => {
  it('detects the real format from the bytes', async () => {
    expect(sniffSanitizeFormat(await jpegWithIdentifiers())).toBe('jpeg');
    expect(sniffSanitizeFormat(await pngWithIdentifiers())).toBe('png');
    expect(sniffSanitizeFormat(await webpWithIdentifiers())).toBe('webp');
    expect(sniffSanitizeFormat(await animatedGif())).toBe('gif');
    expect(sniffSanitizeFormat(Buffer.from(SVG_WITH_IDENTIFIERS))).toBe('svg');
    expect(sniffSanitizeFormat(await pdfWithIdentifiers())).toBe('pdf');
    if (mp4Fixture) {
      expect(sniffSanitizeFormat(mp4Fixture)).toBe('mp4');
    }
    expect(sniffSanitizeFormat(Buffer.from('<html></html>'))).toBeNull();
  });
});

describe('raster', () => {
  it('GIF: keeps every frame of an animation', async () => {
    const out = await sanitizeMedia(await animatedGif(), { format: 'gif' });
    const meta = await sharp(out, { animated: true }).metadata();
    expect(meta.pages).toBe(3);
    expect(await probeMedia(out, 'gif')).toEqual({ width: 8, height: 8, durationSec: null });
  });

  it('JPEG: drops EXIF (maker, serial) and XMP, keeps ICC, applies orientation', async () => {
    const input = await jpegWithIdentifiers();
    const out = await sanitizeMedia(input, { format: 'jpeg' });
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    expect(meta.icc).toBeDefined();
    expect(meta.orientation).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([20, 40]);
    expect(out.includes(PLANTED.serial)).toBe(false);
    expect(out.includes(PLANTED.make)).toBe(false);
    expect(scanForIdentifiers(out, 'jpeg')).toEqual([]);
  });

  it('PNG: drops tEXt / iTXt / caBX (C2PA) chunks, EXIF and XMP', async () => {
    const out = await sanitizeMedia(await pngWithIdentifiers(), { format: 'png' });
    const types = pngChunkTypes(out);
    for (const type of ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'caBX']) {
      expect(types).not.toContain(type);
    }
    expect(scanForIdentifiers(out, 'png')).toEqual([]);
    expect((await sharp(out).metadata()).width).toBe(40);
  });

  it('WebP: drops EXIF and XMP, keeps ICC', async () => {
    const out = await sanitizeMedia(await webpWithIdentifiers(), { format: 'webp' });
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.icc).toBeDefined();
    expect(scanForIdentifiers(out, 'webp')).toEqual([]);
  });

  it('is deterministic (the manifest hashes the sanitized bytes)', async () => {
    const input = await pngWithIdentifiers();
    const a = await sanitizeMedia(input, { format: 'png' });
    const b = await sanitizeMedia(input, { format: 'png' });
    expect(a.equals(b)).toBe(true);
  });
});

describe('svg', () => {
  it('removes metadata, editor namespaces, comments and editor ids; keeps viewBox, title, desc and referenced ids', async () => {
    const out = (await sanitizeMedia(Buffer.from(SVG_WITH_IDENTIFIERS), { format: 'svg' })).toString('utf8');
    expect(scanForIdentifiers(Buffer.from(out), 'svg')).toEqual([]);
    expect(out).not.toContain('<metadata');
    expect(out).not.toContain('<!--');
    expect(out).not.toMatch(/inkscape|sodipodi|figma/i);
    expect(out).not.toContain('Layer_1');
    expect(out).not.toContain('rect1234');
    expect(out).not.toContain('path5678');
    expect(out).toContain('viewBox="0 0 120 60"');
    expect(out).toContain('<title id="title">Flow diagram</title>');
    expect(out).toContain('<desc id="desc">Two boxes joined by an arrow.</desc>');
    expect(out).toContain('aria-labelledby="title desc"');
    expect(out).toContain('id="fade"');
    expect(out).toContain('url(#fade)');
  });

  it('removes scripts, event handlers, foreignObject and hrefs that are not #fragment or data:image/', async () => {
    const hostile = [
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10" onload="alert(1)">',
      '<script>alert(2)</script>',
      '<foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">html</div></foreignObject>',
      '<defs><path id="shape" d="M0 0h5v5z"/></defs>',
      '<a href="javascript:alert(3)"><rect width="5" height="5" onclick="alert(4)"/></a>',
      '<a xlink:href=" JavaScript:alert(5)"><circle r="2"/></a>',
      '<image href="https://evil.example/track.png" width="5" height="5"/>',
      '<image xlink:href="//evil.example/x.png" width="5" height="5"/>',
      '<image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/>',
      '<use href="#shape"/><use xlink:href="#shape"/>',
      '<set attributeName="href" to="javascript:alert(6)"/>',
      '</svg>',
    ].join('');
    const out = (await sanitizeMedia(Buffer.from(hostile), { format: 'svg' })).toString('utf8');
    expect(out).not.toMatch(/<script|onload|onclick|alert|foreignObject|<div|javascript|evil\.example|<set/i);
    expect(out).toContain('href="data:image/png;base64,iVBORw0KGgo="');
    expect(out).toContain('<use href="#shape"/>');
    expect(out).toContain('<use xlink:href="#shape"/>');
    expect(out).toContain('id="shape"');
  });

  it('removes every on* attribute, whatever its case or prefix (not only the SVG 1.1 event list)', async () => {
    const hostile = [
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10" ONLOAD="alert(1)">',
      '<rect width="5" height="5" onpointerdown="alert(2)"/>',
      '<circle r="2" onLoad="alert(3)" xlink:onclick="alert(4)" opacity="0.5"/>',
      '</svg>',
    ].join('');
    const out = (await sanitizeMedia(Buffer.from(hostile), { format: 'svg' })).toString('utf8');
    expect(out).not.toMatch(/\son[a-z]*=|alert/i);
    expect(out).toContain('opacity="0.5"');
  });

  it('drops href animations however attributeName is written', async () => {
    const hostile = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><a>',
      '<set attributeName=" href" to="javascript:alert(1)"/>',
      '<animate attributeName="XLINK:HREF" values="javascript:alert(2)"/>',
      '<animateTransform attributeName="href " to="javascript:alert(3)"/>',
      '<animateMotion attributeName="href" values="javascript:alert(4)"/>',
      '<animate attributeName="opacity" values="0;1" dur="1s"/>',
      '<rect width="5" height="5"/></a></svg>',
    ].join('');
    const out = (await sanitizeMedia(Buffer.from(hostile), { format: 'svg' })).toString('utf8');
    expect(out).not.toMatch(/javascript|href/i);
    expect(out).toContain('attributeName="opacity"');
  });

  it('allows only raster data: URLs (no data:image/svg+xml)', async () => {
    const inner = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString('base64');
    const hostile = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">',
      `<use href="data:image/svg+xml;base64,${inner}"/>`,
      '<image href="data:image/svg+xml,%3Csvg%3E" width="1" height="1"/>',
      '<image href="data:image/jpeg;base64,/9j/" width="1" height="1"/>',
      '<image href="data:image/avif;base64,AAAA" width="1" height="1"/>',
      '<image href="data:image/pngx;base64,AAAA" width="1" height="1"/>',
      '</svg>',
    ].join('');
    const out = (await sanitizeMedia(Buffer.from(hostile), { format: 'svg' })).toString('utf8');
    expect(out).not.toMatch(/svg\+xml|pngx/);
    expect(out).toContain('href="data:image/jpeg;base64,/9j/"');
    expect(out).toContain('href="data:image/avif;base64,AAAA"');
  });

  it('drops elements in a non-SVG namespace and xml:base', async () => {
    const hostile = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" xml:base="https://evil.example/">',
      '<iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example/frame"/>',
      '<g xml:base="https://evil.example/x/" xml:space="preserve"><rect width="5" height="5"/></g>',
      '<g xmlns="http://www.w3.org/2000/svg"><circle r="1"/></g>',
      '</svg>',
    ].join('');
    const out = (await sanitizeMedia(Buffer.from(hostile), { format: 'svg' })).toString('utf8');
    expect(out).not.toMatch(/iframe|evil\.example|xml:base|xhtml/);
    expect(out).toContain('xml:space="preserve"');
    expect(out).toContain('<circle r="1"/>');
  });

  it('is idempotent', async () => {
    const once = await sanitizeMedia(Buffer.from(SVG_WITH_IDENTIFIERS), { format: 'svg' });
    const twice = await sanitizeMedia(once, { format: 'svg' });
    expect(twice.equals(once)).toBe(true);
  });
});

describe('pdf', () => {
  it('sets Title / Author / Subject, clears Producer / Creator / Keywords / dates, removes XMP, PieceInfo and the trailer /ID', async () => {
    const out = await sanitizeMedia(await pdfWithIdentifiers(), {
      format: 'pdf',
      document: { title: 'Tamara Mack resume', author: 'Tamara Mack', subject: 'Resume 2026' },
    });
    expect(scanForIdentifiers(out, 'pdf')).toEqual([]);
    const doc = await PDFDocument.load(out, { updateMetadata: false });
    expect(doc.getTitle()).toBe('Tamara Mack resume');
    expect(doc.getAuthor()).toBe('Tamara Mack');
    expect(doc.getSubject()).toBe('Resume 2026');
    expect(doc.getProducer()).toBeUndefined();
    expect(doc.getCreator()).toBeUndefined();
    expect(doc.getKeywords()).toBeUndefined();
    expect(doc.getCreationDate()).toBeUndefined();
    expect(doc.catalog.get(PDFName.of('Metadata'))).toBeUndefined();
    expect(doc.catalog.get(PDFName.of('PieceInfo'))).toBeUndefined();
    expect(doc.context.trailerInfo.ID).toBeUndefined();
    expect(out.includes(PLANTED.documentId)).toBe(false);
    expect(doc.getPageCount()).toBe(1);
  });

  it('removes the source Author / Subject when no replacement is given', async () => {
    const source = await PDFDocument.load(await pdfWithIdentifiers(), { updateMetadata: false });
    source.setAuthor('Third Party Studio');
    source.setSubject('Exported by a vendor');
    const input = Buffer.from(await source.save({ useObjectStreams: false }));
    const out = await sanitizeMedia(input, { format: 'pdf', document: { title: 'Resume', author: '  ' } });
    const doc = await PDFDocument.load(out, { updateMetadata: false });
    expect(doc.getTitle()).toBe('Resume');
    expect(doc.getAuthor()).toBeUndefined();
    expect(doc.getSubject()).toBeUndefined();
  });

  it('is deterministic', async () => {
    const input = await pdfWithIdentifiers();
    const document = { title: 'Resume', author: 'Tamara Mack' };
    const a = await sanitizeMedia(input, { format: 'pdf', document });
    const b = await sanitizeMedia(input, { format: 'pdf', document });
    expect(a.equals(b)).toBe(true);
  });

  it('needs a title', async () => {
    await expect(sanitizeMedia(await pdfWithIdentifiers(), { format: 'pdf' })).rejects.toThrow(/title/);
  });
});

describe('mp4', () => {
  it.skipIf(!mp4Fixture)(
    `remuxes without container metadata or encoder tags${mp4Fixture ? '' : ` (${MP4_SKIP_REASON})`}`,
    async () => {
      const input = mp4Fixture as Buffer;
      expect(scanForIdentifiers(input, 'mp4')).toEqual(expect.arrayContaining(['Midjourney', 'openai']));
      const out = await sanitizeMedia(input, { format: 'mp4', ffmpegPath: ffmpeg as string });
      expect(scanForIdentifiers(out, 'mp4')).toEqual([]);
      expect(out.includes('Lavf')).toBe(false);
      const before = await probeMedia(input, 'mp4');
      const after = await probeMedia(out, 'mp4');
      expect(after).toEqual(before);
      expect(after).toEqual({ width: 64, height: 48, durationSec: 1 });
    }
  );

  it.skipIf(!mp4Fixture)(`is deterministic${mp4Fixture ? '' : ` (${MP4_SKIP_REASON})`}`, async () => {
    const a = await sanitizeMedia(mp4Fixture as Buffer, { format: 'mp4', ffmpegPath: ffmpeg as string });
    const b = await sanitizeMedia(mp4Fixture as Buffer, { format: 'mp4', ffmpegPath: ffmpeg as string });
    expect(a.equals(b)).toBe(true);
  });
});

describe('probeMedia', () => {
  it('measures rasters (after orientation) and svgs', async () => {
    const jpeg = await sanitizeMedia(await jpegWithIdentifiers(), { format: 'jpeg' });
    expect(await probeMedia(jpeg, 'jpeg')).toEqual({ width: 20, height: 40, durationSec: null });
    expect(await probeMedia(Buffer.from(SVG_WITH_IDENTIFIERS), 'svg')).toEqual({
      width: 120,
      height: 60,
      durationSec: null,
    });
  });

  it('returns nulls for documents', async () => {
    expect(await probeMedia(await pdfWithIdentifiers(), 'pdf')).toEqual({
      width: null,
      height: null,
      durationSec: null,
    });
  });
});
