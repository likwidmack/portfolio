// @vitest-environment node

import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { createPostgresMessageStore } from './postgres';

describe('createPostgresMessageStore', () => {
  it('throws without DATABASE_URL or pool', () => {
    const previous = process.env.DATABASE_URL;
    const previousNuxt = process.env.NUXT_DATABASE_URL;
    Reflect.deleteProperty(process.env, 'DATABASE_URL');
    Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');

    try {
      expect(() => createPostgresMessageStore({ databaseUrl: '' })).toThrow(/DATABASE_URL/);
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DATABASE_URL');
      } else {
        process.env.DATABASE_URL = previous;
      }
      if (previousNuxt === undefined) {
        Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');
      } else {
        process.env.NUXT_DATABASE_URL = previousNuxt;
      }
    }
  });

  it('falls through empty databaseUrl to process.env.DATABASE_URL', () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://env-user:env-pass@localhost:5432/env-db';

    try {
      const store = createPostgresMessageStore({ databaseUrl: '' });
      expect(store).toBeTruthy();
      void store.close?.();
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DATABASE_URL');
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });

  it('runs migration then create/list via pool', async () => {
    const rows: Array<{
      id: string;
      name: string;
      email: string;
      body: string;
      created_at: string;
    }> = [];

    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('CREATE TABLE')) {
        return { rows: [] };
      }
      if (sql.startsWith('INSERT')) {
        const [id, name, email, body, created_at] = params as string[];
        rows.unshift({ id, name, email, body, created_at });
        return { rows: [] };
      }
      if (sql.startsWith('SELECT')) {
        return { rows: [...rows] };
      }
      return { rows: [] };
    });

    const end = vi.fn(async () => undefined);

    const pool = { query, end } as unknown as Pool;
    const store = createPostgresMessageStore({ pool });

    const created = await store.create({
      name: 'Dev',
      email: 'dev@example.com',
      body: 'Postgres path',
    });
    expect(created.name).toBe('Dev');

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: 'Dev',
      email: 'dev@example.com',
      body: 'Postgres path',
    });

    await store.close?.();
    expect(end).toHaveBeenCalledOnce();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('CREATE TABLE'))).toBe(true);
  });
});
