import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  InvokeAgentCommandInput
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime';
import { InvocationPort } from '@/domain/interfaces';
import { AWSCredentials, BedrockInvokeRequest, BedrockInvokeResponse } from '@/domain/types';
import { AWSServiceError, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { config } from '@/config/config';

export class BedrockInvokeAdapter implements InvocationPort {
  private createAgentRuntimeClient(credentials: AWSCredentials) {
    return new BedrockAgentRuntimeClient({
      region: credentials.region || config.DEFAULT_AWS_REGION,
      ...(credentials.accessKeyId && {
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
        }
      })
    });
  }

  private createBedrockRuntimeClient(credentials: AWSCredentials) {
    return new BedrockRuntimeClient({
      region: credentials.region || config.DEFAULT_AWS_REGION,
      ...(credentials.accessKeyId && {
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
        }
      })
    });
  }

  async invokeBedrockAgent(request: BedrockInvokeRequest, credentials: AWSCredentials): Promise<BedrockInvokeResponse> {
    try {
      this.validateInvokeRequest(request);
      
      const client = this.createAgentRuntimeClient(credentials);

      logger.info('Invoking Bedrock agent', {
        agentId: request.agentId,
        agentAliasId: request.agentAliasId,
        sessionId: request.sessionId,
        inputLength: request.inputText.length
      });

      const command = new InvokeAgentCommand({
        agentId: request.agentId,
        agentAliasId: request.agentAliasId,
        sessionId: request.sessionId,
        inputText: request.inputText,
        enableTrace: request.enableTrace || false
      });

      const response = await client.send(command);

      if (!response.completion) {
        throw new AWSServiceError('No completion received from Bedrock agent');
      }

      // Process the response stream
      let completion = '';
      const trace: any[] = [];

      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          completion += text;
        }

        if (chunk.trace && request.enableTrace) {
          trace.push(chunk.trace);
        }
      }

      const result: BedrockInvokeResponse = {
        completion: completion.trim(),
        sessionId: request.sessionId,
        ...(request.enableTrace && { trace })
      };

      logger.info('Bedrock agent invocation completed', {
        agentId: request.agentId,
        sessionId: request.sessionId,
        completionLength: completion.length,
        traceItems: trace.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to invoke Bedrock agent', {
        agentId: request.agentId,
        sessionId: request.sessionId,
        error
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new AWSServiceError(`Failed to invoke Bedrock agent: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async invokeBedrockModel(modelId: string, input: string, credentials: AWSCredentials): Promise<string> {
    try {
      if (!modelId || !input) {
        throw new ValidationError('Model ID and input are required');
      }

      const client = this.createBedrockRuntimeClient(credentials);

      logger.info('Invoking Bedrock model', {
        modelId,
        inputLength: input.length
      });

      // Use Converse API for newer models
      if (this.supportsConverseAPI(modelId)) {
        const command = new ConverseCommand({
          modelId,
          messages: [
            {
              role: 'user',
              content: [{ text: input }]
            }
          ],
          inferenceConfig: {
            maxTokens: 4096,
            temperature: 0.7
          }
        });

        const response = await client.send(command);

        if (!response.output?.message?.content?.[0]?.text) {
          throw new AWSServiceError('No content received from Bedrock model');
        }

        const result = response.output.message.content[0].text;

        logger.info('Bedrock model invocation completed', {
          modelId,
          inputLength: input.length,
          outputLength: result.length,
          usage: response.usage
        });

        return result;
      } else {
        // Use legacy InvokeModel API for older models
        const command = new InvokeModelCommand({
          modelId,
          body: JSON.stringify({
            prompt: input,
            max_tokens_to_sample: 4096,
            temperature: 0.7,
            top_p: 0.9
          }),
          contentType: 'application/json',
          accept: 'application/json'
        });

        const response = await client.send(command);

        if (!response.body) {
          throw new AWSServiceError('No body received from Bedrock model');
        }

        const responseData = JSON.parse(new TextDecoder().decode(response.body));
        const result = responseData.completion || responseData.text || '';

        logger.info('Bedrock model invocation completed (legacy)', {
          modelId,
          inputLength: input.length,
          outputLength: result.length
        });

        return result;
      }
    } catch (error) {
      logger.error('Failed to invoke Bedrock model', { modelId, error });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new AWSServiceError(`Failed to invoke Bedrock model: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async streamBedrockAgent(
    request: BedrockInvokeRequest,
    credentials: AWSCredentials,
    onChunk: (chunk: string) => void
  ): Promise<BedrockInvokeResponse> {
    try {
      this.validateInvokeRequest(request);
      
      const client = this.createAgentRuntimeClient(credentials);

      logger.info('Starting streaming invocation of Bedrock agent', {
        agentId: request.agentId,
        agentAliasId: request.agentAliasId,
        sessionId: request.sessionId
      });

      const command = new InvokeAgentCommand({
        agentId: request.agentId,
        agentAliasId: request.agentAliasId,
        sessionId: request.sessionId,
        inputText: request.inputText,
        enableTrace: request.enableTrace || false
      });

      const response = await client.send(command);

      if (!response.completion) {
        throw new AWSServiceError('No completion received from Bedrock agent');
      }

      let completion = '';
      const trace: any[] = [];

      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          completion += text;
          onChunk(text); // Stream each chunk to the caller
        }

        if (chunk.trace && request.enableTrace) {
          trace.push(chunk.trace);
        }
      }

      const result: BedrockInvokeResponse = {
        completion: completion.trim(),
        sessionId: request.sessionId,
        ...(request.enableTrace && { trace })
      };

      logger.info('Streaming Bedrock agent invocation completed', {
        agentId: request.agentId,
        sessionId: request.sessionId,
        completionLength: completion.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to stream Bedrock agent invocation', {
        agentId: request.agentId,
        sessionId: request.sessionId,
        error
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new AWSServiceError(`Failed to stream Bedrock agent invocation: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  private validateInvokeRequest(request: BedrockInvokeRequest): void {
    if (!request.agentId || request.agentId.trim().length === 0) {
      throw new ValidationError('Agent ID is required');
    }

    if (!request.agentAliasId || request.agentAliasId.trim().length === 0) {
      throw new ValidationError('Agent alias ID is required');
    }

    if (!request.sessionId || request.sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    if (!request.inputText || request.inputText.trim().length === 0) {
      throw new ValidationError('Input text is required');
    }

    // Validate input text length (Bedrock has limits)
    if (request.inputText.length > 25000) {
      throw new ValidationError('Input text exceeds maximum length of 25,000 characters');
    }
  }

  private supportsConverseAPI(modelId: string): boolean {
    // List of models that support the Converse API
    const converseModels = [
      'anthropic.claude-3',
      'anthropic.claude-3-5',
      'meta.llama3',
      'amazon.titan-text',
      'cohere.command'
    ];

    return converseModels.some(model => modelId.startsWith(model));
  }
}