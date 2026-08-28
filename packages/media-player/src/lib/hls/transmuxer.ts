import muxjs from 'mux.js';

/**
 * Remux MPEG-TS segment bytes to fMP4 for `SourceBuffer.appendBuffer`.
 * Used only when {@link needsTransmux} is true — helpers must not own playback.
 */
export function transmuxTsToFmp4(tsData: Uint8Array): Uint8Array {
  const transmuxer = new muxjs.mp4.Transmuxer();
  const chunks: Uint8Array[] = [];
  transmuxer.on('data', (segment: { data: Uint8Array }) => {
    chunks.push(segment.data);
  });
  transmuxer.push(tsData);
  transmuxer.flush();
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Heuristic: treat `.ts` segment URIs as MPEG-TS that need remux. */
export function needsTransmux(uri: string): boolean {
  return uri.includes('.ts') || uri.endsWith('.ts');
}
