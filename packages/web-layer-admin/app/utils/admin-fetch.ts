/**
 * `adminFetch` — `$fetch.create` with the admin bearer token + selected database from the
 * in-memory session (no storage reads per request); a 401 for the current token signs out.
 * Provided by `admin-session.client.ts`.
 */
import { withBase } from 'ufo';

import type { AdminSession } from './admin-session';
import { fetchErrorMessage, fetchErrorStatus } from './fetch-error';

/** Must match `ADMIN_DATABASE_HEADER` / `resolveAdminDatabase` on the server (case-insensitive). */
export const ADMIN_DATABASE_HEADER = 'X-Admin-Database';

export type AdminRequestContext = {
  request: RequestInfo | URL;
  options: { headers?: HeadersInit; baseURL?: string };
};
/** ofetch passes the resolved request `options` (with the headers `onRequest` set). */
export type AdminResponseErrorContext = { response?: { status: number }; options?: { headers?: HeadersInit } };

const BEARER_PREFIX = 'Bearer ';

/** The token a request was sent with (`''` for none), or `undefined` when the options are unknown. */
function sentToken(options: AdminResponseErrorContext['options']): string | undefined {
  if (!options) return undefined;
  const authorization = new Headers(options.headers).get('Authorization') ?? '';
  return authorization.startsWith(BEARER_PREFIX) ? authorization.slice(BEARER_PREFIX.length) : '';
}

const RELATIVE_PROBE_ORIGIN = 'https://relative.invalid';

/**
 * Every URL `fetch` could take from `request`: a `Request` is fetched by its `url`, anything else by
 * `String(request)`. Both are checked, without `instanceof` (it fails for objects from another realm)
 * and without trusting `href` (fetch never reads it).
 */
function requestUrls(request: RequestInfo | URL): string[] {
  if (typeof request === 'string') return [request];
  const { url } = request as { url?: unknown };
  return typeof url === 'string' ? [String(request), url] : [String(request)];
}

/**
 * Whether the request, its `baseURL`, and the URL ofetch builds from them (`withBase`, applied after
 * `onRequest`) all stay on `origin`. Each is resolved with the URL parser — the same one `fetch` uses,
 * which strips whitespace / tabs and reads `\` as `/` — so a disguised absolute URL can't pass as
 * relative. No known origin (server): relative only. Fails closed on parse errors.
 */
function isSameOriginRequest(ctx: AdminRequestContext, origin: string | null | undefined): boolean {
  const { request, options } = ctx;
  const built = typeof request === 'string' && options.baseURL ? withBase(request, options.baseURL) : undefined;
  const base = origin ?? RELATIVE_PROBE_ORIGIN;
  try {
    const expected = new URL(base).origin;
    return [...requestUrls(request), options.baseURL, built]
      .filter((url): url is string => Boolean(url))
      .every((url) => new URL(url, base).origin === expected);
  } catch {
    return false;
  }
}

/**
 * @param origin The app origin; defaults to `location.origin` (absent on the server).
 *   Pass `null` to allow relative URLs only.
 */
export function adminFetchOptions(
  getSession: () => AdminSession,
  onUnauthorized: () => void | Promise<void>,
  origin?: string | null
) {
  return {
    onRequest(ctx: AdminRequestContext): void {
      const appOrigin = origin === undefined ? globalThis.location?.origin : origin;
      if (!isSameOriginRequest(ctx, appOrigin)) return;
      const { token, database } = getSession();
      const headers = new Headers(ctx.options.headers);
      if (token) headers.set('Authorization', `${BEARER_PREFIX}${token}`);
      headers.set(ADMIN_DATABASE_HEADER, database);
      ctx.options.headers = headers;
    },
    async onResponseError({ response, options }: AdminResponseErrorContext): Promise<void> {
      if (response?.status !== 401) return;
      // A 401 for a request sent with another token (or none) must not sign out the token entered since.
      const sent = sentToken(options);
      if (sent !== undefined && sent !== getSession().token) return;
      try {
        await onUnauthorized();
      } catch (error) {
        // The caller must still receive the original 401, not the sign-out failure.
        console.error('[adminFetch] sign-out after 401 failed', error);
      }
    },
  };
}

/** Sign-in check route (`server/api/admin/session.get.ts`). */
export const ADMIN_SESSION_CHECK_PATH = '/api/admin/session';

/** Result of the sign-in token check; a rejection carries the server's `statusMessage`. */
export type AdminTokenCheck = { ok: true } | { ok: false; statusMessage?: string };

/**
 * Asks the server whether `token` is the admin token: not-ok (with the server's reason) on 401, rethrows anything else.
 * Uses plain `$fetch` — a wrong token here must not trigger `adminFetch`'s expired-session sign-out.
 */
export async function verifyAdminToken(token: string, fetcher: typeof $fetch = $fetch): Promise<AdminTokenCheck> {
  try {
    await fetcher(ADMIN_SESSION_CHECK_PATH, { headers: { Authorization: `${BEARER_PREFIX}${token}` } });
    return { ok: true };
  } catch (error) {
    if (fetchErrorStatus(error) === 401) return { ok: false, statusMessage: fetchErrorMessage(error) };
    throw error;
  }
}

/** The app's admin fetch (client). Use instead of `$fetch` + manual headers. */
export function useAdminFetch(): typeof $fetch {
  const adminFetch = useNuxtApp().$adminFetch;
  if (typeof adminFetch !== 'function') {
    throw new Error('adminFetch is client-only: the admin-session plugin has not run');
  }
  return adminFetch as typeof $fetch;
}
