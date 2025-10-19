import { Request, Response } from 'express';
import { LlmService } from '@/application/services/llmService';
import { logger } from '@/infrastructure/logger';

export class LlmController {
  constructor(private llmService: LlmService) {}

  async listLlms(req: Request, res: Response): Promise<void> {
    try {
      const llms = await this.llmService.listLlms();
      res.json(llms);
    } catch (error) {
      logger.error('Error listing LLMs', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve LLM configurations'
      });
    }
  }

  async createLlm(req: Request, res: Response): Promise<void> {
    try {
      const { name, model, apiKey } = req.body;
      
      if (!name || !model || !apiKey) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Name, model, and apiKey are required'
        });
        return;
      }

      const supportedModels = [
        'bedrock:claude-v3',
        'bedrock:claude-v3.5',
        'openai:gpt-4',
        'openai:gpt-3.5-turbo'
      ];

      if (!supportedModels.includes(model)) {
        res.status(400).json({
          error: 'Invalid model',
          code: 'VALIDATION_ERROR',
          message: `Model must be one of: ${supportedModels.join(', ')}`
        });
        return;
      }

      const llm = await this.llmService.createLlm({ name, model, apiKey });
      res.status(201).json(llm);
    } catch (error) {
      logger.error('Error creating LLM', { 
        body: { ...req.body, apiKey: '[REDACTED]' }, 
        error 
      });
      
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: 'Conflict',
          code: 'LLM_NAME_EXISTS',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to create LLM configuration'
        });
      }
    }
  }

  async testLlm(req: Request, res: Response): Promise<void> {
    try {
      const { model, apiKey } = req.body;
      
      if (!model || !apiKey) {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Model and apiKey are required'
        });
        return;
      }

      const result = await this.llmService.testLlm({ model, apiKey });
      res.json(result);
    } catch (error) {
      logger.error('Error testing LLM', { 
        model: req.body.model, 
        error 
      });
      
      res.status(500).json({
        error: 'Test failed',
        code: 'TEST_FAILED',
        message: 'Failed to test LLM connection'
      });
    }
  }

  async deleteLlm(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.llmService.deleteLlm(id);
      
      res.json({
        success: true,
        message: 'LLM configuration deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting LLM', { llmId: req.params.id, error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'LLM not found',
          code: 'LLM_NOT_FOUND',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete LLM configuration'
        });
      }
    }
  }
}