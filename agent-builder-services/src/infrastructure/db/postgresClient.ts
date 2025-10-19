import { Pool, PoolConfig } from 'pg';
import { config } from '@/config/config';
import { logger } from '@/infrastructure/logger';

export class PostgresClient {
  private pool: Pool;

  constructor() {
    const poolConfig: PoolConfig = {
      connectionString: config.DB_URL,
      min: config.DB_POOL_MIN,
      max: config.DB_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', () => {
      logger.debug('New client connected to PostgreSQL');
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query error', { text, duration, error });
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    await this.pool.end();
    logger.info('PostgreSQL pool closed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.warn('PostgreSQL health check failed, will continue without database', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }
}

export const postgresClient = new PostgresClient();