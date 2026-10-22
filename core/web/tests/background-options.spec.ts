import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyBackgroundOptionChanges,
  createStyleSetup,
  Preferences,
  STYLE_SETUPS_KEY,
  withBackgroundOption,
  type BackgroundOptions,
} from '../shared/preferences';
import {
  LEGACY_BACKGROUND_OPTION_KEYS,
  LEGACY_KEYS,
  sanitizeBackgroundOption,
  sanitizeBackgroundOptions,
} from '../shared/preferences/document';
import { flush, loadDocument } from '../shared/preferences/draft';
import { foucScript } from '../shared/preferences/fouc';
import { readLegacyPreferences } from '../shared/preferences/legacy';
import { buildBackgroundLayer } from '../shared/preferences/paint';
import { setupsApi } from '../shared/preferences/setups';
import {
  defaultPreferenceDocument,
  loadPreferenceDocument,
  persistPreferenceDocument,
  PREFERENCES_KEY,
  resetPreferenceStorage,
} from '../shared/preferences/storage';
import { setPaintForTests } from '../shared/preferences/testing';

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const brandRoles = { primary: '#dc4256', secondary: '#dc8a42', accent: '#42dcc8' };

describe('Background → Custom options', () => {
  it('validates each value for its control', () => {
    expect(sanitizeBackgroundOption('--portfolio-background-primary-color', '#ABC')).toBe('#aabbcc');
    expect(sanitizeBackgroundOption('--portfolio-background-primary-color', 'red')).toBeNull();
    expect(sanitizeBackgroundOption('--portfolio-background-repeat', 'repeat-x')).toBe('repeat-x');
    expect(sanitizeBackgroundOption('--portfolio-background-repeat', 'space')).toBeNull();
    expect(sanitizeBackgroundOption('--portfolio-background-image', 'linear-gradient(#000, #fff)')).toBeTruthy();
    expect(sanitizeBackgroundOption('--portfolio-background-image', 'url(/img/a.webp)')).toBeTruthy();
    // No declarations, blocks or markup smuggled in through the image field.
    expect(sanitizeBackgroundOption('--portfolio-background-image', 'url(a); color: red')).toBeNull();
    expect(sanitizeBackgroundOption('--portfolio-background-image', '</style><script>')).toBeNull();
    expect(sanitizeBackgroundOption('--unknown', '#fff')).toBeNull();
  });

  it('sets and clears one option without touching the others', () => {
    let options: BackgroundOptions = {};
    options = withBackgroundOption(options, '--portfolio-background-primary-color', '#112233');
    options = withBackgroundOption(options, '--portfolio-background-size', 'contain');
    expect(options).toEqual({
      '--portfolio-background-primary-color': '#112233',
      '--portfolio-background-size': 'contain',
    });
    options = withBackgroundOption(options, '--portfolio-background-primary-color', '');
    expect(options).toEqual({ '--portfolio-background-size': 'contain' });
  });

  it('diffs the picker map into single-option changes', () => {
    const calls: Array<[string, string | null]> = [];
    applyBackgroundOptionChanges(
      { '--portfolio-background-size': 'cover', '--portfolio-background-primary-color': '#000000' },
      { '--portfolio-background-size': 'contain' },
      (variable, value) => calls.push([variable, value])
    );
    expect(calls).toEqual([
      ['--portfolio-background-primary-color', null],
      ['--portfolio-background-size', 'contain'],
    ]);
  });

  it('persists non-empty options, survives corrupt storage, and resets', () => {
    const storage = memoryStorage();
    persistPreferenceDocument(storage, defaultPreferenceDocument());
    expect(JSON.parse(storage.values.get(PREFERENCES_KEY)!)).not.toHaveProperty('backgroundOptions');
    const options = { '--portfolio-background-blend-mode': 'screen' } as BackgroundOptions;
    persistPreferenceDocument(storage, { ...defaultPreferenceDocument(), backgroundOptions: options });
    expect(loadPreferenceDocument(storage).backgroundOptions).toEqual(options);
    expect(
      readLegacyPreferences(memoryStorage({ [LEGACY_KEYS.backgroundOptions]: '{nope' })).backgroundOptions
    ).toEqual({});
    const smuggled = { v: 1, backgroundOptions: { '--portfolio-background-primary-color': 'x;y' } };
    expect(
      loadPreferenceDocument(memoryStorage({ [PREFERENCES_KEY]: JSON.stringify(smuggled) })).backgroundOptions
    ).toEqual({});
    resetPreferenceStorage(storage);
    expect(storage.values.has(PREFERENCES_KEY)).toBe(false);
  });

  it("keeps the visitor's options on top of the preset (the old code wiped them on every brand / mode change)", () => {
    const preset = { '--portfolio-background-primary-color': '#330000', '--portfolio-background-image': 'none' };
    const layer = buildBackgroundLayer(preset, {
      '--portfolio-background-primary-color': '#00ff00',
      '--portfolio-background-size': 'contain',
    });
    expect(layer['--portfolio-background-primary-color']).toBe('#00ff00');
    expect(layer['--portfolio-background-size']).toBe('contain');
    expect(layer['--portfolio-background-image']).toBe('none');
    // No preset and no option: the key is removed so the theme default returns.
    expect(buildBackgroundLayer({}, {})['--portfolio-background-primary-color']).toBeNull();
  });

  describe('in style setups', () => {
    afterEach(() => {
      flush();
      setPaintForTests(null);
      setupsApi.invalidate();
    });

    it('rides along (older setups apply none)', () => {
      setPaintForTests(vi.fn());
      const options = { '--portfolio-background-position': 'top' } as BackgroundOptions;
      const storage = memoryStorage({
        [STYLE_SETUPS_KEY]: JSON.stringify([{ id: 'old', name: 'Old', brandRoles, background: 'custom' }]),
      });
      loadDocument(storage);
      setupsApi.save(
        storage,
        createStyleSetup('Night', { ...defaultPreferenceDocument(), backgroundOptions: options })
      );
      const [legacy, saved] = setupsApi.list(storage);
      expect(saved!.document.backgroundOptions).toEqual(options);
      expect(Preferences.setups.apply(storage, saved!).backgroundOptions).toEqual(options);
      expect(loadPreferenceDocument(storage).backgroundOptions).toEqual(options);
      expect(Preferences.setups.apply(storage, legacy!).backgroundOptions).toEqual({});
      expect(JSON.parse(storage.values.get(PREFERENCES_KEY)!)).not.toHaveProperty('backgroundOptions');
      expect(sanitizeBackgroundOptions({ ...options, '--nope': 'x' })).toEqual(options);
    });
  });

  it('applies stored options before paint and routes picker edits through personalization', async () => {
    expect(foucScript()).toContain(`getItem('${PREFERENCES_KEY}')`);
    const app = join(import.meta.dirname, '../app');
    const picker = await readFile(join(app, 'components/AppBackgroundPicker.vue'), 'utf8');
    expect(picker).toContain("defineModel<BackgroundOptions>('options'");
    expect(picker).not.toContain('style.setProperty');
    const composable = await readFile(join(app, 'composables/usePersonalization.ts'), 'utf8');
    // Background options ride the PreferenceDocument; paint clears absent layer keys via Theme.remove.
    expect(composable).toContain('backgroundOptions');
    expect(composable).toContain('Preferences.');
    expect(composable).not.toContain('updateTokens');
    const paint = await readFile(join(import.meta.dirname, '../shared/preferences/paint.ts'), 'utf8');
    expect(paint).toContain('buildBackgroundLayer(');
    expect(paint).toContain('Theme.remove');
    expect(await readFile(join(app, 'components/AppStyleStudio/index.vue'), 'utf8')).toContain(
      'v-model:options="backgroundOptionsModel"'
    );
    expect(await readFile(join(app, 'components/AppPersonalize/index.vue'), 'utf8')).toContain(
      'v-model:options="backgroundOptionsModel"'
    );
  });
});

describe('Background → Custom options stored under the old colour names (R-T4d)', () => {
  const legacy = {
    '--portfolio-background-primary': '#112233',
    '--portfolio-background-secondary': '#445566',
    '--portfolio-background-accent': '#778899',
    '--portfolio-background-size': 'contain',
  };
  const migrated = {
    '--portfolio-background-primary-color': '#112233',
    '--portfolio-background-secondary-color': '#445566',
    '--portfolio-background-accent-color': '#778899',
    '--portfolio-background-size': 'contain',
  };

  it('maps exactly the three colour options to their -color names', () => {
    expect(LEGACY_BACKGROUND_OPTION_KEYS).toEqual({
      '--portfolio-background-primary': '--portfolio-background-primary-color',
      '--portfolio-background-secondary': '--portfolio-background-secondary-color',
      '--portfolio-background-accent': '--portfolio-background-accent-color',
    });
  });

  it('reads old keys as the new names; a valid new key wins, else the valid old value is kept', () => {
    expect(sanitizeBackgroundOptions(legacy)).toEqual(migrated);
    expect(
      sanitizeBackgroundOptions({
        '--portfolio-background-primary': '#000000',
        '--portfolio-background-primary-color': '#ffffff',
      })
    ).toEqual({ '--portfolio-background-primary-color': '#ffffff' });
    // Old keys are still validated for their control.
    expect(sanitizeBackgroundOptions({ '--portfolio-background-primary': 'red' })).toEqual({});
    // An invalid new value does not hide a valid old one (fix round 1).
    expect(
      sanitizeBackgroundOptions({
        '--portfolio-background-primary': '#123456',
        '--portfolio-background-primary-color': 'not-a-colour',
      })
    ).toEqual({ '--portfolio-background-primary-color': '#123456' });
    const oldKey = memoryStorage({ [LEGACY_KEYS.backgroundOptions]: JSON.stringify(legacy) });
    expect(readLegacyPreferences(oldKey).backgroundOptions).toEqual(migrated);
    const stored = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ v: 1, backgroundOptions: legacy }) });
    expect(loadPreferenceDocument(stored).backgroundOptions).toEqual(migrated);
  });

  it('the FOUC script applies old keys under the new names before paint (a usable new value wins)', () => {
    const run = (stored: Record<string, string>) => {
      const set: Record<string, string> = {};
      const root = {
        style: { setProperty: (k: string, v: string) => void (set[k] = v), colorScheme: '' },
        setAttribute: () => undefined,
        classList: { toggle: () => undefined },
      };
      new Function('localStorage', 'document', 'window', foucScript())(
        { getItem: (k: string) => stored[k] ?? null },
        { documentElement: root },
        { matchMedia: () => ({ matches: true }) }
      );
      return set;
    };
    expect(run({ [LEGACY_KEYS.backgroundOptions]: JSON.stringify(legacy) })).toEqual(migrated);
    expect(
      run({
        [LEGACY_KEYS.backgroundOptions]: JSON.stringify({
          '--portfolio-background-primary': '#000000',
          '--portfolio-background-primary-color': '#ffffff',
        }),
      })
    ).toEqual({ '--portfolio-background-primary-color': '#ffffff' });
    expect(
      run({
        [LEGACY_KEYS.backgroundOptions]: JSON.stringify({
          '--portfolio-background-primary': '#000000',
          '--portfolio-background-primary-color': 'x;y',
        }),
      })
    ).toEqual({ '--portfolio-background-primary-color': '#000000' });
  });
});
