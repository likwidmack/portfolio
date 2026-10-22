export type DynamoClientConfig = {
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
};

/**
 * Build DynamoDBClient options for Lambda/test/Local.
 * Endpoint only for DynamoDB Local: the `endpointOverride` argument, else (first set wins)
 * `DYNAMODB_ENDPOINT`, `AWS_ENDPOINT_URL_DYNAMODB` (the media adapters' variable), `AWS_ENDPOINT_URL`.
 */
export const resolveDynamoClientConfig = (
  env: NodeJS.ProcessEnv = process.env,
  endpointOverride?: string
): DynamoClientConfig => {
  const region = env.NUXT_AWS_REGION || env.AWS_REGION || 'us-west-2';
  const endpoint =
    endpointOverride || env.DYNAMODB_ENDPOINT || env.AWS_ENDPOINT_URL_DYNAMODB || env.AWS_ENDPOINT_URL || undefined;
  const config: DynamoClientConfig = { region };

  if (endpoint) {
    config.endpoint = endpoint;
    const accessKeyId = env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    if (accessKeyId && secretAccessKey) {
      config.credentials = {
        accessKeyId,
        secretAccessKey,
        ...(env.AWS_SESSION_TOKEN ? { sessionToken: env.AWS_SESSION_TOKEN } : {}),
      };
    }
  }

  return config;
};
