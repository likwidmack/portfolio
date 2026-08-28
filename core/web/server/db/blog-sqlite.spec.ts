// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSqliteBlogPostStore } from './blog-sqlite';
import { createBlogPostStore, resetBlogPostStore } from './blog-store';

describe('createSqliteBlogPostStore', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await resetBlogPostStore();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates, lists published only, updates status, and deletes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'blog-store-'));
    tempDirs.push(dir);
    const store = createSqliteBlogPostStore({
      databaseUrl: `file:${join(dir, 'posts.sqlite')}`,
    });

    const draft = await store.create({
      title: 'Draft',
      slug: 'draft-post',
      body: 'Secret',
      status: 'draft',
    });
    const published = await store.create({
      title: 'Public',
      slug: 'public-post',
      body: 'Hello',
      excerpt: 'Hi',
      status: 'published',
    });

    expect(await store.listPublished()).toEqual([expect.objectContaining({ id: published.id, slug: 'public-post' })]);
    expect(await store.getBySlug('draft-post')).toMatchObject({ status: 'draft' });
    expect(await store.listAll()).toHaveLength(2);

    const updated = await store.update(draft.id, { status: 'published' });
    expect(updated?.status).toBe('published');
    expect(updated?.publishedAt).toBeTruthy();
    expect(await store.listPublished()).toHaveLength(2);

    await expect(store.create({ title: 'Dup', slug: 'public-post', body: 'x' })).rejects.toThrow(/slug/);

    expect(await store.delete(published.id)).toBe(true);
    expect(await store.getById(published.id)).toBeNull();

    store.close?.();
  });

  it('factory selects sqlite for local', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'blog-factory-'));
    tempDirs.push(dir);
    const store = createBlogPostStore({
      sysEnv: 'local',
      databaseUrl: `file:${join(dir, 'posts.sqlite')}`,
    });
    await store.create({ title: 'A', slug: 'a', body: 'b' });
    expect(await store.listAll()).toHaveLength(1);
    await store.close?.();
  });

  it('factory requires DYNAMO_POSTS_TABLE for test/production', () => {
    expect(() => createBlogPostStore({ sysEnv: 'test', dynamoPostsTable: '' })).toThrow(/DYNAMO_POSTS_TABLE/);
  });
});
