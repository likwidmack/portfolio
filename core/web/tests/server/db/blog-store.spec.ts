// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBlogPostStore, getBlogPostStore, resetBlogPostStore } from '../../../server/db/blog-store';

describe('createBlogPostStore factory', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await resetBlogPostStore();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('selects sqlite for local and supports create/listPublished', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'blog-store-'));
    tempDirs.push(dir);
    const databaseUrl = `file:${join(dir, 'local.sqlite')}`;

    const store = createBlogPostStore({ sysEnv: 'local', databaseUrl });
    const created = await store.create({
      title: 'Hello',
      slug: 'hello',
      excerpt: 'ex',
      body: '# Hi',
      status: 'published',
    });
    expect(created.id).toBeTruthy();

    const published = await store.listPublished();
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ slug: 'hello', title: 'Hello' });

    await store.close?.();
  });

  it('selects postgres only when DATA_BACKEND=postgres is requested (requires DATABASE_URL)', () => {
    const previous = process.env.DATABASE_URL;
    const previousNuxt = process.env.NUXT_DATABASE_URL;
    Reflect.deleteProperty(process.env, 'DATABASE_URL');
    Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');

    try {
      expect(() => createBlogPostStore({ sysEnv: 'development', dataBackend: 'postgres', databaseUrl: '' })).toThrow(
        /DATABASE_URL/
      );
      expect(() => createBlogPostStore({ sysEnv: 'local', dataBackend: 'postgres', databaseUrl: '' })).toThrow(
        /DATABASE_URL/
      );
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

  it('selects dynamodb by default for development, remote, test and production (requires DYNAMO_POSTS_TABLE)', () => {
    const previous = process.env.DYNAMO_POSTS_TABLE;
    const previousNuxt = process.env.NUXT_DYNAMO_POSTS_TABLE;
    Reflect.deleteProperty(process.env, 'DYNAMO_POSTS_TABLE');
    Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_POSTS_TABLE');

    try {
      for (const sysEnv of ['development', 'remote', 'test', 'production']) {
        expect(() => createBlogPostStore({ sysEnv, dynamoPostsTable: '' })).toThrow(/DYNAMO_POSTS_TABLE/);
      }
      // docker:local: SYS_ENV=local plus DATA_BACKEND=dynamodb → DynamoDB.
      expect(() => createBlogPostStore({ sysEnv: 'local', dataBackend: 'dynamodb', dynamoPostsTable: '' })).toThrow(
        /DYNAMO_POSTS_TABLE/
      );
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DYNAMO_POSTS_TABLE');
      } else {
        process.env.DYNAMO_POSTS_TABLE = previous;
      }
      if (previousNuxt === undefined) {
        Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_POSTS_TABLE');
      } else {
        process.env.NUXT_DYNAMO_POSTS_TABLE = previousNuxt;
      }
    }
  });

  it('lets DATA_BACKEND from the environment override the SYS_ENV default and rejects invalid values', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'blog-store-'));
    tempDirs.push(dir);
    vi.stubEnv('DATA_BACKEND', 'sqlite');
    vi.stubEnv('E2E_STORE_SYS_ENV', '');
    vi.stubEnv('SYS_ENV', 'production');
    try {
      const store = createBlogPostStore({ databaseUrl: `file:${join(dir, 'env.sqlite')}` });
      await expect(store.listPublished()).resolves.toEqual([]);
      await store.close?.();

      vi.stubEnv('DATA_BACKEND', 'mysql');
      expect(() => createBlogPostStore()).toThrow(/Invalid DATA_BACKEND "mysql"/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('reuses getBlogPostStore singleton until reset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'blog-store-'));
    tempDirs.push(dir);
    const databaseUrl = `file:${join(dir, 'singleton.sqlite')}`;

    const first = getBlogPostStore({ sysEnv: 'local', databaseUrl });
    const second = getBlogPostStore({ sysEnv: 'local', databaseUrl });
    expect(second).toBe(first);

    await resetBlogPostStore();
    const third = getBlogPostStore({ sysEnv: 'local', databaseUrl });
    expect(third).not.toBe(first);
    await third.close?.();
  });
});
