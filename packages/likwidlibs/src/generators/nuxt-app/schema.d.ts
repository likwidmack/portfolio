export interface NuxtAppGeneratorSchema {
  name: string;
  directory?: string;
  deploymentTarget?: 'aws-sam' | 'docker-node' | 'static-cloudflare';
  includeE2e?: boolean;
}
