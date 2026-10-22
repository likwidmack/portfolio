/**
 * Audit sanitized bytes for third-party identifiers: metadata structures that should be gone (EXIF,
 * XMP, PNG text chunks, C2PA, PDF `/ID`, ...) plus a denylist of tool and vendor names. Only bytes
 * that can carry metadata are searched (JPEG segments before the scan data, PNG / WebP chunks other
 * than pixels and ICC, MP4 boxes other than `mdat`, PDF objects and metadata streams), so compressed
 * media does not produce random matches.
 */
import { mp4MetadataBytes } from './mp4-boxes.js';
import type { SanitizeFormat } from './sanitize-format.js';

export const IDENTIFIER_DENYLIST = [
  'c2pa',
  'xmp:DocumentID',
  'xmp:InstanceID',
  'xmpMM:DocumentID',
  'xmpMM:InstanceID',
  'Adobe',
  'Midjourney',
  'DALL',
  'openai',
  'Figma',
  'inkscape',
  'sodipodi',
] as const;

type Audit = { findings: string[]; haystack: Buffer };

function jpegAudit(buf: Buffer): Audit {
  const findings: string[] = [];
  const parts: Buffer[] = [];
  let offset = 2;
  while (offset + 4 <= buf.length && buf[offset] === 0xff) {
    const marker = buf[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      break;
    }
    const length = buf.readUInt16BE(offset + 2);
    const body = buf.subarray(offset + 4, offset + 2 + length);
    if (marker === 0xe1 && body.subarray(0, 6).toString('latin1') === 'Exif\0\0') {
      findings.push('exif');
    } else if (marker === 0xe1 && body.toString('latin1', 0, 28) === 'http://ns.adobe.com/xap/1.0/') {
      findings.push('xmp');
    } else if (marker === 0xed) {
      findings.push('iptc');
    } else if (marker === 0xeb) {
      findings.push('jpeg:app11-jumbf');
    }
    if (!(marker === 0xe2 && body.toString('latin1', 0, 11) === 'ICC_PROFILE')) {
      parts.push(body);
    }
    offset += 2 + length;
  }
  return { findings, haystack: Buffer.concat(parts) };
}

const PNG_METADATA_CHUNKS = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'caBX']);
const PNG_PIXEL_CHUNKS = new Set(['IDAT', 'iCCP', 'fdAT']);

function pngAudit(buf: Buffer): Audit {
  const findings: string[] = [];
  const parts: Buffer[] = [];
  for (let offset = 8; offset + 8 <= buf.length;) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    if (PNG_METADATA_CHUNKS.has(type)) {
      findings.push(`png:${type}`);
    }
    if (!PNG_PIXEL_CHUNKS.has(type)) {
      parts.push(buf.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  return { findings, haystack: Buffer.concat(parts) };
}

const WEBP_PIXEL_CHUNKS = new Set(['VP8 ', 'VP8L', 'ALPH', 'ANMF', 'ICCP']);

function webpAudit(buf: Buffer): Audit {
  const findings: string[] = [];
  const parts: Buffer[] = [];
  for (let offset = 12; offset + 8 <= buf.length;) {
    const type = buf.toString('latin1', offset, offset + 4);
    const length = buf.readUInt32LE(offset + 4);
    if (type === 'EXIF') {
      findings.push('exif');
    } else if (type === 'XMP ') {
      findings.push('xmp');
    }
    if (!WEBP_PIXEL_CHUNKS.has(type)) {
      parts.push(buf.subarray(offset + 8, offset + 8 + length));
    }
    offset += 8 + length + (length % 2);
  }
  return { findings, haystack: Buffer.concat(parts) };
}

/** Blank stream payloads except XMP / XML metadata streams; drop the standard CID `/Registry (Adobe)`. */
function pdfAudit(buf: Buffer): Audit {
  const text = buf.toString('latin1');
  const findings: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/\/ID\s*\[/, 'pdf:trailer-id'],
    [/\/Metadata\b/, 'pdf:metadata'],
    [/\/PieceInfo\b/, 'pdf:pieceinfo'],
    [/\/Producer\b/, 'pdf:producer'],
    [/\/Creator\b/, 'pdf:creator'],
    [/\/Keywords\b/, 'pdf:keywords'],
  ];
  for (const [pattern, finding] of checks) {
    if (pattern.test(text)) {
      findings.push(finding);
    }
  }
  const haystack = text
    .replace(/stream\r?\n([\s\S]*?)endstream/g, (whole, _body: string, index: number) => {
      const dict = text.slice(Math.max(0, index - 300), index);
      return /\/Type\s*\/Metadata|\/Subtype\s*\/XML/.test(dict) ? whole : 'stream endstream';
    })
    .replace(/\/Registry\s*\(Adobe\)/g, '');
  return { findings, haystack: Buffer.from(haystack, 'latin1') };
}

function audit(bytes: Buffer, format: SanitizeFormat): Audit {
  switch (format) {
    case 'jpeg':
      return jpegAudit(bytes);
    case 'png':
      return pngAudit(bytes);
    case 'webp':
      return webpAudit(bytes);
    case 'pdf':
      return pdfAudit(bytes);
    case 'mp4':
      return { findings: [], haystack: mp4MetadataBytes(bytes) };
    case 'svg':
    case 'avif':
    case 'gif':
      return { findings: [], haystack: bytes };
    default: {
      const unreachable: never = format;
      throw new Error(`Unsupported format: ${String(unreachable)}`);
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Identifier findings in `bytes` (empty when clean): structural ones (`exif`, `xmp`, `png:tEXt`,
 * `pdf:trailer-id`, ...) then denylist tokens. All-caps tokens (`DALL`) match case-sensitively,
 * the rest ignore case (`OpenAI` matches `openai`).
 */
export function scanForIdentifiers(bytes: Buffer, format: SanitizeFormat): string[] {
  const { findings, haystack } = audit(bytes, format);
  const text = haystack.toString('latin1');
  for (const token of IDENTIFIER_DENYLIST) {
    const flags = token === token.toUpperCase() ? '' : 'i';
    if (new RegExp(escapeRegExp(token), flags).test(text)) {
      findings.push(token);
    }
  }
  return [...new Set(findings)];
}
