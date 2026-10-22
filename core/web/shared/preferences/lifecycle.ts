/**
 * Preferences setup lifecycle — the setup operations that span modules: flush the pending commit
 * write, convert an old setups array before any list read-back or write, apply through the draft.
 * `draft`, `setups` and `legacy` never import this file, so the module graph stays acyclic.
 */
import type { PreferenceDocument, StyleSetup } from './document';
import { commitNow, flush } from './draft';
import { convertLegacyStyleSetups } from './legacy';
import { setupsApi, type SaveSetupResult } from './setups';
import { loadPreferenceDocument, type PreferenceStorage } from './storage';

/** An old-bundle tab can write the old array at any time; a list write over it would delete those setups. */
function flushAndConvertOldSetups(storage: PreferenceStorage): void {
  flush();
  convertLegacyStyleSetups(storage, loadPreferenceDocument(storage).mode);
}

export const setupsLifecycle = {
  list: setupsApi.list,
  invalidate: setupsApi.invalidate,

  /** Drop the cache and re-read, converting an old array first (another tab changed the setups). */
  reload(storage: PreferenceStorage): StyleSetup[] {
    setupsApi.invalidate();
    flushAndConvertOldSetups(storage);
    return setupsApi.list(storage);
  },

  save(storage: PreferenceStorage, setup: StyleSetup): SaveSetupResult {
    flushAndConvertOldSetups(storage);
    return setupsApi.save(storage, setup);
  },

  /** Commit the setup's document (written now), mark it active, seed draft + committed, paint. */
  apply(storage: PreferenceStorage, setup: StyleSetup): PreferenceDocument {
    const doc = commitNow(storage, setup.document, 'preferences:setups:apply');
    setupsApi.setActiveId(storage, setup.id);
    return doc;
  },

  delete(storage: PreferenceStorage, id: string): { setups: StyleSetup[]; clearedActive: boolean } {
    flushAndConvertOldSetups(storage);
    return setupsApi.delete(storage, id);
  },

  /** Undo a delete: re-insert at the former position. Refused (nothing written) when the list is full. */
  restore(storage: PreferenceStorage, setup: StyleSetup, index: number): SaveSetupResult {
    flushAndConvertOldSetups(storage);
    return setupsApi.restore(storage, setup, index);
  },

  getActiveId: setupsApi.getActiveId,
  setActiveId: setupsApi.setActiveId,
} as const;
