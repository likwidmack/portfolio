/**
 * ffmpeg for MP4 sanitizing, resolved in order: `FFMPEG_PATH` → `ffmpeg` on PATH → the optional
 * `ffmpeg-static` package (GPL-3.0 binary, run as a separate process, never bundled or redistributed;
 * its own `FFMPEG_BIN` override applies to that last step).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const FFMPEG_NOT_FOUND =
  'No ffmpeg found for MP4 sanitizing: set FFMPEG_PATH, put ffmpeg on PATH, or install the optional ffmpeg-static dependency';

export type FfmpegResolveOptions = {
  env?: Record<string, string | undefined>;
  /** Whether `command -version` runs (default: spawn it). */
  runs?: (command: string) => boolean;
  /** The ffmpeg-static binary, or null (default: load the optional package). */
  staticPath?: () => string | null;
};

function runs(command: string): boolean {
  return spawnSync(command, ['-version'], { stdio: 'ignore', windowsHide: true }).status === 0;
}

function ffmpegStaticPath(): string | null {
  try {
    // Loaded on demand (exception to top-of-file imports): ffmpeg-static is an optional dependency and may be absent.
    const path: unknown = require('ffmpeg-static');
    return typeof path === 'string' && existsSync(path) ? path : null;
  } catch {
    return null;
  }
}

/** The ffmpeg command to run, or null when none is available. */
export function resolveFfmpegPath(options: FfmpegResolveOptions = {}): string | null {
  const env = options.env ?? process.env;
  if (env.FFMPEG_PATH) {
    return env.FFMPEG_PATH;
  }
  if ((options.runs ?? runs)('ffmpeg')) {
    return 'ffmpeg';
  }
  return (options.staticPath ?? ffmpegStaticPath)();
}
