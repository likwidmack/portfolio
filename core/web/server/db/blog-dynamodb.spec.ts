// @vitest-environment node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDynamoBlogPostStore } from './blog-dynamodb';
import { BlogPostSlugConflictError } from './blog-types';

const { createDocumentClient } = vi.hoisted(() => ({
  createDocumentClient: vi.fn(() => ({ send: vi.fn() })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

vi.mock('@aws-sdk/lib-dynamodb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/lib-dynamodb')>();
  return {
    ...actual,
    DynamoDBDocumentClient: {
      ...actual.DynamoDBDocumentClient,
      from: createDocumentClient,
    },
  };
});

const dynamoEnvKeys = [
  'DYNAMODB_ENDPOINT',
  'AWS_ENDPOINT_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_REGION',
  'NUXT_AWS_REGION',
  'DYNAMO_POSTS_TABLE',
  'NUXT_DYNAMO_POSTS_TABLE',
];
const originalDynamoEnv = Object.fromEntries(dynamoEnvKeys.map((key) => [key, process.env[key]]));

describe('createDynamoBlogPostStore', () => {
  afterEach(() => {
    vi.clearAllMocks();
    for (const key of dynamoEnvKeys) {
      const value = originalDynamoEnv[key];
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = value;
      }
    }
  });

  it('throws without posts table name', () => {
    Reflect.deleteProperty(process.env, 'DYNAMO_POSTS_TABLE');
    Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_POSTS_TABLE');
    expect(() => createDynamoBlogPostStore({ tableName: '' })).toThrow(/DYNAMO_POSTS_TABLE/);
  });

  it('constructs its DynamoDB client with the configured local endpoint', () => {
    process.env.DYNAMODB_ENDPOINT = 'http://dynamodb:8000';
    process.env.AWS_ACCESS_KEY_ID = 'local-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'local-secret-key';
    process.env.AWS_REGION = 'us-west-2';

    createDynamoBlogPostStore({ tableName: 'Posts' });

    expect(DynamoDBClient).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://dynamodb:8000',
        credentials: {
          accessKeyId: 'local-access-key',
          secretAccessKey: 'local-secret-key',
          sessionToken: undefined,
        },
      })
    );
  });

  it('puts, lists, updates, and deletes posts via document client', async () => {
    const items: Record<string, unknown>[] = [];

    const send = vi.fn(async (command: object) => {
      if (command instanceof PutCommand) {
        const item = command.input.Item as Record<string, unknown>;
        const idx = items.findIndex((row) => row.id === item.id);
        if (idx >= 0) {
          items[idx] = item;
        } else {
          items.push(item);
        }
        return {};
      }
      if (command instanceof GetCommand) {
        const id = (command.input.Key as { id: string }).id;
        return { Item: items.find((row) => row.id === id) };
      }
      if (command instanceof DeleteCommand) {
        const id = (command.input.Key as { id: string }).id;
        const before = items.length;
        const next = items.filter((row) => row.id !== id);
        items.length = 0;
        items.push(...next);
        return before === items.length ? {} : { Attributes: {} };
      }
      if (command instanceof QueryCommand) {
        const values = command.input.ExpressionAttributeValues as Record<string, string>;
        if (values[':slug']) {
          return { Items: items.filter((row) => row.slug === values[':slug']) };
        }
        if (values[':published']) {
          return { Items: items.filter((row) => row.status === 'published') };
        }
        return { Items: [] };
      }
      if (command instanceof ScanCommand) {
        return { Items: [...items] };
      }
      return {};
    });

    const docClient = { send } as unknown as DynamoDBDocumentClient;
    const store = createDynamoBlogPostStore({
      tableName: 'Posts',
      region: 'us-west-2',
      docClient,
    });

    const created = await store.create({
      slug: 'launch-notes',
      title: 'Launch',
      body: 'Notes',
      status: 'published',
    });
    expect(created.id).toBeTruthy();

    const listed = await store.listAll();
    expect(listed).toHaveLength(1);

    const updated = await store.update(created.id, { title: 'Launch 2' });
    expect(updated?.title).toBe('Launch 2');

    await expect(store.create({ slug: 'launch-notes', title: 'Dup', body: 'x' })).rejects.toBeInstanceOf(
      BlogPostSlugConflictError
    );

    expect(await store.delete(created.id)).toBe(true);
    expect(send).toHaveBeenCalled();
  });
});
