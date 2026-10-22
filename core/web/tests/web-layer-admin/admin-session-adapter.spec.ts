import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useAdminSession, useAdminSessionState } from '@tgmc/web-layer-admin/app/composables/useAdminSession';
import adminAuth from '@tgmc/web-layer-admin/app/middleware/admin-auth';
import adminSessionPlugin from '@tgmc/web-layer-admin/app/plugins/admin-session.client';
import type { adminFetchOptions } from '@tgmc/web-layer-admin/app/utils/admin-fetch';
import { ADMIN_SESSION_KEY, defaultAdminSession } from '@tgmc/web-layer-admin/app/utils/admin-session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref, type Ref } from 'vue';

vi.hoisted(() => {
  Object.assign(globalThis, {
    defineNuxtPlugin: <T>(plugin: T) => plugin,
    defineNuxtRouteMiddleware: <T>(middleware: T) => middleware,
  });
});

const layerRoot = join(__dirname, '../../../../packages/web-layer-admin');
const layer = join(layerRoot, 'app');
const read = (p: string) => readFileSync(join(layer, p), 'utf8');

const nuxtApp = (fullPath = '/admin/blog?x=1') => ({
  $router: { currentRoute: { value: { fullPath, path: fullPath.split(/[?#]/)[0] } } },
  runWithContext: <T>(fn: () => T) => fn(),
});

const plugin = adminSessionPlugin as unknown as {
  // eslint-disable-next-line no-unused-vars
  setup(app: ReturnType<typeof nuxtApp>): { provide: { adminFetch: ReturnType<typeof adminFetchOptions> } };
};
// eslint-disable-next-line no-unused-vars
const middleware = adminAuth as unknown as (to: { path: string; fullPath: string }) => unknown;

let states: Map<string, Ref<unknown>>;
let navigateTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  states = new Map();
  navigateTo = vi.fn();
  sessionStorage.clear();
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()));
    return states.get(key);
  });
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('navigateTo', navigateTo);
  vi.stubGlobal('$fetch', { create: <T>(options: T) => options });
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { adminWritesEnabled: true } }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('admin session adapters (source guards)', () => {
  it('plugin hydrates once from sessionStorage and provides adminFetch', () => {
    const src = read('plugins/admin-session.client.ts');
    expect(src).toContain('loadAdminSession(sessionStorage)');
    expect(src).toContain('$fetch.create(');
    expect(src).toContain('provide: { adminFetch');
  });

  it('plugin survives blocked storage and sends expired sessions back with the page', () => {
    const src = read('plugins/admin-session.client.ts');
    expect(src).toMatch(/try\s*\{\s*session\.value = loadAdminSession\(sessionStorage\)/);
    expect(src).toContain('expiredSignInTarget(');
    expect(src).toContain('nuxtApp.$router.currentRoute.value');
    expect(src).toContain('isAdminSignInPath(path)');
  });

  it('composable writes storage only through persistAdminSession', () => {
    const src = read('composables/useAdminSession.ts');
    expect(src).toContain('persistAdminSession(sessionStorage');
    expect(src).not.toMatch(/sessionStorage\.(getItem|setItem)/);
    expect(src).toMatch(/try\s*\{\s*persistAdminSession\(sessionStorage/);
  });

  it('middleware delegates to adminAuthRedirect and skips the sign-in page', () => {
    const src = read('middleware/admin-auth.ts');
    expect(src).toContain('adminAuthRedirect(');
    expect(src).toContain('isAdminSignInPath(to.path)');
  });

  it('the layer renders /admin and /admin/** client-only (session comes from sessionStorage)', () => {
    const config = readFileSync(join(layerRoot, 'nuxt.config.ts'), 'utf8');
    expect(config).toMatch(/'\/admin':\s*\{\s*ssr:\s*false\s*\}/);
    expect(config).toMatch(/'\/admin\/\*\*':\s*\{\s*ssr:\s*false\s*\}/);
  });

  it('no page reads the token or builds admin headers by hand', () => {
    const files = [
      'pages/admin/index.vue',
      'pages/admin/blog/index.vue',
      'pages/admin/blog/[id].vue',
      '../../../core/admin/app/pages/admin/messages/index.vue',
      '../../../core/admin/app/pages/admin/cdn/index.vue',
      '../../../core/admin/app/pages/admin/media/index.vue',
      '../../../core/admin/app/components/AdminDatabaseSelector.vue',
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toMatch(/readAdminToken|adminRequestHeaders|useAdminDatabase|utils\/admin-token/);
    }
    for (const file of files.slice(1, 6)) expect(read(file), file).toContain("middleware: 'admin-auth'");
  });

  it('sign-in shows the expired message and follows a safe redirect; media 401s go through the expired flow', () => {
    const signIn = read('pages/admin/index.vue');
    expect(signIn).toContain('Session expired — enter the token again.');
    expect(signIn).toContain('safeAdminRedirect(route.query.redirect)');
    const media = read('../../../core/admin/app/pages/admin/media/index.vue');
    expect(media).toContain('expiredSignInTarget(');
    expect(media).toContain('if (sentToken !== adminToken.value) return;');
  });

  it('sign-in focuses the token field after an expired session or a rejected token', () => {
    const signIn = read('pages/admin/index.vue');
    expect(signIn).toMatch(
      /const focusToken = async[\s\S]*nextTick[\s\S]*getElementById\('admin-token'\)\?\.focus\(\)/
    );
    expect(signIn).toMatch(/expired === '1'[\s\S]*await focusToken\(\)/);
    expect(signIn).toMatch(/rejectedTokenMessage\(check\.statusMessage\);\s*await focusToken\(\)/);
  });

  it('sign-in checks the token with the server before saving it', () => {
    const signIn = read('pages/admin/index.vue');
    expect(signIn).toMatch(/await verifyAdminToken\(candidate\)[\s\S]*signIn\(candidate\)/);
    expect(signIn).toContain('message.value = signInErrorMessage(error);');
    expect(signIn).not.toContain('writesEnabled');
  });

  it('new posts keep the slug in step with the whole title until it is edited by hand', () => {
    const editor = read('pages/admin/blog/[id].vue');
    expect(editor).toContain('form.slug === normalizeSlug(previousTitle');
    expect(editor).not.toMatch(/isNew\.value && !form\.slug/);
  });

  it('blog pages refetch on every database change (no stale loaded-database guard)', () => {
    for (const file of ['pages/admin/blog/index.vue', 'pages/admin/blog/[id].vue']) {
      const src = read(file);
      expect(src, file).not.toContain('loadedDatabase');
      expect(src, file).toContain('watch(adminDatabase');
    }
  });
});

describe('useAdminSession', () => {
  it('signs in with a trimmed token, keeps the database on sign-out, and labels the database', () => {
    const session = useAdminSession();
    expect(session.signedIn.value).toBe(false);
    session.setDatabase('postgres');
    session.signIn('  secret  ');
    expect(session.token.value).toBe('secret');
    expect(session.signedIn.value).toBe(true);
    expect(session.databaseLabel.value).toBe('PostgreSQL');
    session.signOut();
    expect(session.signedIn.value).toBe(false);
    expect(session.database.value).toBe('postgres');
    expect(useAdminSessionState().value).toEqual({ token: '', database: 'postgres' });
  });

  it('persists each change to sessionStorage', () => {
    useAdminSession().signIn('secret');
    expect(JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY)!)).toEqual({
      v: 1,
      token: 'secret',
      database: 'sqlite',
    });
  });

  it('keeps the in-memory session when sessionStorage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const session = useAdminSession();
    expect(() => session.signIn('x')).not.toThrow();
    expect(session.signedIn.value).toBe(true);
    expect(session.token.value).toBe('x');
  });
});

describe('admin-session plugin', () => {
  it('hydrates the shared state from sessionStorage before render', () => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ v: 1, token: 'secret', database: 'dynamodb' }));
    plugin.setup(nuxtApp());
    expect(useAdminSessionState().value).toEqual({ token: 'secret', database: 'dynamodb' });
  });

  it('falls back to the default session when sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => plugin.setup(nuxtApp())).not.toThrow();
    expect(useAdminSessionState().value).toEqual(defaultAdminSession());
  });

  it('signs out once on parallel 401s and returns to sign-in with the current page', async () => {
    let settle!: () => void;
    navigateTo.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ v: 1, token: 'secret', database: 'postgres' }));
    const { adminFetch } = plugin.setup(nuxtApp('/admin/blog?x=1')).provide;

    const first = adminFetch.onResponseError({ response: { status: 401 } });
    const second = adminFetch.onResponseError({ response: { status: 401 } });
    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(navigateTo).toHaveBeenCalledWith({
      path: '/admin',
      query: { expired: '1', redirect: '/admin/blog?x=1' },
    });
    expect(useAdminSessionState().value).toEqual({ token: '', database: 'postgres' });

    settle();
    await Promise.all([first, second]);
    navigateTo.mockReturnValue(Promise.resolve());
    await adminFetch.onResponseError({ response: { status: 401 } });
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it('clears the pending sign-out after a failed navigation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    navigateTo.mockReturnValueOnce(Promise.reject(new Error('navigation failed')));
    const { adminFetch } = plugin.setup(nuxtApp('/admin/media')).provide;
    await adminFetch.onResponseError({ response: { status: 401 } });
    navigateTo.mockReturnValueOnce(Promise.resolve());
    await adminFetch.onResponseError({ response: { status: 401 } });
    expect(navigateTo).toHaveBeenCalledTimes(2);
    expect(navigateTo).toHaveBeenLastCalledWith({
      path: '/admin',
      query: { expired: '1', redirect: '/admin/media' },
    });
  });

  it.each(['/admin?expired=1&redirect=/admin/blog', '/admin/'])(
    'signs out without navigating when a 401 arrives on the sign-in page (%s)',
    async (fullPath) => {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ v: 1, token: 'secret', database: 'sqlite' }));
      const { adminFetch } = plugin.setup(nuxtApp(fullPath)).provide;
      await adminFetch.onResponseError({ response: { status: 401 } });
      expect(useAdminSessionState().value.token).toBe('');
      expect(navigateTo).not.toHaveBeenCalled();
    }
  );
});

describe('admin-auth middleware', () => {
  it('sends signed-out visitors to sign-in with the page as redirect', () => {
    navigateTo.mockReturnValue('navigated');
    expect(middleware({ path: '/admin/blog', fullPath: '/admin/blog?x=1' })).toBe('navigated');
    expect(navigateTo).toHaveBeenCalledWith('/admin?redirect=%2Fadmin%2Fblog%3Fx%3D1');
  });

  it('lets signed-in visitors through', () => {
    useAdminSession().signIn('secret');
    expect(middleware({ path: '/admin/blog', fullPath: '/admin/blog' })).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('never guards the sign-in page itself, with or without a trailing slash', () => {
    expect(middleware({ path: '/admin', fullPath: '/admin?expired=1' })).toBeUndefined();
    expect(middleware({ path: '/admin/', fullPath: '/admin/' })).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('stays out of the way when admin writes are disabled', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { adminWritesEnabled: false } }));
    expect(middleware({ path: '/admin/blog', fullPath: '/admin/blog' })).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });
});
