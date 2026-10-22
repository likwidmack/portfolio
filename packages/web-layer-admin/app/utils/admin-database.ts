/**
 * Admin database choices (sqlite | postgres | dynamodb) and their labels.
 */
export type AdminDatabase = 'sqlite' | 'postgres' | 'dynamodb';

export const ADMIN_DATABASES: readonly AdminDatabase[] = ['sqlite', 'postgres', 'dynamodb'] as const;

export const ADMIN_DATABASE_LABELS: Record<AdminDatabase, string> = {
  sqlite: 'SQLite',
  postgres: 'PostgreSQL',
  dynamodb: 'DynamoDB',
};

export const isAdminDatabase = (value: unknown): value is AdminDatabase =>
  value === 'sqlite' || value === 'postgres' || value === 'dynamodb';
