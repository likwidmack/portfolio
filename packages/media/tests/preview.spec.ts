import { describe, expect, it } from 'vitest';

import { mediaPreviewKey, type MediaChild, type MediaKind } from '../src/index.js';

type ChildFacts = Pick<MediaChild, 'variant' | 'status' | 'path'>;

const asset = (kind: MediaKind, path: string) => ({ kind, path });
const child = (variant: ChildFacts['variant'], status: ChildFacts['status'], path: string | null): ChildFacts => ({
  variant,
  status,
  path,
});

describe('mediaPreviewKey', () => {
  it('uses the ready t thumbnail of an image', () => {
    expect(
      mediaPreviewKey(asset('image', 'm/pf/i/hero.png'), [
        child('640', 'ready', 'm/pf/i/hero@640.webp'),
        child('t', 'ready', 'm/pf/i/hero@t.webp'),
      ])
    ).toBe('m/pf/i/hero@t.webp');
  });

  it('prefers the webp thumbnail when several formats are ready', () => {
    expect(
      mediaPreviewKey(asset('image', 'm/pf/i/hero.png'), [
        child('t', 'ready', 'm/pf/i/hero@t.avif'),
        child('t', 'ready', 'm/pf/i/hero@t.webp'),
      ])
    ).toBe('m/pf/i/hero@t.webp');
  });

  it('falls back to the original image while the thumbnail is pending, failed or missing', () => {
    for (const children of [
      [],
      [child('t', 'pending', null)],
      [child('t', 'failed', null)],
      [child('custom', 'ready', 'm/pf/i/hero@c-0123abcd.webp')],
    ]) {
      expect(mediaPreviewKey(asset('image', 'm/pf/i/hero.png'), children)).toBe('m/pf/i/hero.png');
    }
  });

  it('shows an SVG itself unless a raster thumbnail is ready', () => {
    expect(mediaPreviewKey(asset('svg', 'm/pf/s/logo.svg'), [])).toBe('m/pf/s/logo.svg');
    expect(mediaPreviewKey(asset('svg', 'm/pf/s/logo.svg'), [child('t', 'ready', 'm/pf/s/logo@t.webp')])).toBe(
      'm/pf/s/logo@t.webp'
    );
  });

  it('plays audio and video from the original', () => {
    expect(mediaPreviewKey(asset('audio', 'm/pf/a/theme.mp3'), [])).toBe('m/pf/a/theme.mp3');
    expect(mediaPreviewKey(asset('video', 'm/pf/v/clip.mp4'), [child('t', 'ready', 'm/pf/v/clip@t.webp')])).toBe(
      'm/pf/v/clip.mp4'
    );
  });

  it('has no preview for 3D models and documents', () => {
    expect(mediaPreviewKey(asset('model', 'm/pf/o/chair.glb'), [])).toBeNull();
    expect(mediaPreviewKey(asset('document', 'm/pf/d/resume.pdf'), [])).toBeNull();
  });
});
