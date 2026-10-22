// @vitest-environment node
/**
 * Contract tests: the message and post DynamoDB adapters against a real DynamoDB Local.
 * Skipped unless `DYNAMODB_TEST_ENDPOINT` is set (see ./helpers/dynamo-local.ts).
 */
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDynamoBlogPostStore } from '../../../server/db/blog-dynamodb';
import { BlogPostSlugConflictError } from '../../../server/db/blog-types';
import { createDynamoMessageStore } from '../../../server/db/dynamodb';
import {
  createLocalDynamoClient,
  createTable,
  deleteTable,
  dynamoTestEndpoint,
  messagesTableInput,
  postsTableInput,
  uniqueTableName,
} from './helpers/dynamo-local';

const endpoint = dynamoTestEndpoint();

describe.skipIf(!endpoint)('DynamoDB Local contract', () => {
  const messagesTable = uniqueTableName('messages');
  const postsTable = uniqueTableName('posts');
  let client: DynamoDBClient;

  beforeAll(async () => {
    // The adapters pass these through with an explicit endpoint; DynamoDB Local accepts any pair.
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'local');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'local');
    vi.stubEnv('AWS_REGION', 'us-west-2');
    client = createLocalDynamoClient(endpoint as string);
    await createTable(client, messagesTableInput(messagesTable));
    await createTable(client, postsTableInput(postsTable));
  });

  afterAll(async () => {
    await Promise.allSettled([deleteTable(client, messagesTable), deleteTable(client, postsTable)]);
    client.destroy();
    vi.unstubAllEnvs();
  });

  describe('MessageStore', () => {
    it('creates, lists newest first, and deletes messages', async () => {
      const store = createDynamoMessageStore({ tableName: messagesTable, endpoint });

      const first = await store.create({ name: 'Ada', email: 'ada@example.com', body: 'first' });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await store.create({ name: 'Grace', email: 'grace@example.com', body: 'second' });
      expect(first.id).not.toBe(second.id);

      const listed = await store.list();
      expect(listed.map((message) => message.id)).toEqual([second.id, first.id]);
      expect(listed[1]).toMatchObject({ name: 'Ada', email: 'ada@example.com', body: 'first' });

      await expect(store.delete(first.id)).resolves.toBe(true);
      await expect(store.delete(first.id)).resolves.toBe(false);
      expect((await store.list()).map((message) => message.id)).toEqual([second.id]);
    });
  });

  describe('BlogPostStore', () => {
    it('round-trips posts through the slug and status/publishedAt indexes', async () => {
      const store = createDynamoBlogPostStore({ tableName: postsTable, endpoint });

      const published = await store.create({
        title: 'Hello',
        slug: 'hello',
        excerpt: 'ex',
        body: '# Hi',
        status: 'published',
      });
      const draft = await store.create({ title: 'Draft', slug: 'draft', body: 'wip' });

      expect((await store.listPublished()).map((post) => post.slug)).toEqual(['hello']);
      expect((await store.listAll()).map((post) => post.slug).sort()).toEqual(['draft', 'hello']);
      await expect(store.getBySlug('hello')).resolves.toMatchObject({ id: published.id, title: 'Hello' });
      await expect(store.getById(draft.id)).resolves.toMatchObject({ slug: 'draft', publishedAt: null });
      await expect(store.getBySlug('missing')).resolves.toBeNull();

      const updated = await store.update(draft.id, { status: 'published', title: 'Draft, now live' });
      expect(updated).toMatchObject({ id: draft.id, title: 'Draft, now live', status: 'published' });
      expect((await store.listPublished()).map((post) => post.slug).sort()).toEqual(['draft', 'hello']);
      await expect(store.update('no-such-id', { title: 'x' })).resolves.toBeNull();

      await expect(store.delete(published.id)).resolves.toBe(true);
      await expect(store.delete(published.id)).resolves.toBe(false);
      await expect(store.getById(published.id)).resolves.toBeNull();
    });

    it('rejects a duplicate slug on create and on update', async () => {
      const store = createDynamoBlogPostStore({ tableName: postsTable, endpoint });

      const one = await store.create({ title: 'One', slug: 'conflict-one', body: 'a' });
      const two = await store.create({ title: 'Two', slug: 'conflict-two', body: 'b' });

      await expect(store.create({ title: 'Dup', slug: 'conflict-one', body: 'c' })).rejects.toBeInstanceOf(
        BlogPostSlugConflictError
      );
      await expect(store.update(two.id, { slug: 'conflict-one' })).rejects.toBeInstanceOf(BlogPostSlugConflictError);

      await store.delete(one.id);
      await expect(store.update(two.id, { slug: 'conflict-one' })).resolves.toMatchObject({ slug: 'conflict-one' });
    });
  });
});
