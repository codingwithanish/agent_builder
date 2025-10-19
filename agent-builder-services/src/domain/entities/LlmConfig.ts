export interface LlmConfig {
  id: string;
  name: string;
  model: string;
  apiKeyMasked: string;
  createdAt: string;
}

export interface CreateLlmInput {
  name: string;
  model: string;
  apiKey: string;
}

export interface TestLlmInput {
  model: string;
  apiKey: string;
}

export interface TestLlmResult {
  ok: boolean;
  message?: string;
  latency?: number;
  model_info?: {
    name: string;
    version: string;
  };
  error_code?: string;
  details?: string;
}