/**
 * Admin browser session — one sessionStorage key (`tgmc-admin-session`) holding the bearer token
 * and the selected database. Pure (storage passed in); the Vue adapter is `useAdminSession`.
 */
import { isAdminDatabase, type AdminDatabase } from './admin-database';

export const ADMIN_SESSION_KEY = 'tgmc-admin-session';
const ADMIN_SESSION_VERSION = 1;
const LEGACY_TOKEN_KEY = 'portfolio.adminToken';
const LEGACY_DATABASE_KEY = 'portfolio.adminDatabase';

export type AdminSession = { token: string; database: AdminDatabase };

export const defaultAdminSession = (): AdminSession => ({ token: '', database: 'sqlite' });

export function parseAdminSession(raw: string | null): AdminSession {
  const base = defaultAdminSession();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; token?: unknown; database?: unknown } | null;
    if (!parsed || parsed.v !== ADMIN_SESSION_VERSION) return base;
    return {
      token: typeof parsed.token === 'string' ? parsed.token.trim() : '',
      database: isAdminDatabase(parsed.database) ? parsed.database : base.database,
    };
  } catch {
    return base;
  }
}

export function persistAdminSession(storage: Pick<Storage, 'setItem' | 'removeItem'>, session: AdminSession): void {
  const token = session.token.trim();
  if (!token && session.database === defaultAdminSession().database) {
    storage.removeItem(ADMIN_SESSION_KEY);
    return;
  }
  storage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ v: ADMIN_SESSION_VERSION, token, database: session.database }));
}

/** Read the session, converting the old `portfolio.*` keys once (new key written before old removed). */
export function loadAdminSession(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): AdminSession {
  const legacyToken = storage.getItem(LEGACY_TOKEN_KEY);
  const legacyDatabase = storage.getItem(LEGACY_DATABASE_KEY);
  if (storage.getItem(ADMIN_SESSION_KEY) == null && (legacyToken != null || legacyDatabase != null)) {
    const database = legacyDatabase?.trim().toLowerCase();
    persistAdminSession(storage, {
      token: legacyToken?.trim() ?? '',
      database: isAdminDatabase(database) ? database : defaultAdminSession().database,
    });
  }
  storage.removeItem(LEGACY_TOKEN_KEY);
  storage.removeItem(LEGACY_DATABASE_KEY);
  return parseAdminSession(storage.getItem(ADMIN_SESSION_KEY));
}
