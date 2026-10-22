import {
  adminAuthRedirect,
  expiredSignInTarget,
  safeAdminRedirect,
} from '@tgmc/web-layer-admin/app/utils/admin-auth-redirect';
import {
  ADMIN_DATABASE_HEADER,
  ADMIN_SESSION_CHECK_PATH,
  adminFetchOptions,
  useAdminFetch,
  verifyAdminToken,
} from '@tgmc/web-layer-admin/app/utils/admin-fetch';
import { fetchErrorMessage, fetchErrorStatus } from '@tgmc/web-layer-admin/app/utils/fetch-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Ctx = { request: RequestInfo | URL; options: { headers?: HeadersInit; baseURL?: string } };

const SITE = 'https://site.example';
const session =
  (token = 'abc') =>
  () => ({ token, database: 'postgres' as const });
const requestHeaders = (opts: ReturnType<typeof adminFetchOptions>, ctx: Ctx) => {
  opts.onRequest(ctx);
  return new Headers(ctx.options.headers);
};

describe('adminFetchOptions', () => {
  it('adds bearer + database headers from the in-memory session and keeps caller headers', () => {
    const opts = adminFetchOptions(session(), vi.fn(), SITE);
    const headers = requestHeaders(opts, {
      request: '/api/admin/blog',
      options: { headers: { 'Content-Type': 'application/json' } },
    });
    expect(headers.get('Authorization')).toBe('Bearer abc');
    expect(headers.get(ADMIN_DATABASE_HEADER)).toBe('postgres');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('sends no Authorization without a token', () => {
    const opts = adminFetchOptions(() => ({ token: '', database: 'sqlite' }), vi.fn(), SITE);
    const headers = requestHeaders(opts, { request: '/api/admin/blog', options: {} });
    expect(headers.has('Authorization')).toBe(false);
    expect(headers.get(ADMIN_DATABASE_HEADER)).toBe('sqlite');
  });

  it('reads the session on every request', () => {
    let current = { token: 'first', database: 'sqlite' as const };
    const opts = adminFetchOptions(() => current, vi.fn(), SITE);
    const first = requestHeaders(opts, { request: '/api/a', options: {} });
    current = { token: 'second', database: 'sqlite' };
    const second = requestHeaders(opts, { request: '/api/a', options: {} });
    expect(first.get('Authorization')).toBe('Bearer first');
    expect(second.get('Authorization')).toBe('Bearer second');
  });

  it('attaches the session to relative and same-origin URLs only', () => {
    const opts = adminFetchOptions(session(), vi.fn(), SITE);
    for (const request of [
      '/api/a',
      'api/a',
      `${SITE}/api/a`,
      new URL(`${SITE}/api/a`),
      new Request(`${SITE}/api/a`),
    ]) {
      expect(requestHeaders(opts, { request, options: {} }).get('Authorization')).toBe('Bearer abc');
    }
    for (const request of [
      'https://evil.example/api/a',
      '//evil.example/api/a',
      '/\\evil.example/api/a',
      'http://site.example/api/a',
      new URL('https://evil.example/api/a'),
      new Request('https://evil.example/api/a'),
    ]) {
      const headers = requestHeaders(opts, { request, options: { headers: { Accept: 'application/json' } } });
      expect(headers.has('Authorization')).toBe(false);
      expect(headers.has(ADMIN_DATABASE_HEADER)).toBe(false);
      expect(headers.get('Accept')).toBe('application/json');
    }
  });

  it('checks every URL fetch could use for an object request, without instanceof or href', () => {
    const opts = adminFetchOptions(session(), vi.fn(), SITE);
    const sends = (request: unknown) =>
      requestHeaders(opts, { request: request as URL, options: {} }).has('Authorization');
    // A URL from another realm (iframe) fails `instanceof URL`; fetch stringifies it.
    expect(sends({ href: 'https://evil.example/a', toString: () => 'https://evil.example/a' })).toBe(false);
    expect(sends({ href: `${SITE}/a`, toString: () => `${SITE}/a` })).toBe(true);
    // `href` is never what fetch requests.
    expect(sends({ href: `${SITE}/a`, toString: () => 'https://evil.example/a' })).toBe(false);
    // Request-shaped objects: both `url` and the string form must stay on the origin.
    expect(sends({ url: `${SITE}/a`, toString: () => 'https://evil.example/a' })).toBe(false);
    expect(sends({ url: 'https://evil.example/a' })).toBe(false);
    expect(
      sends({
        toString: () => {
          throw new Error('no string form');
        },
      })
    ).toBe(false);
  });

  it('checks a third-party baseURL, not just the relative path', () => {
    const opts = adminFetchOptions(session(), vi.fn(), SITE);
    expect(
      requestHeaders(opts, { request: '/a', options: { baseURL: 'https://evil.example' } }).has('Authorization')
    ).toBe(false);
    expect(requestHeaders(opts, { request: '/a', options: { baseURL: '/api' } }).get('Authorization')).toBe(
      'Bearer abc'
    );
  });

  it('fails closed on absolute URLs disguised with whitespace when a baseURL is set', () => {
    for (const origin of [SITE, null]) {
      const opts = adminFetchOptions(session(), vi.fn(), origin);
      for (const request of [' https://evil.example/x', 'ht\ttps://evil.example/x', '\n//evil.example/x']) {
        const headers = requestHeaders(opts, { request, options: { baseURL: '/api' } });
        expect(headers.has('Authorization')).toBe(false);
        expect(headers.has(ADMIN_DATABASE_HEADER)).toBe(false);
      }
    }
  });

  it('checks the URL ofetch builds from baseURL + request, not only each part', () => {
    for (const origin of [SITE, null]) {
      const opts = adminFetchOptions(session(), vi.fn(), origin);
      for (const request of ['/evil.example/x', 'evil.example/x']) {
        const headers = requestHeaders(opts, { request, options: { baseURL: '\\' } });
        expect(headers.has('Authorization')).toBe(false);
        expect(headers.has(ADMIN_DATABASE_HEADER)).toBe(false);
      }
      // ufo keeps this as-is; it resolves to a path on the app origin.
      const sameSite = requestHeaders(opts, { request: '\\evil.example/x', options: { baseURL: '/' } });
      expect(sameSite.get('Authorization')).toBe('Bearer abc');
    }
  });

  it('sends nothing when the request or baseURL cannot be parsed', () => {
    const opts = adminFetchOptions(session(), vi.fn(), SITE);
    expect(requestHeaders(opts, { request: 'http://[bad/x', options: {} }).has('Authorization')).toBe(false);
    expect(requestHeaders(opts, { request: '/a', options: { baseURL: 'http://[bad' } }).has('Authorization')).toBe(
      false
    );
  });

  it('with an unknown origin (server), only relative URLs get the session', () => {
    const opts = adminFetchOptions(session(), vi.fn(), null);
    expect(requestHeaders(opts, { request: '/api/a', options: {} }).get('Authorization')).toBe('Bearer abc');
    expect(requestHeaders(opts, { request: `${SITE}/api/a`, options: {} }).has('Authorization')).toBe(false);
  });

  it('defaults the origin to the current location', () => {
    const opts = adminFetchOptions(session(), vi.fn());
    const request = `${globalThis.location.origin}/api/a`;
    expect(requestHeaders(opts, { request, options: {} }).get('Authorization')).toBe('Bearer abc');
  });

  it('signs out on a 401 only when the request carried the current session token', async () => {
    let current = { token: 'abc', database: 'sqlite' as const };
    const onUnauthorized = vi.fn();
    const opts = adminFetchOptions(() => current, onUnauthorized, SITE);
    const sent: Ctx = { request: '/api/a', options: {} };
    opts.onRequest(sent);

    await opts.onResponseError({ response: { status: 401 }, options: sent.options });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    current = { token: 'new', database: 'sqlite' };
    await opts.onResponseError({ response: { status: 401 }, options: sent.options });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('ignores a 401 for a request sent before a token was entered', async () => {
    let current = { token: '', database: 'sqlite' as const };
    const onUnauthorized = vi.fn();
    const opts = adminFetchOptions(() => current, onUnauthorized, SITE);
    const sent: Ctx = { request: '/api/a', options: {} };
    opts.onRequest(sent);
    current = { token: 'fresh', database: 'sqlite' };
    await opts.onResponseError({ response: { status: 401 }, options: sent.options });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('calls onUnauthorized on 401 only', async () => {
    const onUnauthorized = vi.fn();
    const opts = adminFetchOptions(session(), onUnauthorized, SITE);
    await opts.onResponseError({ response: { status: 500 } });
    await opts.onResponseError({});
    await opts.onResponseError({ response: { status: 401 } });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('a failing onUnauthorized does not replace the original 401 and is logged', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rejecting = adminFetchOptions(session(), () => Promise.reject(new Error('navigation failed')), SITE);
    await expect(rejecting.onResponseError({ response: { status: 401 } })).resolves.toBeUndefined();
    const throwing = adminFetchOptions(
      session(),
      () => {
        throw new Error('sign-out failed');
      },
      SITE
    );
    await expect(throwing.onResponseError({ response: { status: 401 } })).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('abc');
    consoleError.mockRestore();
  });
});

describe('verifyAdminToken', () => {
  const fetcherFor = (impl: () => Promise<unknown>) => vi.fn(impl) as unknown as typeof $fetch;

  it('sends the candidate token to the session check and resolves ok when accepted', async () => {
    const fetcher = fetcherFor(async () => ({ ok: true }));
    await expect(verifyAdminToken('abc', fetcher)).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(ADMIN_SESSION_CHECK_PATH, { headers: { Authorization: 'Bearer abc' } });
  });

  it('resolves not-ok with the server reason on 401', async () => {
    await expect(
      verifyAdminToken(
        'nope',
        fetcherFor(() => Promise.reject({ statusCode: 401, statusMessage: 'Unauthorized' }))
      )
    ).resolves.toEqual({ ok: false, statusMessage: 'Unauthorized' });
  });

  it('rethrows other failures so the form can tell them apart from a wrong token', async () => {
    const failure = { statusCode: 500 };
    await expect(
      verifyAdminToken(
        'abc',
        fetcherFor(() => Promise.reject(failure))
      )
    ).rejects.toBe(failure);
  });
});

describe('useAdminFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the provided $adminFetch', () => {
    const adminFetch = vi.fn();
    vi.stubGlobal('useNuxtApp', () => ({ $adminFetch: adminFetch }));
    expect(useAdminFetch()).toBe(adminFetch);
  });

  it('throws a clear error before the admin-session plugin has run', () => {
    vi.stubGlobal('useNuxtApp', () => ({}));
    expect(() => useAdminFetch()).toThrow('adminFetch is client-only: the admin-session plugin has not run');
  });
});

describe('adminAuthRedirect', () => {
  it('redirects to sign-in with the target path only when writes are enabled and signed out', () => {
    expect(adminAuthRedirect({ path: '/admin/blog?x=1', signedIn: false, writesEnabled: true })).toBe(
      '/admin?redirect=%2Fadmin%2Fblog%3Fx%3D1'
    );
    expect(adminAuthRedirect({ path: '/admin/blog', signedIn: true, writesEnabled: true })).toBeNull();
    expect(adminAuthRedirect({ path: '/admin/blog', signedIn: false, writesEnabled: false })).toBeNull();
  });
});

describe('safeAdminRedirect', () => {
  it('only follows /admin/ redirects', () => {
    expect(safeAdminRedirect('/admin/media')).toBe('/admin/media');
    expect(safeAdminRedirect('/admin/blog?x=1#top')).toBe('/admin/blog?x=1#top');
    expect(safeAdminRedirect('https://evil.example')).toBe('/admin/blog');
    expect(safeAdminRedirect('//evil.example')).toBe('/admin/blog');
    expect(safeAdminRedirect(undefined)).toBe('/admin/blog');
  });

  it('rejects paths that escape /admin/ or the origin once normalised', () => {
    for (const value of [
      '/admin',
      '/admin/',
      '/admin/?x=1',
      '/administrator',
      '/admin/../blog',
      '/admin/..//evil.example',
      '/admin/\\evil.example',
      '/\\evil.example',
      '/admin/\tx',
      ' /admin/blog',
      ['/admin/media'],
      42,
    ]) {
      expect(safeAdminRedirect(value)).toBe('/admin/blog');
    }
  });

  it('handles encoded and scheme payloads safely', () => {
    expect(safeAdminRedirect('/admin/%2e%2e/blog')).toBe('/admin/blog');
    expect(safeAdminRedirect('/admin/%2e%2e/%2e%2e/evil')).toBe('/admin/blog');
    // Still-encoded slashes / backslashes stay inside the /admin/ path on this origin.
    expect(safeAdminRedirect('/admin/%2F%2Fevil.example')).toBe('/admin/%2F%2Fevil.example');
    expect(safeAdminRedirect('/admin/%5Cevil.example')).toBe('/admin/%5Cevil.example');
    expect(safeAdminRedirect('javascript:alert(1)')).toBe('/admin/blog');
    expect(safeAdminRedirect('/admin/\nx')).toBe('/admin/blog');
  });

  it('round-trips the target that adminAuthRedirect encodes', () => {
    const signIn = adminAuthRedirect({ path: '/admin/blog?x=1', signedIn: false, writesEnabled: true })!;
    const target = new URL(signIn, 'https://site.example').searchParams.get('redirect');
    expect(safeAdminRedirect(target)).toBe('/admin/blog?x=1');
  });
});

describe('expiredSignInTarget', () => {
  it('keeps a real /admin/... page as the redirect', () => {
    expect(expiredSignInTarget('/admin/blog?x=1')).toEqual({
      path: '/admin',
      query: { expired: '1', redirect: '/admin/blog?x=1' },
    });
    expect(expiredSignInTarget('/admin/blog')).toEqual({
      path: '/admin',
      query: { expired: '1', redirect: '/admin/blog' },
    });
  });

  it('drops the redirect for the sign-in page, other pages, and unsafe paths', () => {
    for (const path of [
      '/admin',
      '/admin/',
      '/admin/?x=1',
      '/admin?expired=1',
      '/',
      '//evil.example',
      '/admin/../blog',
      '/admin/\\evil',
    ]) {
      expect(expiredSignInTarget(path)).toEqual({ path: '/admin', query: { expired: '1' } });
    }
  });
});

describe('fetch errors', () => {
  it('reads statusCode / statusMessage from ofetch errors', () => {
    expect(fetchErrorStatus({ statusCode: 401 })).toBe(401);
    expect(fetchErrorStatus('x')).toBeUndefined();
    expect(fetchErrorStatus(null)).toBeUndefined();
    expect(fetchErrorMessage({ statusMessage: 'Nope' })).toBe('Nope');
    expect(fetchErrorMessage(undefined)).toBeUndefined();
  });
});
