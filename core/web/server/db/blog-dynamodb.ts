/**
 * DynamoDB BlogPostStore adapter for SYS_ENV=test|production.
 *
 * Table: `id` PK, GSI `slug-index` (slug), GSI `status-publishedAt-index` (status + publishedAt).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  type DynamoDBDocumentClient as DocClient,
} from '@aws-sdk/lib-dynamodb';
import { createSecureId } from '../utils/secure-id';
import { resolveCreateFields, resolveUpdateFields } from './blog-helpers';
import type { BlogPost, BlogPostStore, CreateBlogPostInput, UpdateBlogPostInput } from './blog-types';
import { BlogPostSlugConflictError } from './blog-types';
import { resolveDynamoClientConfig } from './dynamo-client-config';
import { nonEmpty } from './env-value';

export interface DynamoBlogStoreOptions {
  tableName?: string;
  region?: string;
  /** Optional injected document client for tests. */
  docClient?: DocClient;
}

const SLUG_INDEX = 'slug-index';
const STATUS_PUBLISHED_INDEX = 'status-publishedAt-index';

/** Dynamo GSI keys cannot be null — omit unpublished `publishedAt`. */
const toDynamoItem = (post: BlogPost): Record<string, unknown> => {
  const item: Record<string, unknown> = { ...post };
  if (item.publishedAt == null) {
    delete item.publishedAt;
  }
  return item;
};

/** Normalize Dynamo items that omit `publishedAt`. */
const fromDynamoItem = (item: Record<string, unknown> | undefined): BlogPost | null => {
  if (!item) {
    return null;
  }
  return {
    ...(item as unknown as BlogPost),
    publishedAt: (item.publishedAt as string | null | undefined) ?? null,
  };
};

type DynamoBlogStoreContext = {
  tableName: string;
  docClient: DocClient;
};

const findBySlug = async ({ tableName, docClient }: DynamoBlogStoreContext, slug: string): Promise<BlogPost | null> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: SLUG_INDEX,
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
      Limit: 1,
    })
  );
  const item = result.Items?.[0] as Record<string, unknown> | undefined;
  return fromDynamoItem(item);
};

const listPublished = async ({ tableName, docClient }: DynamoBlogStoreContext): Promise<BlogPost[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: STATUS_PUBLISHED_INDEX,
      KeyConditionExpression: '#status = :published',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':published': 'published' },
      ScanIndexForward: false,
    })
  );
  return (result.Items ?? [])
    .map((item) => fromDynamoItem(item as Record<string, unknown>))
    .filter((post): post is BlogPost => post !== null);
};

const listAll = async ({ tableName, docClient }: DynamoBlogStoreContext): Promise<BlogPost[]> => {
  const result = await docClient.send(new ScanCommand({ TableName: tableName }));
  const items = (result.Items ?? [])
    .map((item) => fromDynamoItem(item as Record<string, unknown>))
    .filter((post): post is BlogPost => post !== null);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const getById = async ({ tableName, docClient }: DynamoBlogStoreContext, id: string): Promise<BlogPost | null> => {
  const result = await docClient.send(new GetCommand({ TableName: tableName, Key: { id } }));
  return fromDynamoItem(result.Item as Record<string, unknown> | undefined);
};

const createPost = async (
  { tableName, docClient }: DynamoBlogStoreContext,
  input: CreateBlogPostInput
): Promise<BlogPost> => {
  const fields = resolveCreateFields(input);
  const existing = await findBySlug({ tableName, docClient }, fields.slug);
  if (existing) {
    throw new BlogPostSlugConflictError(fields.slug);
  }

  const post: BlogPost = { id: createSecureId(), ...fields };
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toDynamoItem(post),
      ConditionExpression: 'attribute_not_exists(id)',
    })
  );
  return post;
};

const updatePost = async (
  { tableName, docClient }: DynamoBlogStoreContext,
  id: string,
  input: UpdateBlogPostInput
): Promise<BlogPost | null> => {
  const existing = await getById({ tableName, docClient }, id);
  if (!existing) {
    return null;
  }

  const fields = resolveUpdateFields(existing, input);
  if (fields.slug !== existing.slug) {
    const conflict = await findBySlug({ tableName, docClient }, fields.slug);
    if (conflict && conflict.id !== id) {
      throw new BlogPostSlugConflictError(fields.slug);
    }
  }

  const post: BlogPost = { id, createdAt: existing.createdAt, ...fields };
  await docClient.send(new PutCommand({ TableName: tableName, Item: toDynamoItem(post) }));
  return post;
};

const deletePost = async ({ tableName, docClient }: DynamoBlogStoreContext, id: string): Promise<boolean> => {
  const existing = await docClient.send(new GetCommand({ TableName: tableName, Key: { id } }));
  if (!existing.Item) {
    return false;
  }
  await docClient.send(new DeleteCommand({ TableName: tableName, Key: { id } }));
  return true;
};

/**
 * Create a DynamoDB-backed BlogPostStore.
 */
export const createDynamoBlogPostStore = (options: DynamoBlogStoreOptions = {}): BlogPostStore => {
  const tableName =
    nonEmpty(options.tableName) ??
    nonEmpty(process.env.NUXT_DYNAMO_POSTS_TABLE) ??
    nonEmpty(process.env.DYNAMO_POSTS_TABLE) ??
    '';

  if (!tableName) {
    throw new Error('DynamoDB BlogPostStore requires DYNAMO_POSTS_TABLE (or NUXT_DYNAMO_POSTS_TABLE)');
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

  const context: DynamoBlogStoreContext = { tableName, docClient };

  return {
    listPublished: () => listPublished(context),
    listAll: () => listAll(context),
    getBySlug: (slug) => findBySlug(context, slug),
    getById: (id) => getById(context, id),
    create: (input) => createPost(context, input),
    update: (id, input) => updatePost(context, id, input),
    delete: (id) => deletePost(context, id),
  };
};
