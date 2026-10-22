import type { PreferenceDocument } from './document';
import {
  bindFlushOnHide,
  commit as commitDraft,
  discard as discardDraft,
  flush,
  getCommitted,
  getDraft,
  loadDocument,
  preview as previewDraft,
  resetDocument,
} from './draft';
import { foucScript } from './fouc';
import { setupsLifecycle } from './lifecycle';
import { refreshStaleColorTokens, type PreferenceStorage } from './storage';

export {
  applyBackgroundOptionChanges,
  BACKGROUND_CUSTOM_CSS_VAR,
  BACKGROUND_CUSTOM_OPTIONS,
  BACKGROUND_MODES,
  backgroundCustomFor,
  BRAND_PACKS,
  brandRolesFromPack,
  brandSwatchCatalog,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_CUSTOM,
  DEFAULT_BACKGROUND_MODE,
  defaultBrandRoles,
  defaultPaperInk,
  isDefaultPaperInk,
  normalizeOpaqueHex,
  paintedBackgroundCustom,
  resolveBackgroundCustom,
  STYLE_SETUP_ACTIVE_KEY,
  STYLE_SETUPS_KEY,
  withAccent,
  withBackgroundOption,
  withDerivedRole,
  withPaperInk,
  withPaperInkLinked,
  withPrimary,
  withSecondary,
  type BackgroundMode,
  type BackgroundOptions,
  type BackgroundOptionVariable,
  type BrandPack,
  type BrandPackId,
  type BrandRolesState,
  type MotionPreference,
  type PaperInkState,
  type PreferenceDocument,
  type StyleSetup,
  type StyleSetupMode,
} from './document';
export { paintedPackColors, type PackColors } from './paint';
export { createStyleSetup, STYLE_SETUPS_MAX, type SaveSetupResult } from './setups';
export type { PreferenceStorage } from './storage';

/** `loadDocument` / `resetDocument` already drop the setups cache, so neither is wrapped here. */
export const Preferences = {
  /**
   * Load the committed document. A stale stored colour map — a missing name or a value the current
   * builders no longer produce — is rebuilt; a map left over for the defaults is removed.
   */
  load(storage: PreferenceStorage): PreferenceDocument {
    const doc = loadDocument(storage);
    refreshStaleColorTokens(storage, doc);
    return doc;
  },
  preview: previewDraft,
  commit: commitDraft,
  flush,
  discard: discardDraft,
  reset(storage: PreferenceStorage): PreferenceDocument {
    return resetDocument(storage);
  },
  bindFlushOnHide,
  getDraft,
  getCommitted,
  foucScript,
  setups: setupsLifecycle,
} as const;
