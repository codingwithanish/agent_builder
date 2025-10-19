import { LlmConfig, CreateLlmInput } from '@/domain/entities/LlmConfig';

export interface LlmRepository {
  create(llm: CreateLlmInput): Promise<LlmConfig>;
  findById(id: string): Promise<LlmConfig | null>;
  findByName(name: string): Promise<LlmConfig | null>;
  findAll(): Promise<LlmConfig[]>;
  delete(id: string): Promise<void>;
}