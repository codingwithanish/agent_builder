import { config as dotenvConfig } from 'dotenv';
import { envSchema, type EnvConfig } from './envSchema';

dotenvConfig();

let cachedConfig: EnvConfig | null = null;

export function loadConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    cachedConfig = envSchema.parse(process.env);
    return cachedConfig;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = loadConfig();