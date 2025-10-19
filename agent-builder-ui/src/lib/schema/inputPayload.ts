import { z } from 'zod';

export const InputPayloadSchema = z.object({
  threadId: z.string().optional(),
  input: z.any(),           // user-defined payload
  metadata: z.record(z.any()).optional()
});

export type InputPayload = z.infer<typeof InputPayloadSchema>;