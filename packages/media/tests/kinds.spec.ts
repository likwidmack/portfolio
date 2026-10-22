import { describe, expect, it } from 'vitest';

import { defaultMimeForKind, guessMediaKind, isMediaKind, MEDIA_KINDS } from '../src/kinds.js';

describe('media kinds', () => {
  it('lists the catalog kinds', () => {
    expect(MEDIA_KINDS).toEqual(['image', 'svg', 'audio', 'video', 'model', 'document']);
  });

  it('accepts only known kinds', () => {
    expect(isMediaKind('model')).toBe(true);
    expect(isMediaKind('other')).toBe(false);
  });

  it('guesses kind from mime and extension', () => {
    expect(guessMediaKind({ mime: 'image/png' })).toBe('image');
    expect(guessMediaKind({ mime: 'image/svg+xml' })).toBe('svg');
    expect(guessMediaKind({ filename: 'logo.svg' })).toBe('svg');
    expect(guessMediaKind({ mime: 'audio/mpeg' })).toBe('audio');
    expect(guessMediaKind({ mime: 'video/mp4' })).toBe('video');
    expect(guessMediaKind({ filename: 'hero.glb' })).toBe('model');
    expect(guessMediaKind({ mime: 'model/gltf-binary' })).toBe('model');
    expect(guessMediaKind({ filename: 'notes.md' })).toBe('document');
    expect(guessMediaKind({ mime: 'application/pdf' })).toBe('document');
    expect(guessMediaKind({ mime: 'application/octet-stream', filename: 'scene.usdz' })).toBe('model');
  });

  it('prefers an explicit valid kind', () => {
    expect(guessMediaKind({ kind: 'document', mime: 'image/png' })).toBe('document');
  });

  it('returns default mimes', () => {
    expect(defaultMimeForKind('svg')).toBe('image/svg+xml');
    expect(defaultMimeForKind('model')).toBe('model/gltf-binary');
  });
});
