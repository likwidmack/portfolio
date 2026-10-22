/**
 * Shared setup for the DynamoDB adapter contract tests.
 *
 * The contract suites run against DynamoDB Local only when `DYNAMODB_TEST_ENDPOINT` is set (CI's
 * `services: dynamodb`, or `docker:dev` / `docker:local` on `http://localhost:8010`) and skip otherwise. Each suite
 * creates and deletes its own uniquely named tables, so it never touches Docker stack data.
 */
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
  type CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';
import { randomBytes } from 'node:crypto';

const REGION = 'us-west-2';
const LOCAL_CREDENTIALS = { accessKeyId: 'local', secretAccessKey: 'local' } as const;

/** The DynamoDB Local endpoint to test against, or `undefined` (suite skips) when unset or blank. */
export const dynamoTestEndpoint = (env: Record<string, string | undefined> = process.env): string | undefined => {
  const endpoint = env.DYNAMODB_TEST_ENDPOINT?.trim();
  return endpoint ? endpoint : undefined;
};

/** `contract-<label>-<8 hex>`: unique per run so parallel jobs and reruns never collide. */
export const uniqueTableName = (label: string): string => `contract-${label}-${randomBytes(4).toString('hex')}`;

export const createLocalDynamoClient = (endpoint: string): DynamoDBClient =>
  new DynamoDBClient({ region: REGION, endpoint, credentials: LOCAL_CREDENTIALS });

export const createTable = async (client: DynamoDBClient, input: CreateTableCommandInput): Promise<void> => {
  await client.send(new CreateTableCommand(input));
  await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName: input.TableName });
};

export const deleteTable = async (client: DynamoDBClient, tableName: string): Promise<void> => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
};

/** `Messages`: `id` partition key (mirrors docker/dynamodb-init.sh and infra/sam). */
export const messagesTableInput = (tableName: string): CreateTableCommandInput => ({
  TableName: tableName,
  AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  BillingMode: 'PAY_PER_REQUEST',
});

/** `Posts`: `id` plus the `slug-index` and `status-publishedAt-index` GSIs. */
export const postsTableInput = (tableName: string): CreateTableCommandInput => ({
  TableName: tableName,
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'slug', AttributeType: 'S' },
    { AttributeName: 'status', AttributeType: 'S' },
    { AttributeName: 'publishedAt', AttributeType: 'S' },
  ],
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'slug-index',
      KeySchema: [{ AttributeName: 'slug', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
    },
    {
      IndexName: 'status-publishedAt-index',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'publishedAt', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    },
  ],
  BillingMode: 'PAY_PER_REQUEST',
});
