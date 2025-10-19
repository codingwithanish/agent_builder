import { z } from 'zod';

export const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('4000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database Configuration
  DB_TYPE: z.enum(['postgres']).default('postgres'),
  DB_URL: z.string(),
  DB_POOL_MIN: z.string().default('2').transform(Number),
  DB_POOL_MAX: z.string().default('10').transform(Number),

  // External Services
  LLM_SERVICE_URL: z.string().default('http://localhost:5001'),
  AWS_SERVICE_URL: z.string().default('http://localhost:5002'),

  // WebSocket Configuration
  ENABLE_WEBSOCKETS: z.string().default('true').transform(val => val === 'true'),

  // Security
  JWT_SECRET: z.string(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // File Upload
  UPLOAD_PATH: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('52428800').transform(Number),

  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW: z.string().default('60000').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SERVICE_NAME: z.string().default('agent-builder-services'),

  // AWS Configuration (optional)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // OpenAI Configuration (optional)
  OPENAI_BASE_URL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;