/**
 * Client helper for admin database selection (sessionStorage + request header).
 */
export const ADMIN_DATABASE_STORAGE_KEY = 'portfolio.adminDatabase';

export type AdminDatabase = 'sqlite' | 'postgres' | 'dynamodb';

export const ADMIN_DATABASES: readonly AdminDatabase[] = ['sqlite', 'postgres', 'dynamodb'] as const;

export const ADMIN_DATABASE_LABELS: Record<AdminDatabase, string> = {
  sqlite: 'SQLite',
  postgres: 'PostgreSQL',
  dynamodb: 'DynamoDB',
};

const isAdminDatabase = (value: string | undefined): value is AdminDatabase =>
  value === 'sqlite' || value === 'postgres' || value === 'dynamodb';

export const readAdminDatabase = (fallback: AdminDatabase = 'sqlite'): AdminDatabase => {
  if (!import.meta.client) {
    return fallback; // SSR has no sessionStorage — server uses header/query only.
  }
  const stored = sessionStorage.getItem(ADMIN_DATABASE_STORAGE_KEY)?.trim().toLowerCase();
  return isAdminDatabase(stored) ? stored : fallback;
};

export const writeAdminDatabase = (database: AdminDatabase): void => {
  if (!import.meta.client) {
    return;
  }
  sessionStorage.setItem(ADMIN_DATABASE_STORAGE_KEY, database);
};

export const adminDatabaseHeader = (): Record<string, string> => {
  // Must match ADMIN_DATABASE_HEADER / resolveAdminDatabase on the server.
  return { 'X-Admin-Database': readAdminDatabase() };
};
