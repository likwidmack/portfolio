/**
 * Admin session adapter — one `useState`, filled from sessionStorage by `admin-session.client.ts`
 * before the first client render (admin routes are client-only, see the layer `nuxt.config.ts`),
 * persisted to sessionStorage only when it changes.
 */
import { ADMIN_DATABASE_LABELS, type AdminDatabase } from '../utils/admin-database';
import { defaultAdminSession, persistAdminSession, type AdminSession } from '../utils/admin-session';

export const useAdminSessionState = () => useState<AdminSession>('tgmc-admin-session', defaultAdminSession);

export const useAdminSession = () => {
  const session = useAdminSessionState();

  const write = (next: AdminSession) => {
    session.value = next;
    if (import.meta.server) return;
    try {
      persistAdminSession(sessionStorage, next);
    } catch {
      // Blocked or full storage: keep the in-memory session for this tab.
    }
  };

  return {
    token: computed(() => session.value.token),
    database: computed(() => session.value.database),
    databaseLabel: computed(() => ADMIN_DATABASE_LABELS[session.value.database]),
    signedIn: computed(() => Boolean(session.value.token)),
    signIn: (token: string) => write({ ...session.value, token: token.trim() }),
    signOut: () => write({ ...session.value, token: '' }),
    setDatabase: (database: AdminDatabase) => write({ ...session.value, database }),
  };
};
