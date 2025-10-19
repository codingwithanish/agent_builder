import { LlmRepository } from '@/domain/interfaces/LlmRepository';
import { LlmClient } from '@/domain/interfaces/LlmClient';
import { LlmConfig, CreateLlmInput, TestLlmInput, TestLlmResult } from '@/domain/entities/LlmConfig';
import { logger } from '@/infrastructure/logger';

export class LlmService {
  constructor(
    private llmRepository: LlmRepository,
    private llmClient: LlmClient
  ) {}

  async createLlm(input: CreateLlmInput): Promise<LlmConfig> {
    const existingLlm = await this.llmRepository.findByName(input.name);
    if (existingLlm) {
      throw new Error(`LLM configuration with name '${input.name}' already exists`);
    }

    const llm = await this.llmRepository.create(input);
    logger.info('LLM configuration created', { llmId: llm.id, name: llm.name, model: llm.model });
    return llm;
  }

  async getLlm(id: string): Promise<LlmConfig> {
    const llm = await this.llmRepository.findById(id);
    if (!llm) {
      throw new Error(`LLM configuration ${id} not found`);
    }
    return llm;
  }

  async getLlmByName(name: string): Promise<LlmConfig> {
    const llm = await this.llmRepository.findByName(name);
    if (!llm) {
      throw new Error(`LLM configuration '${name}' not found`);
    }
    return llm;
  }

  async listLlms(): Promise<LlmConfig[]> {
    return this.llmRepository.findAll();
  }

  async deleteLlm(id: string): Promise<void> {
    await this.getLlm(id); // Ensure exists
    await this.llmRepository.delete(id);
    logger.info('LLM configuration deleted', { llmId: id });
  }

  async testLlm(input: TestLlmInput): Promise<TestLlmResult> {
    logger.info('Testing LLM connection', { model: input.model });
    
    try {
      const result = await this.llmClient.testConnection(input);
      logger.info('LLM test completed', { 
        model: input.model, 
        success: result.ok,
        latency: result.latency 
      });
      return result;
    } catch (error) {
      logger.error('LLM test failed', { model: input.model, error });
      return {
        ok: false,
        message: 'Network error while testing LLM connection',
        error_code: 'NETWORK_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}