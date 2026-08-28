/**
 * Client helper for the V1 admin shared-secret token (sessionStorage).
 */
export const ADMIN_TOKEN_STORAGE_KEY = 'portfolio.adminToken';

export const readAdminToken = (): string => {
  if (!import.meta.client) {
    return '';
  }
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim() || '';
};

export const writeAdminToken = (token: string): void => {
  if (!import.meta.client) {
    return;
  }
  const trimmed = token.trim();
  if (!trimmed) {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
};

export const clearAdminToken = (): void => {
  writeAdminToken('');
};

export const adminAuthHeaders = (): Record<string, string> => {
  const token = readAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type FetchErrorShape = { statusCode?: number; statusMessage?: string };

const asFetchError = (error: unknown): FetchErrorShape =>
  error && typeof error === 'object' ? (error as FetchErrorShape) : {};

/** Status code from a `$fetch` / ofetch error, if present. */
export const fetchErrorStatus = (error: unknown): number | undefined => asFetchError(error).statusCode;

/** Status message from a `$fetch` / ofetch error, if present. */
export const fetchErrorMessage = (error: unknown): string | undefined => asFetchError(error).statusMessage;
