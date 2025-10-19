import { z } from 'zod';

export const FlowCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(25, 'Name must be 25 characters or less'),
  description: z.string().optional(),
  llmName: z.string().min(1, 'LLM selection is required'),
});

export type FlowCreateInput = z.infer<typeof FlowCreateSchema>;

export const LlmCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().min(1, 'API Key is required'),
});

export type LlmCreateInput = z.infer<typeof LlmCreateSchema>;

export const ResourceUploadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  file: z.instanceof(File),
});

export type ResourceUploadInput = z.infer<typeof ResourceUploadSchema>;