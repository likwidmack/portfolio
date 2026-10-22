/** Minimal ISO BMFF (MP4) box reader: duration, display size, and the non-media bytes to audit. */

export type Mp4Box = { type: string; start: number; contentStart: number; end: number };

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'edts', 'dinf']);

export function readBoxes(buf: Buffer, start = 0, end = buf.length): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) {
        break;
      }
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) {
      break;
    }
    boxes.push({ type, start: offset, contentStart: offset + header, end: offset + size });
    offset += size;
  }
  return boxes;
}

function findPath(buf: Buffer, path: string[], within?: Mp4Box): Mp4Box[] {
  const [head, ...rest] = path;
  const level = readBoxes(buf, within?.contentStart ?? 0, within?.end ?? buf.length).filter((box) => box.type === head);
  return rest.length === 0 ? level : level.flatMap((box) => findPath(buf, rest, box));
}

function mvhdDuration(buf: Buffer, box: Mp4Box): number | null {
  const c = box.contentStart;
  const version = buf.readUInt8(c);
  const timescale = version === 1 ? buf.readUInt32BE(c + 20) : buf.readUInt32BE(c + 12);
  const duration = version === 1 ? Number(buf.readBigUInt64BE(c + 24)) : buf.readUInt32BE(c + 16);
  return timescale > 0 && duration > 0 ? Math.round((duration / timescale) * 1000) / 1000 : null;
}

function tkhdSize(buf: Buffer, box: Mp4Box): { width: number; height: number } {
  const c = box.contentStart;
  const version = buf.readUInt8(c);
  const sizeOffset = c + (version === 1 ? 88 : 76);
  return { width: buf.readUInt32BE(sizeOffset) >>> 16, height: buf.readUInt32BE(sizeOffset + 4) >>> 16 };
}

export function readMp4Facts(buf: Buffer): { width: number | null; height: number | null; durationSec: number | null } {
  const mvhd = findPath(buf, ['moov', 'mvhd'])[0];
  const visual = findPath(buf, ['moov', 'trak', 'tkhd'])
    .map((box) => tkhdSize(buf, box))
    .find((size) => size.width > 0 && size.height > 0);
  return {
    width: visual?.width ?? null,
    height: visual?.height ?? null,
    durationSec: mvhd ? mvhdDuration(buf, mvhd) : null,
  };
}

/** Every byte except `mdat` payloads (compressed media), so an identifier scan does not hit random data. */
export function mp4MetadataBytes(buf: Buffer): Buffer {
  const parts: Buffer[] = [];
  const walk = (start: number, end: number): void => {
    for (const box of readBoxes(buf, start, end)) {
      if (box.type === 'mdat') {
        parts.push(buf.subarray(box.start, box.contentStart));
      } else if (CONTAINERS.has(box.type)) {
        parts.push(buf.subarray(box.start, box.contentStart));
        walk(box.contentStart, box.end);
      } else {
        parts.push(buf.subarray(box.start, box.end));
      }
    }
  };
  walk(0, buf.length);
  return Buffer.concat(parts);
}
