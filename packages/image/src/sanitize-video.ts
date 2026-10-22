/**
 * MP4 sanitizer: remux with ffmpeg (`-map_metadata -1 -c copy`; nothing is re-encoded). Container and
 * stream metadata, chapters, data / subtitle tracks and the muxer's own `encoder` tag (bitexact) are
 * dropped (`-map 0:V` also skips attached cover pictures); the moov atom moves to the front for
 * streaming. The caller supplies the ffmpeg command (`resolveFfmpegPath`) so this package never bundles it.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FFMPEG_NOT_FOUND } from './ffmpeg.js';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim().slice(0, 500)}`));
      }
    });
  });
}

export async function sanitizeMp4(input: Buffer, ffmpegPath: string | undefined): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error(FFMPEG_NOT_FOUND);
  }
  const dir = await mkdtemp(join(tmpdir(), 'tgmc-sanitize-mp4-'));
  try {
    const source = join(dir, 'in.mp4');
    const target = join(dir, 'out.mp4');
    await writeFile(source, input);
    await run(ffmpegPath, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      source,
      '-map',
      '0:V',
      '-map',
      '0:a?',
      '-map_metadata',
      '-1',
      '-map_chapters',
      '-1',
      '-dn',
      '-sn',
      '-c',
      'copy',
      '-fflags',
      '+bitexact',
      '-flags:v',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      '-movflags',
      '+faststart',
      target,
    ]);
    return await readFile(target);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
