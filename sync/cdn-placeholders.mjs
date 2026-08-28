#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/** 1×1 PNG (89 PNG). */
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

/** Tiny SVG that still satisfies dest diagram tests (intrinsic 1440×810, ASCII, middot). */
export const SVG_1X1 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810"><rect width="1440" height="810" fill="#ccc"/><text x="12" y="24">&#183;</text></svg>\n',
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
export const CSS_STUB = Buffer.from("/* placeholder */\n", "utf8");
export const WOFF_STUB = Buffer.from("wOFF", "utf8");
export const WOFF2_STUB = Buffer.from("wOF2", "utf8");
export const TTF_STUB = Buffer.from([0x00, 0x01, 0x00, 0x00]);
export const OTF_STUB = Buffer.from("OTTO", "utf8");
export const GENERIC_STUB = Buffer.from("placeholder\n", "utf8");

const STUB_BY_EXT = new Map([
  [".png", PNG_1X1],
  [".jpg", JPEG_1X1],
  [".jpeg", JPEG_1X1],
  [".gif", GIF_1X1],
  [".webp", WEBP_1X1],
  [".avif", PNG_1X1],
  [".ico", ICO_1X1],
  [".svg", SVG_1X1],
  [".mp4", MP4_STUB],
  [".m4v", MP4_STUB],
  [".mov", MP4_STUB],
  [".webm", WEBM_STUB],
  [".pdf", PDF_STUB],
  [".html", HTML_STUB],
  [".htm", HTML_STUB],
  [".js", HASHED_JS_STUB],
  [".mjs", HASHED_JS_STUB],
  [".cjs", HASHED_JS_STUB],
  [".css", CSS_STUB],
  [".map", HASHED_JS_STUB],
  [".woff", WOFF_STUB],
  [".woff2", WOFF2_STUB],
  [".ttf", TTF_STUB],
  [".otf", OTF_STUB],
  [".eot", GENERIC_STUB],
  [".mp3", GENERIC_STUB],
  [".wav", GENERIC_STUB],
  [".wasm", GENERIC_STUB],
]);

const HASHED_STATIC_RE = /(?:^|\/)[^/]+\.[a-f0-9]{8,}\.(js|mjs|cjs|css)$/i;

export const CDN_PLACEHOLDER_MAX_BYTES = 2048;

function posixBase(relOrName) {
  return path.posix.basename(String(relOrName).replaceAll("\\", "/"));
}

export function isKeptPublicFile(relOrName) {
  const base = posixBase(relOrName);
  return base === ".gitkeep" || base.toLowerCase() === "readme.md";
}

/**
 * Tiny same-type stub for a `core/web/public` object, or `null` to leave
 * layout notes (README) and `.gitkeep`.
 */
export function placeholderBytesFor(relOrName) {
  const normalized = String(relOrName).replaceAll("\\", "/");
  if (isKeptPublicFile(normalized)) return null;
  const ext = path.posix.extname(normalized).toLowerCase();
  const byExt = STUB_BY_EXT.get(ext);
  if (byExt) return byExt;
  if (HASHED_STATIC_RE.test(normalized)) return HASHED_JS_STUB;
  return GENERIC_STUB;
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
 * Replace CDN binaries (and other public objects) under `core/web/public`
 * with tiny same-path placeholders. Preserve relative paths and the tree.
 */
export function applyCdnPlaceholders(staging) {
  const publicDir = path.join(staging, "core/web/public");
  if (!fs.existsSync(publicDir)) return;
  walkPublic(publicDir, (full) => {
    const bytes = placeholderBytesFor(full);
    if (!bytes) return;
    fs.writeFileSync(full, bytes);
  });
}

export function cdnOriginalScanHits(staging) {
  const publicDir = path.join(staging, "core/web/public");
  const hits = [];
  if (!fs.existsSync(publicDir)) return hits;
  walkPublic(publicDir, (full) => {
    const expected = placeholderBytesFor(full);
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
