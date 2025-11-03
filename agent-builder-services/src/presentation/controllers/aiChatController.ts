import { Request, Response } from 'express';
import { logger } from '@/infrastructure/logger';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GeneratedFlow {
  nodes: any[];
  edges: any[];
  description?: string;
}

export class AIChatController {
  private llmServiceUrl: string;

  constructor() {
    this.llmServiceUrl = process.env.LLM_SERVICES_URL || 'http://localhost:5001';
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          message: 'Message is required and must be a string'
        });
        return;
      }

      logger.info('Processing AI chat message', {
        messageLength: message.length,
        historyLength: history?.length || 0
      });

      // Call LLM service to generate response and flow
      const llmResponse = await this.callLlmService(message, history || []);

      res.json(llmResponse);
    } catch (error) {
      logger.error('Error processing chat message', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to process chat message'
      });
    }
  }

  private async callLlmService(
    message: string,
    history: ChatMessage[]
  ): Promise<{ response: ChatMessage; generatedFlow?: GeneratedFlow }> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/api/chat/generate-flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, history })
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error calling LLM service', { error });

      // Fallback response if LLM service is unavailable
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but the AI service is currently unavailable. Please try again later or contact support if the problem persists.',
        timestamp: new Date().toISOString()
      };

      return { response: assistantMessage };
    }
  }
}
