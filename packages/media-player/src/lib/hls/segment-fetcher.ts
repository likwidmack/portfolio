/** Resolve `relative` against `base`, returning `relative` unchanged on failure. */
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/** Fetch a media segment as bytes (supports AbortSignal). */
export async function fetchBuffer(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
