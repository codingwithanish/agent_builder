import { LlmClient } from '@/domain/interfaces/LlmClient';
import { TestLlmInput, TestLlmResult } from '@/domain/entities/LlmConfig';
import { config } from '@/config/config';
import { logger } from '@/infrastructure/logger';

export class LlmServiceAdapter implements LlmClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.LLM_SERVICE_URL;
  }

  async testConnection(input: TestLlmInput): Promise<TestLlmResult> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        logger.warn('LLM test connection failed', { 
          status: response.status, 
          statusText: response.statusText,
          model: input.model 
        });
        
        return {
          ok: false,
          message: 'Unable to connect to LLM. Check model and API key.',
          error_code: 'CONNECTION_FAILED'
        };
      }

      const result = await response.json() as TestLlmResult;
      logger.info('LLM test connection successful', { model: input.model });
      return result;
    } catch (error) {
      logger.error('LLM test connection error', { model: input.model, error });
      return {
        ok: false,
        message: 'Network error while testing LLM connection',
        error_code: 'NETWORK_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executePrompt(prompt: string, context: Record<string, any>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        throw new Error(`LLM execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as { output?: string; response?: string };
      return result.output || result.response || '';
    } catch (error) {
      logger.error('LLM prompt execution error', { prompt: prompt.substring(0, 100), error });
      throw error;
    }
  }
}