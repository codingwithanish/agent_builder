import { Request, Response } from 'express';
import { DeploymentService } from '@/services/deploymentService';
import { CredentialResolver } from '@/config/credentialResolver';
import { BedrockInvokeAdapter } from '@/adapters/bedrockInvokeAdapter';
import { createErrorResponse, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { BedrockAgentConfig, BedrockInvokeRequest } from '@/domain/types';
import { v4 as uuidv4 } from 'uuid';

export class BedrockController {
  constructor(
    private deploymentService: DeploymentService,
    private credentialResolver: CredentialResolver,
    private bedrockInvoker: BedrockInvokeAdapter
  ) {}

  async deployAgent(req: Request, res: Response): Promise<void> {
    try {
      const config: BedrockAgentConfig = req.body;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      // Validate credentials
      const isValid = await this.credentialResolver.validateCredentials(credentials);
      if (!isValid) {
        res.status(401).json(createErrorResponse(new ValidationError('Invalid AWS credentials')));
        return;
      }

      // Validate required fields
      if (!config.agentName || !config.instruction || !config.foundationModel || !config.agentResourceRoleArn) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Missing required fields: agentName, instruction, foundationModel, agentResourceRoleArn')
        ));
        return;
      }

      logger.info('Starting Bedrock agent deployment via API', {
        agentName: config.agentName,
        foundationModel: config.foundationModel
      });

      const result = await this.deploymentService.deployBedrockAgent(config, credentials);

      res.status(202).json({
        success: true,
        message: 'Bedrock agent deployment initiated',
        data: result
      });
    } catch (error) {
      logger.error('Bedrock agent deployment failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async getAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!agentId) {
        res.status(400).json(createErrorResponse(new ValidationError('Agent ID is required')));
        return;
      }

      const status = await this.deploymentService.getDeploymentStatus(agentId, 'ecs', credentials);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get Bedrock agent status', { agentId: req.params.agentId, error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async invokeAgent(req: Request, res: Response): Promise<void> {
    try {
      const invokeRequest: BedrockInvokeRequest = req.body;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      // Validate required fields
      if (!invokeRequest.agentId || !invokeRequest.agentAliasId || !invokeRequest.inputText) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Missing required fields: agentId, agentAliasId, inputText')
        ));
        return;
      }

      // Generate session ID if not provided
      if (!invokeRequest.sessionId) {
        invokeRequest.sessionId = uuidv4();
      }

      logger.info('Invoking Bedrock agent via API', {
        agentId: invokeRequest.agentId,
        agentAliasId: invokeRequest.agentAliasId,
        sessionId: invokeRequest.sessionId,
        inputLength: invokeRequest.inputText.length
      });

      const result = await this.bedrockInvoker.invokeBedrockAgent(invokeRequest, credentials);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Bedrock agent invocation failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async streamAgentInvocation(req: Request, res: Response): Promise<void> {
    try {
      const invokeRequest: BedrockInvokeRequest = req.body;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      // Validate required fields
      if (!invokeRequest.agentId || !invokeRequest.agentAliasId || !invokeRequest.inputText) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Missing required fields: agentId, agentAliasId, inputText')
        ));
        return;
      }

      // Generate session ID if not provided
      if (!invokeRequest.sessionId) {
        invokeRequest.sessionId = uuidv4();
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      logger.info('Starting streaming Bedrock agent invocation via API', {
        agentId: invokeRequest.agentId,
        sessionId: invokeRequest.sessionId
      });

      const result = await this.bedrockInvoker.streamBedrockAgent(
        invokeRequest,
        credentials,
        (chunk: string) => {
          // Stream each chunk to the client
          res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`);
        }
      );

      // Send final result
      res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
      res.write('event: close\ndata: Stream complete\n\n');
      res.end();
    } catch (error) {
      logger.error('Streaming Bedrock agent invocation failed via API', { error });
      
      // Send error through SSE
      const errorResponse = createErrorResponse(error as Error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorResponse })}\n\n`);
      res.end();
    }
  }

  async invokeModel(req: Request, res: Response): Promise<void> {
    try {
      const { modelId, input } = req.body;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!modelId || !input) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Missing required fields: modelId, input')
        ));
        return;
      }

      logger.info('Invoking Bedrock model via API', {
        modelId,
        inputLength: input.length
      });

      const result = await this.bedrockInvoker.invokeBedrockModel(modelId, input, credentials);

      res.json({
        success: true,
        data: {
          modelId,
          input,
          output: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Bedrock model invocation failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async createKnowledgeBase(req: Request, res: Response): Promise<void> {
    try {
      // Placeholder for knowledge base creation
      // This would require implementing BedrockKnowledgeBaseAdapter
      res.status(501).json({
        success: false,
        error: 'Knowledge base creation not yet implemented',
        code: 'NOT_IMPLEMENTED',
        message: 'This feature is planned for future implementation'
      });
    } catch (error) {
      logger.error('Knowledge base creation failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async startIngestion(req: Request, res: Response): Promise<void> {
    try {
      // Placeholder for knowledge base ingestion
      res.status(501).json({
        success: false,
        error: 'Knowledge base ingestion not yet implemented',
        code: 'NOT_IMPLEMENTED',
        message: 'This feature is planned for future implementation'
      });
    } catch (error) {
      logger.error('Knowledge base ingestion failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}