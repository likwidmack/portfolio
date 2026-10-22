// @vitest-environment jsdom
/// <reference types="vitest/jsdom" />
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { disposeThemeMode, getThemeMode, initThemeMode, setThemeMode } from '../src/color-mode.js';

describe('colour-mode storage is opt-in', () => {
  // Node >= 25 has its own `localStorage` global (undefined without `--localstorage-file`) that shadows jsdom's.
  beforeAll(() => vi.stubGlobal('localStorage', jsdom.window.localStorage));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => localStorage.clear());
  afterEach(() => disposeThemeMode());

  it('reads and writes nothing without a storageKey', () => {
    localStorage.setItem('tgmc-theme-mode', 'light');
    initThemeMode({ preference: 'dark', listenToSystem: false, dryRun: true });
    expect(getThemeMode()).toBe('dark');
    setThemeMode('light', { dryRun: true });
    expect(localStorage.getItem('tgmc-theme-mode')).toBe('light'); // untouched seed
    setThemeMode('system', { dryRun: true });
    expect(localStorage.getItem('tgmc-theme-mode')).toBe('light');
  });

  it('restores and persists when a storageKey is given', () => {
    localStorage.setItem('my-mode', 'light');
    initThemeMode({ storageKey: 'my-mode', preference: 'dark', listenToSystem: false, dryRun: true });
    expect(getThemeMode()).toBe('light');
    setThemeMode('dark', { dryRun: true });
    expect(localStorage.getItem('my-mode')).toBe('dark');
    setThemeMode('light', { persist: false, dryRun: true });
    expect(localStorage.getItem('my-mode')).toBe('dark');
    setThemeMode('system', { dryRun: true });
    expect(localStorage.getItem('my-mode')).toBeNull();
  });
});
