import {
  brandRolesFromPack,
  snapshotFromLive,
  withAccent,
  withPrimary,
  withSecondary,
  type BackgroundMode,
  type BrandPackId,
  type BrandRolesState,
  type MotionPreference,
  type PaperInkState,
  type StyleSetup,
  type StyleSetupMode,
} from '#shared/personalization';

/**
 * Style Studio session draft helpers — edits preview via personalization with
 * `{ persist: false }`; Apply / Save commit through `usePersonalization`.
 */
export function useStyleStudioDraft() {
  const personalization = usePersonalization();
  const dirty = useState<boolean>('style-studio-draft-dirty', () => false);
  const saveName = useState<string>('style-studio-save-name', () => '');
  const appliedPulse = useState<boolean>('style-studio-apply-pulse', () => false);

  const markDirty = () => {
    dirty.value = true;
  };

  const clearDirty = () => {
    dirty.value = false;
  };

  const setDraftPrimary = (hex: string) => {
    personalization.setPrimary(hex, { persist: false });
    markDirty();
  };

  const setDraftSecondary = (hex: string) => {
    personalization.setSecondary(hex, { persist: false });
    markDirty();
  };

  const setDraftAccent = (hex: string) => {
    personalization.setBrandAccent(hex, { persist: false });
    markDirty();
  };

  const setDraftRoleDerived = (role: 'secondary' | 'accent', derive: boolean) => {
    personalization.setRoleDerived(role, derive, { persist: false });
    markDirty();
  };

  const setDraftMotion = (next: MotionPreference) => {
    personalization.setMotion(next, { persist: false });
    markDirty();
  };

  const setDraftBackground = (next: BackgroundMode) => {
    personalization.setBackground(next, { persist: false });
    markDirty();
  };

  const setDraftBackgroundCustom = (hex: string) => {
    personalization.setBackgroundCustom(hex, { persist: false });
    markDirty();
  };

  /** Pen & paper for one mode (paper = background, ink = foreground). */
  const setDraftPaperInk = (mode: 'light' | 'dark', pair: PaperInkState['light']) => {
    personalization.setPaperInk(mode, pair, { persist: false });
    markDirty();
  };

  const setDraftPaperInkLinked = (linked: boolean, from: 'light' | 'dark') => {
    personalization.setPaperInkLinked(linked, from, { persist: false });
    markDirty();
  };

  const resetDraftPaperInk = () => {
    personalization.resetPaperInk({ persist: false });
    markDirty();
  };

  const setDraftMode = (next: StyleSetupMode) => {
    personalization.setMode(next, { persist: false });
    markDirty();
  };

  const applyPackToDraft = (packId: BrandPackId) => {
    personalization.applyBrandPack(packId, { persist: false });
    markDirty();
  };

  const loadSetupIntoDraft = (setup: StyleSetup) => {
    personalization.applySetup(setup, { persist: false, setActive: true });
    markDirty();
  };

  const applyDraft = () => {
    personalization.commitLive({
      activeSetupId: personalization.activeSetupId.value,
    });
    clearDirty();
    appliedPulse.value = true;
    if (import.meta.client) {
      window.setTimeout(() => {
        appliedPulse.value = false;
      }, 600);
    }
  };

  const revertDraft = () => {
    personalization.revertToCommitted();
    clearDirty();
    saveName.value = '';
  };

  const saveDraftAs = (name: string, id?: string): StyleSetup => {
    const setup = personalization.saveSetup(name, id);
    clearDirty();
    saveName.value = '';
    appliedPulse.value = true;
    if (import.meta.client) {
      window.setTimeout(() => {
        appliedPulse.value = false;
      }, 600);
    }
    return setup;
  };

  const snapshotDraft = (name: string, id?: string): StyleSetup =>
    snapshotFromLive({
      name,
      id,
      brandRoles: personalization.brandRoles.value,
      motion: personalization.motion.value,
      background: personalization.background.value,
      backgroundCustom: personalization.backgroundCustom.value,
      mode: personalization.mode.value,
      paperInk: personalization.paperInk.value,
    });

  const previewRoles = (
    roles: BrandRolesState,
    patch: { primary?: string; secondary?: string; accent?: string }
  ): BrandRolesState => {
    let next = roles;
    if (patch.primary) next = withPrimary(next, patch.primary);
    if (patch.secondary) next = withSecondary(next, patch.secondary);
    if (patch.accent) next = withAccent(next, patch.accent);
    return next;
  };

  return {
    dirty,
    saveName,
    appliedPulse,
    markDirty,
    clearDirty,
    setDraftPrimary,
    setDraftSecondary,
    setDraftAccent,
    setDraftRoleDerived,
    setDraftMotion,
    setDraftBackground,
    setDraftBackgroundCustom,
    setDraftMode,
    setDraftPaperInk,
    setDraftPaperInkLinked,
    resetDraftPaperInk,
    applyPackToDraft,
    loadSetupIntoDraft,
    applyDraft,
    revertDraft,
    saveDraftAs,
    snapshotDraft,
    previewRoles,
    brandRolesFromPack,
    personalization,
  };
}
