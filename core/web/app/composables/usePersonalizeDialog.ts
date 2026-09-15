/** Shared open state for the single `AppPersonalize` dialog instance mounted in the site layout. */
export function usePersonalizeDialog() {
  return useState<boolean>('personalize-dialog-open', () => false);
}
