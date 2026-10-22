// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dynamoTestEndpoint, messagesTableInput, postsTableInput, uniqueTableName } from './helpers/dynamo-local';

describe('DynamoDB contract-test setup', () => {
  it('skips (no endpoint) when DYNAMODB_TEST_ENDPOINT is unset, empty or blank', () => {
    expect(dynamoTestEndpoint({})).toBeUndefined();
    expect(dynamoTestEndpoint({ DYNAMODB_TEST_ENDPOINT: '' })).toBeUndefined();
    expect(dynamoTestEndpoint({ DYNAMODB_TEST_ENDPOINT: '   ' })).toBeUndefined();
  });

  it('runs against the trimmed endpoint when it is set', () => {
    expect(dynamoTestEndpoint({ DYNAMODB_TEST_ENDPOINT: ' http://localhost:8000 ' })).toBe('http://localhost:8000');
  });

  it('names tables uniquely per call', () => {
    const [a, b] = [uniqueTableName('messages'), uniqueTableName('messages')];
    expect(a).toMatch(/^contract-messages-[0-9a-f]{8}$/);
    expect(a).not.toBe(b);
  });

  it('declares the same keys as docker/dynamodb-init.sh', () => {
    expect(messagesTableInput('m').KeySchema).toEqual([{ AttributeName: 'id', KeyType: 'HASH' }]);
    expect(postsTableInput('p').GlobalSecondaryIndexes?.map((gsi) => gsi.IndexName)).toEqual([
      'slug-index',
      'status-publishedAt-index',
    ]);
  });
});
