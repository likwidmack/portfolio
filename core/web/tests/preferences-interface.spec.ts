import { describe, expect, it } from 'vitest';

import * as preferences from '../shared/preferences';

const EXPECTED = [
  'BACKGROUND_CUSTOM_CSS_VAR',
  'backgroundCustomFor',
  'BACKGROUND_CUSTOM_OPTIONS',
  'BACKGROUND_MODES',
  'BRAND_PACKS',
  'DEFAULT_ACCENT_ID',
  'DEFAULT_BACKGROUND_CUSTOM',
  'DEFAULT_BACKGROUND_MODE',
  'Preferences',
  'STYLE_SETUPS_KEY',
  'STYLE_SETUPS_MAX',
  'STYLE_SETUP_ACTIVE_KEY',
  'applyBackgroundOptionChanges',
  'brandRolesFromPack',
  'brandSwatchCatalog',
  'createStyleSetup',
  'defaultBrandRoles',
  'defaultPaperInk',
  'isDefaultPaperInk',
  'normalizeOpaqueHex',
  'paintedBackgroundCustom',
  'paintedPackColors',
  'resolveBackgroundCustom',
  'withAccent',
  'withBackgroundOption',
  'withDerivedRole',
  'withPaperInk',
  'withPaperInkLinked',
  'withPrimary',
  'withSecondary',
].sort();

describe('Preferences interface', () => {
  it('exports exactly the app-facing list', () => {
    expect(Object.keys(preferences).sort()).toEqual(EXPECTED);
  });

  it('pins the Preferences and Preferences.setups members', () => {
    expect(Object.keys(preferences.Preferences).sort()).toEqual(
      [
        'bindFlushOnHide',
        'commit',
        'discard',
        'flush',
        'foucScript',
        'getCommitted',
        'getDraft',
        'load',
        'preview',
        'reset',
        'setups',
      ].sort()
    );
    expect(Object.keys(preferences.Preferences.setups).sort()).toEqual(
      ['apply', 'delete', 'getActiveId', 'invalidate', 'list', 'reload', 'restore', 'save', 'setActiveId'].sort()
    );
  });

  it('has no test hooks on Preferences', () => {
    expect(Object.keys(preferences.Preferences)).not.toContain('_setPaintForTests');
    expect(Object.keys(preferences.Preferences)).not.toContain('setPaintForTests');
  });
});
