/**
 * DynamoDB MessageStore adapter for SYS_ENV=test|production.
 *
 * Simple `Messages` table with `id` as the partition key (SAM-defined in a later phase).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  type DynamoDBDocumentClient as DocClient,
} from '@aws-sdk/lib-dynamodb';
import { createSecureId } from '../utils/secure-id';
import { resolveDynamoClientConfig } from './dynamo-client-config';
import { nonEmpty } from './env-value';
import type { ContactMessage, CreateContactMessageInput, MessageStore } from './types';

export interface DynamoMessageStoreOptions {
  tableName?: string;
  region?: string;
  /** Optional injected document client for tests. */
  docClient?: DocClient;
}

type DynamoMessageStoreContext = {
  tableName: string;
  docClient: DocClient;
};

const listMessages = async ({ tableName, docClient }: DynamoMessageStoreContext): Promise<ContactMessage[]> => {
  const result = await docClient.send(new ScanCommand({ TableName: tableName }));
  const items = (result.Items ?? []) as ContactMessage[];
  return items.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

const createMessage = async (
  { tableName, docClient }: DynamoMessageStoreContext,
  input: CreateContactMessageInput
): Promise<ContactMessage> => {
  const message: ContactMessage = {
    id: createSecureId(),
    name: input.name,
    email: input.email,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: tableName, Item: message }));
  return message;
};

/**
 * Create a DynamoDB-backed MessageStore.
 */
export const createDynamoMessageStore = (options: DynamoMessageStoreOptions = {}): MessageStore => {
  const tableName =
    nonEmpty(options.tableName) ?? nonEmpty(process.env.NUXT_DYNAMO_TABLE) ?? nonEmpty(process.env.DYNAMO_TABLE) ?? '';

  if (!tableName) {
    throw new Error('DynamoDB MessageStore requires DYNAMO_TABLE (or NUXT_DYNAMO_TABLE)');
  }

  const clientConfig = resolveDynamoClientConfig();
  const docClient =
    options.docClient ??
    DynamoDBDocumentClient.from(
      new DynamoDBClient({
        ...clientConfig,
        region: nonEmpty(options.region) ?? clientConfig.region,
      }),
      {
        marshallOptions: { removeUndefinedValues: true },
      }
    );
  const context: DynamoMessageStoreContext = { tableName, docClient };

  return {
    list: () => listMessages(context),
    create: (input) => createMessage(context, input),
  };
};
