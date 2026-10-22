/** Programmatic fixtures that carry known third-party identifiers, for the sanitizer tests. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';

import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

export const PLANTED = {
  serial: 'SERIAL998877',
  make: 'AdobeCam',
  documentId: 'xmp.did:5f3a0b2c',
  instanceId: 'xmp.iid:7e9d1c4b',
};

const XMP = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
 xmp:CreatorTool="Adobe Photoshop / Midjourney / DALL-E / openai / Figma" xmp:DocumentID="${PLANTED.documentId}"
 xmp:InstanceID="${PLANTED.instanceId}" xmpMM:DocumentID="${PLANTED.documentId}" xmpMM:InstanceID="${PLANTED.instanceId}"/>
<!-- c2pa manifest store reference -->
</rdf:RDF></x:xmpmeta>`;

const EXIF = {
  IFD0: { Make: PLANTED.make, Model: 'Midjourney v6', Software: 'openai DALL-E', Artist: 'Figma export' },
  IFD2: { BodySerialNumber: PLANTED.serial },
};

function base(width = 40, height = 20) {
  return sharp({ create: { width, height, channels: 3, background: { r: 51, g: 102, b: 153 } } });
}

/** JPEG with EXIF (maker, model, serial), XMP ids, an sRGB ICC profile and EXIF orientation 6. */
export async function jpegWithIdentifiers(): Promise<Buffer> {
  const tagged = await base().withIccProfile('srgb').withExif(EXIF).withXmp(XMP).jpeg().toBuffer();
  return sharp(tagged).withMetadata({ orientation: 6 }).jpeg().toBuffer();
}

export async function webpWithIdentifiers(): Promise<Buffer> {
  return base().withIccProfile('srgb').withExif(EXIF).withXmp(XMP).webp().toBuffer();
}

/** 3-frame 8x8 animated GIF. */
export async function animatedGif(): Promise<Buffer> {
  const frames = await Promise.all(
    [0, 120, 240].map((r) =>
      sharp({ create: { width: 8, height: 8, channels: 4, background: { r, g: 255 - r, b: 60, alpha: 1 } } })
        .raw()
        .toBuffer()
    )
  );
  return sharp(Buffer.concat(frames), { raw: { width: 8, height: 24, channels: 4, pageHeight: 8 } })
    .gif()
    .toBuffer();
}

function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** PNG types in file order. */
export function pngChunkTypes(png: Buffer): string[] {
  const types: string[] = [];
  for (let offset = 8; offset + 8 <= png.length;) {
    const length = png.readUInt32BE(offset);
    types.push(png.toString('latin1', offset + 4, offset + 8));
    offset += 12 + length;
  }
  return types;
}

/** PNG with tEXt / iTXt prompt chunks (as AI generators write), a C2PA `caBX` chunk, EXIF and XMP. */
export async function pngWithIdentifiers(): Promise<Buffer> {
  const png = await base().withExif(EXIF).withXmp(XMP).png().toBuffer();
  const iend = png.length - 12;
  const extra = Buffer.concat([
    pngChunk('tEXt', Buffer.from('parameters\0Midjourney prompt --job 0f8fad5b openai', 'latin1')),
    pngChunk('iTXt', Buffer.from('Description\0\0\0\0\0DALL-E c2pa job id', 'latin1')),
    pngChunk('caBX', Buffer.from('jumbc2pa manifest openai', 'latin1')),
  ]);
  return Buffer.concat([png.subarray(0, iend), extra, png.subarray(iend)]);
}

export const SVG_WITH_IDENTIFIERS = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator 28.0, Figma export -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:figma="http://www.figma.com/figma/ns"
  viewBox="0 0 120 60" role="img" aria-labelledby="title desc" inkscape:version="1.3" sodipodi:docname="x.svg">
  <title id="title">Flow diagram</title>
  <desc id="desc">Two boxes joined by an arrow.</desc>
  <metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><cc:Work xmlns:cc="http://creativecommons.org/ns#">xmp:DocumentID c2pa openai</cc:Work></rdf:RDF></metadata>
  <sodipodi:namedview id="namedview7" inkscape:zoom="2"/>
  <defs><linearGradient id="fade"><stop offset="0" stop-color="#000"/></linearGradient></defs>
  <g id="Layer_1" inkscape:label="Layer 1" inkscape:groupmode="layer" figma:type="frame" data-figma-id="12:34">
    <rect id="rect1234" width="40" height="20" fill="url(#fade)"/>
    <path id="path5678" d="M40 10h40"/>
  </g>
</svg>
`;

/** PDF with Producer / Creator / Keywords, an XMP stream with document and instance ids, and a trailer /ID. */
export async function pdfWithIdentifiers(): Promise<Buffer> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const page = doc.addPage([200, 100]);
  page.drawText('Resume', { x: 10, y: 50, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) });
  doc.setTitle('Old title from Adobe Acrobat');
  doc.setProducer('Adobe PDF Library 17 / Figma');
  doc.setCreator('Microsoft Word with Midjourney');
  doc.setKeywords(['openai', 'DALL-E']);
  const xmp = doc.context.stream(XMP, { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(xmp));
  doc.catalog.set(
    PDFName.of('PieceInfo'),
    doc.context.obj({ Illustrator: { Private: PDFString.of('Adobe AI private data') } })
  );
  doc.context.trailerInfo.ID = doc.context.obj([PDFString.of('c2pa-document-id'), PDFString.of('c2pa-instance-id')]);
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** Small MP4 made with ffmpeg itself, tagged with vendor metadata; `null` when ffmpeg cannot run. */
export function mp4WithIdentifiers(ffmpegPath: string | null): Buffer | null {
  if (!ffmpegPath) {
    return null;
  }
  const dir = mkdtempSync(join(tmpdir(), 'tgmc-mp4-fixture-'));
  try {
    const out = join(dir, 'fixture.mp4');
    const run = spawnSync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'testsrc=size=64x48:rate=10:duration=1',
        '-c:v',
        'mpeg4',
        '-metadata',
        'title=Midjourney job 0f8fad5b-d9cb-469f-a165-70867728950e',
        '-metadata',
        'comment=openai c2pa DALL-E',
        '-metadata',
        'artist=Adobe Premiere',
        '-metadata:s:v',
        'handler_name=Figma video handler',
        out,
      ],
      { stdio: 'pipe' }
    );
    return run.status === 0 ? readFileSync(out) : null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
