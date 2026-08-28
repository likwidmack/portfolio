// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createBlogPostStore, getBlogPostStore, resetBlogPostStore } from './blog-store';

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

  it('selects postgres for development (requires DATABASE_URL)', () => {
    const previous = process.env.DATABASE_URL;
    const previousNuxt = process.env.NUXT_DATABASE_URL;
    Reflect.deleteProperty(process.env, 'DATABASE_URL');
    Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');

    try {
      expect(() => createBlogPostStore({ sysEnv: 'development', databaseUrl: '' })).toThrow(/DATABASE_URL/);
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

  it('selects dynamodb for test and production (requires DYNAMO_POSTS_TABLE)', () => {
    const previous = process.env.DYNAMO_POSTS_TABLE;
    const previousNuxt = process.env.NUXT_DYNAMO_POSTS_TABLE;
    Reflect.deleteProperty(process.env, 'DYNAMO_POSTS_TABLE');
    Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_POSTS_TABLE');

    try {
      expect(() => createBlogPostStore({ sysEnv: 'test', dynamoPostsTable: '' })).toThrow(/DYNAMO_POSTS_TABLE/);
      expect(() => createBlogPostStore({ sysEnv: 'production', dynamoPostsTable: '' })).toThrow(/DYNAMO_POSTS_TABLE/);
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
