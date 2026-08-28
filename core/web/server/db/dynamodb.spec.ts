// @vitest-environment node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDynamoMessageStore } from './dynamodb';

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
  'DYNAMO_TABLE',
  'NUXT_DYNAMO_TABLE',
];
const originalDynamoEnv = Object.fromEntries(dynamoEnvKeys.map((key) => [key, process.env[key]]));

describe('createDynamoMessageStore', () => {
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

  it('throws without table name', () => {
    Reflect.deleteProperty(process.env, 'DYNAMO_TABLE');
    Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_TABLE');
    expect(() => createDynamoMessageStore({ tableName: '' })).toThrow(/DYNAMO_TABLE/);
  });

  it('falls through empty region to resolveDynamoClientConfig default', () => {
    Reflect.deleteProperty(process.env, 'AWS_REGION');
    Reflect.deleteProperty(process.env, 'NUXT_AWS_REGION');

    createDynamoMessageStore({ tableName: 'Messages', region: '' });

    expect(DynamoDBClient).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-west-2',
      })
    );
  });

  it('constructs its DynamoDB client with the configured local endpoint', () => {
    process.env.DYNAMODB_ENDPOINT = 'http://dynamodb:8000';
    process.env.AWS_ACCESS_KEY_ID = 'local-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'local-secret-key';
    process.env.AWS_SESSION_TOKEN = 'local-session-token';
    process.env.AWS_REGION = 'us-west-2';

    createDynamoMessageStore({ tableName: 'Messages' });

    expect(DynamoDBClient).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://dynamodb:8000',
        credentials: {
          accessKeyId: 'local-access-key',
          secretAccessKey: 'local-secret-key',
          sessionToken: 'local-session-token',
        },
      })
    );
  });

  it('puts and scans messages via document client', async () => {
    const items: Record<string, unknown>[] = [];

    const send = vi.fn(async (command: { input: Record<string, unknown> }) => {
      if ('Item' in command.input && command.input.Item) {
        items.push(command.input.Item as Record<string, unknown>);
        return {};
      }
      return { Items: [...items] };
    });

    const docClient = { send } as unknown as DynamoDBDocumentClient;
    const store = createDynamoMessageStore({
      tableName: 'Messages',
      region: 'us-west-2',
      docClient,
    });

    const created = await store.create({
      name: 'Prod',
      email: 'prod@example.com',
      body: 'Dynamo path',
    });
    expect(created.id).toBeTruthy();

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: 'Prod',
      email: 'prod@example.com',
      body: 'Dynamo path',
    });

    expect(send).toHaveBeenCalled();
  });

  it('sorts listed messages by createdAt descending', async () => {
    const send = vi.fn(async () => ({
      Items: [
        {
          id: '1',
          name: 'Older',
          email: 'a@example.com',
          body: 'a',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'Newer',
          email: 'b@example.com',
          body: 'b',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    }));

    const docClient = { send } as unknown as DynamoDBDocumentClient;
    const store = createDynamoMessageStore({
      tableName: 'Messages',
      docClient,
    });

    const listed = await store.list();
    expect(listed.map((m) => m.name)).toEqual(['Newer', 'Older']);
  });
});
