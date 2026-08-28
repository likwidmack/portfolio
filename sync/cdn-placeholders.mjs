#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/** 1×1 PNG. */
export const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** 1×1 GIF. */
export const GIF_1X1 = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/** 1×1 lossy WebP. */
export const WEBP_1X1 = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64",
);

/** Minimal SOF0 1×1 JPEG. */
export const JPEG_1X1 = Buffer.from(
  "ffd8ffdb00430001010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101ffc0000b080001000101011100ffc40014000100000000000000000000000000000008ffc400141001000000000000000000000000000000ffda0008010100003f007fffd9",
  "hex",
);

function pngAsIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(1, 6);
  header.writeUInt8(1, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

export const ICO_1X1 = pngAsIco(PNG_1X1);

export const SVG_1X1 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>\n',
  "utf8",
);

export const MP4_STUB = Buffer.concat([
  Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00,
    0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31,
  ]),
  Buffer.from([0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74]),
]);

export const WEBM_STUB = Buffer.from(
  "1a45dfa3010000000000001f4286810142f7810142f2810442f381084282847765626d4287810442858102",
  "hex",
);

export const PDF_STUB = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "utf8",
);

export const HASHED_JS_STUB = Buffer.from("/* placeholder */\n", "utf8");
export const HTML_STUB = Buffer.from("<!doctype html><title>placeholder</title>\n", "utf8");

const MEDIA_BY_EXT = new Map([
  [".png", PNG_1X1],
  [".jpg", JPEG_1X1],
  [".jpeg", JPEG_1X1],
  [".gif", GIF_1X1],
  [".webp", WEBP_1X1],
  [".ico", ICO_1X1],
  [".svg", SVG_1X1],
  [".mp4", MP4_STUB],
  [".webm", WEBM_STUB],
  [".pdf", PDF_STUB],
  [".html", HTML_STUB],
  [".htm", HTML_STUB],
  [".js", HASHED_JS_STUB],
  [".mjs", HASHED_JS_STUB],
  [".cjs", HASHED_JS_STUB],
  [".css", HASHED_JS_STUB],
]);

const HASHED_STATIC_RE = /(?:^|\/)[^/]+\.[a-f0-9]{8,}\.(js|mjs|cjs|css)$/i;

export const CDN_PLACEHOLDER_MAX_BYTES = 2048;

export function placeholderBytesFor(relOrName) {
  const normalized = String(relOrName).replaceAll("\\", "/");
  const ext = path.posix.extname(normalized).toLowerCase();
  const media = MEDIA_BY_EXT.get(ext);
  if (media) return media;
  if (HASHED_STATIC_RE.test(normalized)) return HASHED_JS_STUB;
  return null;
}

function walkPublic(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPublic(full, onFile);
      continue;
    }
    onFile(full, entry.name);
  }
}

/**
 * Replace CDN binaries and hashed static assets under `core/web/public`
 * with tiny same-type placeholders. Preserve relative paths and the tree.
 * HTML labs and scripts are replaced with tiny stubs.
 */
export function applyCdnPlaceholders(staging) {
  const publicDir = path.join(staging, "core/web/public");
  if (!fs.existsSync(publicDir)) return;
  walkPublic(publicDir, (full, name) => {
    const bytes = placeholderBytesFor(name);
    if (!bytes) return;
    fs.writeFileSync(full, bytes);
  });
}

export function cdnOriginalScanHits(staging) {
  const publicDir = path.join(staging, "core/web/public");
  const hits = [];
  if (!fs.existsSync(publicDir)) return hits;
  walkPublic(publicDir, (full, name) => {
    const expected = placeholderBytesFor(name);
    if (!expected) return;
    const buf = fs.readFileSync(full);
    const rel = path.relative(staging, full).split(path.sep).join("/");
    if (!buf.equals(expected)) {
      hits.push(`CDN original (not placeholder) present: ${rel}`);
    } else if (buf.length > CDN_PLACEHOLDER_MAX_BYTES) {
      hits.push(`oversized CDN object in ${rel} (${buf.length} bytes)`);
    }
  });
  return hits;
}
