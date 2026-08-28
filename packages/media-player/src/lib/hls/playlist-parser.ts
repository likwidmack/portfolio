import { Parser } from 'm3u8-parser';

/** Master-playlist variant after resolving relative URIs against the manifest URL. */
export interface ParsedVariant {
  url: string;
  bandwidth?: number;
  resolution?: { width: number; height: number };
}

/** Media playlist segments with absolute URIs. */
export interface ParsedMediaPlaylist {
  url: string;
  segments: { uri: string; duration: number }[];
  /** True when `#EXT-X-ENDLIST` is present (VOD). */
  endList: boolean;
}

/**
 * Parse a master playlist into absolute variant URLs.
 * Returns an empty array when `manifestText` is already a media playlist.
 */
export function parseMasterPlaylist(manifestText: string, manifestUrl: string): ParsedVariant[] {
  const parser = new Parser();
  parser.push(manifestText);
  parser.end();
  const playlists = parser.manifest.playlists ?? [];
  return playlists.map((pl) => ({
    url: new URL(pl.uri, manifestUrl).href,
    bandwidth: pl.attributes?.BANDWIDTH,
    resolution: normalizeResolution(pl.attributes?.RESOLUTION),
  }));
}

/** Normalize m3u8-parser RESOLUTION (`{width,height}` or legacy tuple). */
function normalizeResolution(value: unknown): { width: number; height: number } | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (Array.isArray(value) && value.length >= 2) {
    return { width: Number(value[0]), height: Number(value[1]) };
  }
  const record = value as { width?: number; height?: number };
  if (typeof record.width === 'number' && typeof record.height === 'number') {
    return { width: record.width, height: record.height };
  }
  return undefined;
}

/** Parse a media playlist into absolute segment URIs. */
export function parseMediaPlaylist(manifestText: string, manifestUrl: string): ParsedMediaPlaylist {
  const parser = new Parser();
  parser.push(manifestText);
  parser.end();
  const segments = (parser.manifest.segments ?? []).map((seg) => ({
    uri: new URL(seg.uri, manifestUrl).href,
    duration: seg.duration,
  }));
  return {
    url: manifestUrl,
    segments,
    endList: Boolean(parser.manifest.endList),
  };
}

/** Fetch an m3u8 document as text (supports AbortSignal). */
export async function fetchManifestText(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Manifest fetch failed: ${response.status}`);
  }
  return response.text();
}
