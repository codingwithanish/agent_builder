import { 
  AgentDeployPort, 
  McpDeployPort, 
  EventEmitterPort 
} from '@/domain/interfaces';
import { 
  AWSCredentials, 
  BedrockAgentConfig, 
  McpServerConfig, 
  LambdaConfig, 
  DeploymentResult,
  DeploymentTarget 
} from '@/domain/types';
import { DeploymentError, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { v4 as uuidv4 } from 'uuid';

export class DeploymentService {
  constructor(
    private agentDeploy: AgentDeployPort,
    private mcpDeploy: McpDeployPort,
    private eventEmitter: EventEmitterPort
  ) {}

  async deployBedrockAgent(
    config: BedrockAgentConfig,
    credentials: AWSCredentials
  ): Promise<DeploymentResult> {
    const deploymentId = uuidv4();
    
    try {
      logger.info('Starting Bedrock agent deployment', {
        deploymentId,
        agentName: config.agentName,
        foundationModel: config.foundationModel
      });

      // Emit deployment started
      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'creating',
        0,
        'Starting Bedrock agent creation'
      );

      // Create the agent
      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'creating',
        25,
        'Creating Bedrock agent'
      );

      const result = await this.agentDeploy.createAgent(config, credentials);
      const agentId = result.resourceId!;

      // Prepare the agent
      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'preparing',
        50,
        'Preparing agent for deployment'
      );

      await this.agentDeploy.prepareAgent(agentId, credentials);

      // Create alias
      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'aliasing',
        75,
        'Creating agent alias'
      );

      const aliasId = await this.agentDeploy.createAlias(agentId, 'PROD', credentials);

      // Wait for agent to be ready (in a real implementation, you might poll the status)
      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'finalizing',
        90,
        'Finalizing deployment'
      );

      const finalResult: DeploymentResult = {
        ...result,
        id: deploymentId,
        status: 'completed',
        endpoint: `bedrock:${agentId}:${aliasId}`,
        completedAt: new Date().toISOString()
      };

      this.eventEmitter.emitDeploymentComplete(
        deploymentId,
        'completed',
        agentId
      );

      logger.info('Bedrock agent deployment completed', {
        deploymentId,
        agentId,
        aliasId,
        agentName: config.agentName
      });

      return finalResult;
    } catch (error) {
      logger.error('Bedrock agent deployment failed', {
        deploymentId,
        agentName: config.agentName,
        error
      });

      this.eventEmitter.emitDeploymentError(
        deploymentId,
        `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );

      throw error;
    }
  }

  async deployMcpServer(
    config: McpServerConfig,
    target: DeploymentTarget,
    credentials: AWSCredentials
  ): Promise<DeploymentResult> {
    const deploymentId = uuidv4();

    try {
      logger.info('Starting MCP server deployment', {
        deploymentId,
        name: config.name,
        target,
        image: config.image
      });

      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'initializing',
        0,
        `Starting ${target.toUpperCase()} deployment`
      );

      let result: DeploymentResult;

      if (target === 'ecs') {
        this.eventEmitter.emitDeploymentProgress(
          deploymentId,
          'deploying',
          25,
          'Creating ECS task definition'
        );

        result = await this.mcpDeploy.deployToECS(config, credentials);
      } else if (target === 'lambda') {
        // Convert MCP config to Lambda config
        const lambdaConfig = this.convertMcpToLambdaConfig(config);
        
        this.eventEmitter.emitDeploymentProgress(
          deploymentId,
          'deploying',
          25,
          'Creating Lambda function'
        );

        result = await this.mcpDeploy.deployToLambda(lambdaConfig, credentials);
      } else {
        throw new ValidationError(`Unsupported deployment target: ${target}`);
      }

      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'finalizing',
        75,
        'Finalizing deployment'
      );

      const finalResult: DeploymentResult = {
        ...result,
        id: deploymentId,
        completedAt: new Date().toISOString()
      };

      this.eventEmitter.emitDeploymentComplete(
        deploymentId,
        result.status,
        result.resourceId
      );

      logger.info('MCP server deployment completed', {
        deploymentId,
        name: config.name,
        target,
        resourceId: result.resourceId
      });

      return finalResult;
    } catch (error) {
      logger.error('MCP server deployment failed', {
        deploymentId,
        name: config.name,
        target,
        error
      });

      this.eventEmitter.emitDeploymentError(
        deploymentId,
        `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );

      throw error;
    }
  }

  async getDeploymentStatus(
    deploymentId: string,
    target?: DeploymentTarget,
    credentials?: AWSCredentials
  ): Promise<DeploymentResult> {
    try {
      // In a real implementation, you would store deployment metadata
      // and retrieve the actual status from AWS services
      logger.info('Getting deployment status', { deploymentId, target });

      if (!target || !credentials) {
        throw new ValidationError('Target and credentials are required for status check');
      }

      // For now, return a placeholder result
      // In practice, you'd look up the deployment and check actual AWS resource status
      return {
        id: deploymentId,
        status: 'completed',
        target,
        resourceId: `resource-${deploymentId}`,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get deployment status', { deploymentId, error });
      throw error;
    }
  }

  async updateDeployment(
    deploymentId: string,
    config: Partial<BedrockAgentConfig | McpServerConfig | LambdaConfig>,
    target: DeploymentTarget,
    credentials: AWSCredentials
  ): Promise<DeploymentResult> {
    try {
      logger.info('Updating deployment', { deploymentId, target });

      this.eventEmitter.emitDeploymentProgress(
        deploymentId,
        'updating',
        0,
        'Starting deployment update'
      );

      let result: DeploymentResult;

      if ('agentName' in config) {
        // Bedrock agent update
        const agentConfig = config as Partial<BedrockAgentConfig>;
        result = await this.agentDeploy.updateAgent(deploymentId, agentConfig, credentials);
      } else if (target === 'ecs') {
        // ECS service update
        const mcpConfig = config as Partial<McpServerConfig>;
        result = await this.mcpDeploy.updateService(deploymentId, mcpConfig, 'ecs', credentials);
      } else if (target === 'lambda') {
        // Lambda function update
        const lambdaConfig = config as Partial<LambdaConfig>;
        result = await this.mcpDeploy.updateService(deploymentId, lambdaConfig, 'lambda', credentials);
      } else {
        throw new ValidationError(`Unsupported target for update: ${target}`);
      }

      this.eventEmitter.emitDeploymentComplete(
        deploymentId,
        result.status,
        result.resourceId
      );

      logger.info('Deployment update completed', {
        deploymentId,
        target,
        status: result.status
      });

      return result;
    } catch (error) {
      logger.error('Deployment update failed', { deploymentId, target, error });

      this.eventEmitter.emitDeploymentError(
        deploymentId,
        `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );

      throw error;
    }
  }

  async deleteDeployment(
    deploymentId: string,
    target: DeploymentTarget,
    credentials: AWSCredentials
  ): Promise<void> {
    try {
      logger.info('Deleting deployment', { deploymentId, target });

      if (target === 'ecs') {
        await this.mcpDeploy.deleteService(deploymentId, 'ecs', credentials);
      } else if (target === 'lambda') {
        await this.mcpDeploy.deleteService(deploymentId, 'lambda', credentials);
      } else {
        // For Bedrock agents, we need the actual agent ID
        await this.agentDeploy.deleteAgent(deploymentId, credentials);
      }

      this.eventEmitter.emit({
        type: 'deploy:deleted',
        id: deploymentId,
        data: {
          deploymentId,
          target,
          deletedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      logger.info('Deployment deleted successfully', { deploymentId, target });
    } catch (error) {
      logger.error('Failed to delete deployment', { deploymentId, target, error });
      throw error;
    }
  }

  private convertMcpToLambdaConfig(mcpConfig: McpServerConfig): LambdaConfig {
    // Convert MCP server config to Lambda config
    // This is a simplified conversion - in practice, you'd need more sophisticated logic
    return {
      functionName: mcpConfig.name,
      runtime: 'nodejs18.x',
      handler: 'index.handler',
      code: {
        s3Bucket: 'your-lambda-code-bucket',
        s3Key: `mcp-${mcpConfig.name}.zip`
      },
      environment: mcpConfig.environment,
      memory: mcpConfig.memory || 128,
      timeout: 30,
      role: process.env.LAMBDA_EXECUTION_ROLE_ARN || ''
    };
  }

  // Utility methods for deployment validation
  private validateBedrockConfig(config: BedrockAgentConfig): void {
    if (!config.agentName?.trim()) {
      throw new ValidationError('Agent name is required');
    }

    if (!config.instruction?.trim()) {
      throw new ValidationError('Agent instruction is required');
    }

    if (!config.foundationModel?.trim()) {
      throw new ValidationError('Foundation model is required');
    }

    if (!config.agentResourceRoleArn?.trim()) {
      throw new ValidationError('Agent resource role ARN is required');
    }
  }

  private validateMcpConfig(config: McpServerConfig): void {
    if (!config.name?.trim()) {
      throw new ValidationError('MCP server name is required');
    }

    if (!config.image?.trim()) {
      throw new ValidationError('Docker image is required');
    }

    if (!config.port || config.port <= 0) {
      throw new ValidationError('Valid port number is required');
    }
  }
}