import { TestLlmInput, TestLlmResult } from '@/domain/entities/LlmConfig';

export interface LlmClient {
  testConnection(input: TestLlmInput): Promise<TestLlmResult>;
  executePrompt(prompt: string, context: Record<string, any>): Promise<string>;
}