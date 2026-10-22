/** A browser "storage full" write error (`QuotaExceededError`; older Firefox: `NS_ERROR_DOM_QUOTA_REACHED`). */
export function isStorageQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}
