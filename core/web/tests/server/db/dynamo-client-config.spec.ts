// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDynamoClientConfig } from '../../../server/db/dynamo-client-config';

describe('resolveDynamoClientConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('prefers NUXT_AWS_REGION over AWS_REGION', () => {
    delete process.env.AWS_ENDPOINT_URL;
    delete process.env.DYNAMODB_ENDPOINT;
    process.env.AWS_REGION = 'us-east-1';
    process.env.NUXT_AWS_REGION = 'us-west-2';
    expect(resolveDynamoClientConfig().region).toBe('us-west-2');
  });

  it('uses region only when no endpoint env is set', () => {
    delete process.env.AWS_ENDPOINT_URL;
    delete process.env.DYNAMODB_ENDPOINT;
    process.env.AWS_REGION = 'us-west-2';
    expect(resolveDynamoClientConfig()).toEqual({ region: 'us-west-2' });
  });

  it('prefers DYNAMODB_ENDPOINT over AWS_ENDPOINT_URL', () => {
    process.env.AWS_ENDPOINT_URL = 'http://aws:8000';
    process.env.DYNAMODB_ENDPOINT = 'http://dynamodb:8000';
    process.env.AWS_REGION = 'us-west-2';
    const cfg = resolveDynamoClientConfig();
    expect(cfg.endpoint).toBe('http://dynamodb:8000');
    expect(cfg.region).toBe('us-west-2');
  });

  it('honours AWS_ENDPOINT_URL_DYNAMODB, the endpoint the media adapters use', () => {
    delete process.env.AWS_ENDPOINT_URL;
    delete process.env.DYNAMODB_ENDPOINT;
    process.env.AWS_ENDPOINT_URL_DYNAMODB = 'http://dynamodb:8000';
    process.env.AWS_REGION = 'us-west-2';
    expect(resolveDynamoClientConfig().endpoint).toBe('http://dynamodb:8000');
  });

  it('ranks DYNAMODB_ENDPOINT, then AWS_ENDPOINT_URL_DYNAMODB, then the global AWS_ENDPOINT_URL', () => {
    process.env.AWS_ENDPOINT_URL = 'http://global:8000';
    process.env.AWS_ENDPOINT_URL_DYNAMODB = 'http://service:8000';
    delete process.env.DYNAMODB_ENDPOINT;
    expect(resolveDynamoClientConfig().endpoint).toBe('http://service:8000');
    process.env.DYNAMODB_ENDPOINT = 'http://explicit:8000';
    expect(resolveDynamoClientConfig().endpoint).toBe('http://explicit:8000');
  });

  it('lets an explicit endpoint argument win over every env var', () => {
    process.env.DYNAMODB_ENDPOINT = 'http://env:8000';
    process.env.AWS_ACCESS_KEY_ID = 'local';
    process.env.AWS_SECRET_ACCESS_KEY = 'local';
    const cfg = resolveDynamoClientConfig(process.env, 'http://explicit:8000');
    expect(cfg.endpoint).toBe('http://explicit:8000');
    expect(cfg.credentials).toEqual({ accessKeyId: 'local', secretAccessKey: 'local' });
  });

  it('adds credentials when endpoint is set and keys exist', () => {
    process.env.AWS_ENDPOINT_URL = 'http://dynamodb:8000';
    process.env.AWS_ACCESS_KEY_ID = 'local';
    process.env.AWS_SECRET_ACCESS_KEY = 'local';
    process.env.NUXT_AWS_REGION = 'us-west-2';
    const cfg = resolveDynamoClientConfig();
    expect(cfg.credentials).toEqual({ accessKeyId: 'local', secretAccessKey: 'local' });
  });
});
