// @vitest-environment node

import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { createPostgresBlogPostStore } from './blog-postgres';
import { BlogPostSlugConflictError } from './blog-types';

describe('createPostgresBlogPostStore', () => {
  it('throws without DATABASE_URL or pool', () => {
    const previous = process.env.DATABASE_URL;
    const previousNuxt = process.env.NUXT_DATABASE_URL;
    Reflect.deleteProperty(process.env, 'DATABASE_URL');
    Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');

    try {
      expect(() => createPostgresBlogPostStore({ databaseUrl: '' })).toThrow(/DATABASE_URL/);
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

  it('runs migration then create/list/update/delete via pool', async () => {
    const rows: Array<{
      id: string;
      slug: string;
      title: string;
      excerpt: string;
      body: string;
      status: 'draft' | 'published';
      created_at: string;
      updated_at: string;
      published_at: string | null;
    }> = [];

    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('CREATE TABLE')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT id FROM posts WHERE slug')) {
        const slug = params?.[0] as string;
        const hit = rows.find((row) => row.slug === slug);
        return { rows: hit ? [{ id: hit.id }] : [] };
      }
      if (sql.startsWith('INSERT')) {
        const [id, slug, title, excerpt, body, status, created_at, updated_at, published_at] = params as string[];
        rows.unshift({
          id,
          slug,
          title,
          excerpt,
          body,
          status: status as 'draft' | 'published',
          created_at,
          updated_at,
          published_at,
        });
        return { rows: [] };
      }
      if (sql.includes('WHERE status = ') && sql.includes('published')) {
        return { rows: rows.filter((row) => row.status === 'published') };
      }
      if (sql.startsWith('DELETE')) {
        const id = params?.[0] as string;
        const before = rows.length;
        const next = rows.filter((row) => row.id !== id);
        rows.length = 0;
        rows.push(...next);
        return { rowCount: before - rows.length, rows: [] };
      }
      if (sql.includes('WHERE id =')) {
        const id = params?.[0] as string;
        const hit = rows.find((row) => row.id === id);
        return { rows: hit ? [hit] : [] };
      }
      if (sql.includes('WHERE slug =')) {
        const slug = params?.[0] as string;
        const hit = rows.find((row) => row.slug === slug);
        return { rows: hit ? [hit] : [] };
      }
      if (sql.startsWith('UPDATE')) {
        const [slug, title, excerpt, body, status, updated_at, published_at, id] = params as string[];
        const idx = rows.findIndex((row) => row.id === id);
        if (idx >= 0) {
          rows[idx] = {
            ...rows[idx]!,
            slug,
            title,
            excerpt,
            body,
            status: status as 'draft' | 'published',
            updated_at,
            published_at,
          };
        }
        return { rows: [] };
      }
      if (sql.startsWith('SELECT')) {
        return { rows: [...rows] };
      }
      return { rows: [] };
    });

    const end = vi.fn(async () => undefined);
    const pool = { query, end } as unknown as Pool;
    const store = createPostgresBlogPostStore({ pool });

    const created = await store.create({
      slug: 'hello-world',
      title: 'Hello',
      body: 'Body',
      status: 'published',
    });
    expect(created.slug).toBe('hello-world');

    const listed = await store.listAll();
    expect(listed).toHaveLength(1);

    const published = await store.listPublished();
    expect(published).toHaveLength(1);

    const updated = await store.update(created.id, { title: 'Hello 2' });
    expect(updated?.title).toBe('Hello 2');

    await expect(store.create({ slug: 'hello-world', title: 'Dup', body: 'x' })).rejects.toBeInstanceOf(
      BlogPostSlugConflictError
    );

    expect(await store.delete(created.id)).toBe(true);
    await store.close?.();
    expect(end).toHaveBeenCalledOnce();
  });
});
