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
 * Endpoint only when AWS_ENDPOINT_URL or DYNAMODB_ENDPOINT is set (Local).
 */
export const resolveDynamoClientConfig = (env: NodeJS.ProcessEnv = process.env): DynamoClientConfig => {
  const region = env.NUXT_AWS_REGION || env.AWS_REGION || 'us-west-2';
  const endpoint = env.DYNAMODB_ENDPOINT || env.AWS_ENDPOINT_URL || undefined;
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
