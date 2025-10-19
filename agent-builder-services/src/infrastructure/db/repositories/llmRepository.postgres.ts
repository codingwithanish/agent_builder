import { PostgresClient } from '../postgresClient';
import { LlmRepository } from '@/domain/interfaces/LlmRepository';
import { LlmConfig, CreateLlmInput } from '@/domain/entities/LlmConfig';
import { logger } from '@/infrastructure/logger';

export class PostgresLlmRepository implements LlmRepository {
  constructor(private db: PostgresClient) {}

  async create(input: CreateLlmInput): Promise<LlmConfig> {
    const id = `llm-${Date.now()}`;
    const now = new Date().toISOString();
    const apiKeyMasked = `***${input.apiKey.slice(-4)}`;

    try {
      await this.db.query(
        `INSERT INTO llm_configs (id, name, model, api_key_masked, api_key_encrypted, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, input.name, input.model, apiKeyMasked, input.apiKey, now]
      );

      const llmConfig: LlmConfig = {
        id,
        name: input.name,
        model: input.model,
        apiKeyMasked,
        createdAt: now
      };

      logger.info('LLM config created', { llmId: id, name: input.name, model: input.model });
      return llmConfig;
    } catch (error) {
      logger.error('Error creating LLM config', { input: { ...input, apiKey: '[REDACTED]' }, error });
      throw error;
    }
  }

  async findById(id: string): Promise<LlmConfig | null> {
    try {
      const result = await this.db.query(
        'SELECT id, name, model, api_key_masked, created_at FROM llm_configs WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        model: row.model,
        apiKeyMasked: row.api_key_masked,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Error finding LLM config by id', { id, error });
      throw error;
    }
  }

  async findByName(name: string): Promise<LlmConfig | null> {
    try {
      const result = await this.db.query(
        'SELECT id, name, model, api_key_masked, created_at FROM llm_configs WHERE name = $1',
        [name]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        model: row.model,
        apiKeyMasked: row.api_key_masked,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Error finding LLM config by name', { name, error });
      throw error;
    }
  }

  async findAll(): Promise<LlmConfig[]> {
    try {
      const result = await this.db.query(
        'SELECT id, name, model, api_key_masked, created_at FROM llm_configs ORDER BY created_at DESC'
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        model: row.model,
        apiKeyMasked: row.api_key_masked,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error finding all LLM configs', { error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.query('DELETE FROM llm_configs WHERE id = $1', [id]);
      logger.info('LLM config deleted', { llmId: id });
    } catch (error) {
      logger.error('Error deleting LLM config', { id, error });
      throw error;
    }
  }
}