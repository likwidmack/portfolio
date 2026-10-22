/**
 * Admin sign-in redirects — the guard decision for `admin-auth` and the post-sign-in target.
 * Pure (no Nuxt / router); the middleware and sign-in page are thin adapters.
 */
const SIGN_IN_PATH = '/admin';
const ADMIN_PATH_PREFIX = '/admin/';
const DEFAULT_AFTER_SIGN_IN = '/admin/blog';
// The URL parser strips tabs / newlines and reads `\` as `/`, so these could change the target after the prefix check.
const UNSAFE_PATH_CHARS = /[\\\s\p{Cc}]/u;
const PROBE_ORIGIN = 'https://admin.invalid';

/** The sign-in page itself (`/admin`, with or without a trailing slash). */
export const isAdminSignInPath = (path: string): boolean => path === SIGN_IN_PATH || path === ADMIN_PATH_PREFIX;

/** Where a guarded admin page should send the visitor, or `null` to stay. */
export function adminAuthRedirect(input: { path: string; signedIn: boolean; writesEnabled: boolean }): string | null {
  if (!input.writesEnabled || input.signedIn) return null;
  return `${SIGN_IN_PATH}?redirect=${encodeURIComponent(input.path)}`;
}

/** Post-sign-in target: only same-origin `/admin/...` pages (after normalising `..`) other than sign-in are followed. */
export function safeAdminRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith(ADMIN_PATH_PREFIX) || UNSAFE_PATH_CHARS.test(value)) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  try {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN || !url.pathname.startsWith(ADMIN_PATH_PREFIX) || isAdminSignInPath(url.pathname)) {
      return DEFAULT_AFTER_SIGN_IN;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
}

/** Sign-in route after a 401: remembers `currentPath` only when it is a safe `/admin/...` page. */
export function expiredSignInTarget(currentPath: string): {
  path: typeof SIGN_IN_PATH;
  query: { expired: '1'; redirect?: string };
} {
  const query: { expired: '1'; redirect?: string } = { expired: '1' };
  if (safeAdminRedirect(currentPath) === currentPath) query.redirect = currentPath;
  return { path: SIGN_IN_PATH, query };
}
