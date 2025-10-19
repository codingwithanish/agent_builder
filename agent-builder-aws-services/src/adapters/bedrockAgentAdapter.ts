import {
  BedrockAgentClient,
  CreateAgentCommand,
  UpdateAgentCommand,
  PrepareAgentCommand,
  CreateAgentAliasCommand,
  GetAgentCommand,
  DeleteAgentCommand,
  AgentStatus,
  CreateAgentActionGroupCommand,
  UpdateAgentActionGroupCommand
} from '@aws-sdk/client-bedrock-agent';
import { AgentDeployPort } from '@/domain/interfaces';
import { AWSCredentials, BedrockAgentConfig, DeploymentResult } from '@/domain/types';
import { AWSServiceError, DeploymentError, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { config } from '@/config/config';

export class BedrockAgentAdapter implements AgentDeployPort {
  private createBedrockClient(credentials: AWSCredentials) {
    return new BedrockAgentClient({
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

  async createAgent(config: BedrockAgentConfig, credentials: AWSCredentials): Promise<DeploymentResult> {
    try {
      this.validateAgentConfig(config);
      
      const client = this.createBedrockClient(credentials);
      const startTime = new Date().toISOString();

      logger.info('Creating Bedrock agent', { agentName: config.agentName });

      const command = new CreateAgentCommand({
        agentName: config.agentName,
        description: config.description,
        instruction: config.instruction,
        foundationModel: config.foundationModel,
        agentResourceRoleArn: config.agentResourceRoleArn,
        idleSessionTTLInSeconds: 1800, // 30 minutes
        tags: {
          CreatedBy: 'agent-builder',
          Environment: process.env.NODE_ENV || 'development'
        }
      });

      const response = await client.send(command);

      if (!response.agent) {
        throw new DeploymentError('Agent creation failed - no agent returned');
      }

      const agentId = response.agent.agentId!;
      
      // Create action groups if specified
      if (config.actionGroups && config.actionGroups.length > 0) {
        await this.createActionGroups(client, agentId, config.actionGroups);
      }

      logger.info('Bedrock agent created successfully', { 
        agentId, 
        agentName: config.agentName,
        status: response.agent.agentStatus 
      });

      return {
        id: agentId,
        status: this.mapAgentStatus(response.agent.agentStatus!),
        target: 'ecs', // Bedrock is managed, but we use 'ecs' as placeholder
        resourceId: agentId,
        startedAt: startTime,
        ...(response.agent.agentStatus === AgentStatus.PREPARED && {
          completedAt: new Date().toISOString()
        })
      };
    } catch (error) {
      logger.error('Failed to create Bedrock agent', { agentName: config.agentName, error });
      
      if (error instanceof ValidationError || error instanceof DeploymentError) {
        throw error;
      }
      
      throw new AWSServiceError(`Failed to create Bedrock agent: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async updateAgent(agentId: string, config: Partial<BedrockAgentConfig>, credentials: AWSCredentials): Promise<DeploymentResult> {
    try {
      const client = this.createBedrockClient(credentials);
      const startTime = new Date().toISOString();

      logger.info('Updating Bedrock agent', { agentId });

      // Get current agent details first
      const getCommand = new GetAgentCommand({ agentId });
      const currentAgent = await client.send(getCommand);

      if (!currentAgent.agent) {
        throw new DeploymentError(`Agent ${agentId} not found`);
      }

      const updateCommand = new UpdateAgentCommand({
        agentId,
        agentName: config.agentName || currentAgent.agent.agentName,
        description: config.description !== undefined ? config.description : currentAgent.agent.description,
        instruction: config.instruction || currentAgent.agent.instruction,
        foundationModel: config.foundationModel || currentAgent.agent.foundationModel,
        agentResourceRoleArn: config.agentResourceRoleArn || currentAgent.agent.agentResourceRoleArn,
      });

      const response = await client.send(updateCommand);

      if (!response.agent) {
        throw new DeploymentError('Agent update failed - no agent returned');
      }

      logger.info('Bedrock agent updated successfully', { 
        agentId, 
        status: response.agent.agentStatus 
      });

      return {
        id: agentId,
        status: this.mapAgentStatus(response.agent.agentStatus!),
        target: 'ecs',
        resourceId: agentId,
        startedAt: startTime,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to update Bedrock agent', { agentId, error });
      throw new AWSServiceError(`Failed to update Bedrock agent: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async prepareAgent(agentId: string, credentials: AWSCredentials): Promise<void> {
    try {
      const client = this.createBedrockClient(credentials);

      logger.info('Preparing Bedrock agent', { agentId });

      const command = new PrepareAgentCommand({ agentId });
      await client.send(command);

      logger.info('Bedrock agent preparation initiated', { agentId });
    } catch (error) {
      logger.error('Failed to prepare Bedrock agent', { agentId, error });
      throw new AWSServiceError(`Failed to prepare Bedrock agent: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async createAlias(agentId: string, aliasName: string, credentials: AWSCredentials): Promise<string> {
    try {
      const client = this.createBedrockClient(credentials);

      logger.info('Creating Bedrock agent alias', { agentId, aliasName });

      const command = new CreateAgentAliasCommand({
        agentId,
        agentAliasName: aliasName,
        description: `Alias for agent ${agentId}`,
        tags: {
          CreatedBy: 'agent-builder',
          Environment: process.env.NODE_ENV || 'development'
        }
      });

      const response = await client.send(command);

      if (!response.agentAlias) {
        throw new DeploymentError('Alias creation failed - no alias returned');
      }

      const aliasId = response.agentAlias.agentAliasId!;

      logger.info('Bedrock agent alias created successfully', { 
        agentId, 
        aliasId, 
        aliasName 
      });

      return aliasId;
    } catch (error) {
      logger.error('Failed to create Bedrock agent alias', { agentId, aliasName, error });
      throw new AWSServiceError(`Failed to create agent alias: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async getAgentStatus(agentId: string, credentials: AWSCredentials): Promise<DeploymentResult> {
    try {
      const client = this.createBedrockClient(credentials);

      const command = new GetAgentCommand({ agentId });
      const response = await client.send(command);

      if (!response.agent) {
        throw new DeploymentError(`Agent ${agentId} not found`);
      }

      const agent = response.agent;

      return {
        id: agentId,
        status: this.mapAgentStatus(agent.agentStatus!),
        target: 'ecs',
        resourceId: agentId,
        endpoint: agent.agentArn,
        startedAt: agent.createdAt?.toISOString() || new Date().toISOString(),
        ...(agent.agentStatus === AgentStatus.PREPARED && {
          completedAt: agent.updatedAt?.toISOString() || new Date().toISOString()
        })
      };
    } catch (error) {
      logger.error('Failed to get Bedrock agent status', { agentId, error });
      throw new AWSServiceError(`Failed to get agent status: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async deleteAgent(agentId: string, credentials: AWSCredentials): Promise<void> {
    try {
      const client = this.createBedrockClient(credentials);

      logger.info('Deleting Bedrock agent', { agentId });

      const command = new DeleteAgentCommand({
        agentId,
        skipResourceInUseCheck: false
      });

      await client.send(command);

      logger.info('Bedrock agent deleted successfully', { agentId });
    } catch (error) {
      logger.error('Failed to delete Bedrock agent', { agentId, error });
      throw new AWSServiceError(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  private async createActionGroups(client: BedrockAgentClient, agentId: string, actionGroups: any[]): Promise<void> {
    for (const actionGroup of actionGroups) {
      try {
        logger.debug('Creating action group', { agentId, actionGroupName: actionGroup.actionGroupName });

        const command = new CreateAgentActionGroupCommand({
          agentId,
          agentVersion: 'DRAFT',
          actionGroupName: actionGroup.actionGroupName,
          description: actionGroup.description,
          actionGroupExecutor: actionGroup.actionGroupExecutor,
          apiSchema: actionGroup.apiSchema
        });

        await client.send(command);

        logger.info('Action group created successfully', { 
          agentId, 
          actionGroupName: actionGroup.actionGroupName 
        });
      } catch (error) {
        logger.error('Failed to create action group', { 
          agentId, 
          actionGroupName: actionGroup.actionGroupName, 
          error 
        });
        // Continue with other action groups instead of failing the entire deployment
      }
    }
  }

  private validateAgentConfig(config: BedrockAgentConfig): void {
    if (!config.agentName || config.agentName.trim().length === 0) {
      throw new ValidationError('Agent name is required');
    }

    if (!config.instruction || config.instruction.trim().length === 0) {
      throw new ValidationError('Agent instruction is required');
    }

    if (!config.foundationModel || config.foundationModel.trim().length === 0) {
      throw new ValidationError('Foundation model is required');
    }

    if (!config.agentResourceRoleArn || config.agentResourceRoleArn.trim().length === 0) {
      throw new ValidationError('Agent resource role ARN is required');
    }

    // Validate ARN format
    const arnRegex = /^arn:aws:iam::\d{12}:role\/.+/;
    if (!arnRegex.test(config.agentResourceRoleArn)) {
      throw new ValidationError('Invalid agent resource role ARN format');
    }
  }

  private mapAgentStatus(status: AgentStatus): 'pending' | 'running' | 'completed' | 'failed' {
    switch (status) {
      case AgentStatus.CREATING:
      case AgentStatus.PREPARING:
      case AgentStatus.UPDATING:
        return 'running';
      case AgentStatus.PREPARED:
        return 'completed';
      case AgentStatus.FAILED:
      case AgentStatus.DELETING:
        return 'failed';
      case AgentStatus.NOT_PREPARED:
      default:
        return 'pending';
    }
  }
}