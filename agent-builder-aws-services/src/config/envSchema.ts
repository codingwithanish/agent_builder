import { z } from 'zod';

export const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('5002').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AWS Configuration
  DEFAULT_AWS_REGION: z.string().default('us-east-1'),
  S3_ARTIFACT_BUCKET: z.string().default('agent-builder-artifacts'),
  ALLOW_HEADER_CREDS: z.string().default('true').transform(val => val === 'true'),
  ARTIFACT_MAX_MB: z.string().default('100').transform(Number),
  DEPLOY_TARGET: z.enum(['ecs', 'lambda']).default('ecs'),

  // AWS Credentials (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),

  // WebSocket Configuration
  WS_ENABLED: z.string().default('true').transform(val => val === 'true'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SERVICE_NAME: z.string().default('agent-builder-aws-services'),

  // Security
  CORS_ORIGIN: z.string().default('http://localhost:4000'),

  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW: z.string().default('60000').transform(Number),

  // Bedrock Configuration
  BEDROCK_AGENT_ROLE_ARN: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().default('anthropic.claude-3-sonnet-20240229-v1:0'),

  // ECS Configuration
  ECS_CLUSTER_NAME: z.string().default('agent-builder-cluster'),
  ECS_TASK_EXECUTION_ROLE_ARN: z.string().optional(),
  ECS_TASK_ROLE_ARN: z.string().optional(),

  // Lambda Configuration
  LAMBDA_EXECUTION_ROLE_ARN: z.string().optional(),
  LAMBDA_RUNTIME: z.string().default('nodejs18.x'),
});

export type EnvConfig = z.infer<typeof envSchema>;