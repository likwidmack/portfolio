import { FFMPEG_NOT_FOUND, resolveFfmpegPath, sanitizeMedia } from '../src/sanitize.js';

const never = () => {
  throw new Error('not consulted');
};

describe('resolveFfmpegPath', () => {
  it('prefers FFMPEG_PATH', () => {
    expect(resolveFfmpegPath({ env: { FFMPEG_PATH: '/opt/ffmpeg/bin/ffmpeg' }, runs: never, staticPath: never })).toBe(
      '/opt/ffmpeg/bin/ffmpeg'
    );
  });

  it('then ffmpeg on PATH', () => {
    const tried: string[] = [];
    const runs = (command: string) => {
      tried.push(command);
      return true;
    };
    expect(resolveFfmpegPath({ env: { FFMPEG_PATH: '' }, runs, staticPath: never })).toBe('ffmpeg');
    expect(tried).toEqual(['ffmpeg']);
  });

  it('then the optional ffmpeg-static binary', () => {
    expect(resolveFfmpegPath({ env: {}, runs: () => false, staticPath: () => '/x/ffmpeg-static/ffmpeg' })).toBe(
      '/x/ffmpeg-static/ffmpeg'
    );
  });

  it('is null when none is available', () => {
    expect(resolveFfmpegPath({ env: {}, runs: () => false, staticPath: () => null })).toBeNull();
  });
});

describe('sanitizeMedia mp4 without ffmpeg', () => {
  it('says how to provide one', async () => {
    await expect(sanitizeMedia(Buffer.from('x'), { format: 'mp4' })).rejects.toThrow(FFMPEG_NOT_FOUND);
    expect(FFMPEG_NOT_FOUND).toMatch(/FFMPEG_PATH/);
    expect(FFMPEG_NOT_FOUND).toMatch(/ffmpeg-static/);
  });
});
