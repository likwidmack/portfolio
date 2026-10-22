/** Hydrate the admin session before the first render and provide `$adminFetch`. */
import { useAdminSession, useAdminSessionState } from '../composables/useAdminSession';
import { expiredSignInTarget, isAdminSignInPath } from '../utils/admin-auth-redirect';
import { adminFetchOptions } from '../utils/admin-fetch';
import { defaultAdminSession, loadAdminSession } from '../utils/admin-session';

export default defineNuxtPlugin({
  name: 'tgmc-admin-session',
  enforce: 'pre',
  setup(nuxtApp) {
    const session = useAdminSessionState();
    try {
      session.value = loadAdminSession(sessionStorage);
    } catch {
      session.value = defaultAdminSession();
    }
    const { signOut } = useAdminSession();

    // Parallel requests can all 401: they share one sign-out navigation.
    let signingOut: Promise<void> | null = null;
    const onUnauthorized = (): Promise<void> => {
      signOut();
      const { path, fullPath } = nuxtApp.$router.currentRoute.value;
      if (isAdminSignInPath(path)) return Promise.resolve();
      signingOut ??= (async () => {
        await nuxtApp.runWithContext(() => navigateTo(expiredSignInTarget(fullPath)));
      })().finally(() => {
        signingOut = null;
      });
      return signingOut;
    };

    const adminFetch = $fetch.create(adminFetchOptions(() => session.value, onUnauthorized));
    return { provide: { adminFetch } };
  },
});
