import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  CreateServiceCommand,
  UpdateServiceCommand,
  DescribeServicesCommand,
  DeleteServiceCommand,
  StopTaskCommand,
  ListTasksCommand,
  TaskDefinition,
  Service as ECSService
} from '@aws-sdk/client-ecs';
import {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  DeleteFunctionCommand,
  InvokeCommand
} from '@aws-sdk/client-lambda';
import { McpDeployPort } from '@/domain/interfaces';
import { AWSCredentials, McpServerConfig, LambdaConfig, DeploymentResult } from '@/domain/types';
import { AWSServiceError, DeploymentError, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { config } from '@/config/config';

export class McpDeployAdapter implements McpDeployPort {
  private createECSClient(credentials: AWSCredentials) {
    return new ECSClient({
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

  private createLambdaClient(credentials: AWSCredentials) {
    return new LambdaClient({
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

  async deployToECS(mcpConfig: McpServerConfig, credentials: AWSCredentials): Promise<DeploymentResult> {
    try {
      this.validateMcpConfig(mcpConfig);
      
      const client = this.createECSClient(credentials);
      const startTime = new Date().toISOString();

      logger.info('Deploying MCP server to ECS', { 
        name: mcpConfig.name,
        image: mcpConfig.image,
        cluster: config.ECS_CLUSTER_NAME 
      });

      // Register task definition
      const taskDefinition = await this.registerTaskDefinition(client, mcpConfig);
      
      // Create or update service
      const service = await this.createOrUpdateECSService(client, mcpConfig, taskDefinition.taskDefinitionArn!);

      const result: DeploymentResult = {
        id: mcpConfig.name,
        status: 'running',
        target: 'ecs',
        resourceId: service.serviceArn,
        endpoint: this.generateECSEndpoint(mcpConfig),
        startedAt: startTime
      };

      logger.info('MCP server deployed to ECS successfully', {
        name: mcpConfig.name,
        serviceArn: service.serviceArn,
        taskDefinitionArn: taskDefinition.taskDefinitionArn
      });

      return result;
    } catch (error) {
      logger.error('Failed to deploy MCP server to ECS', { name: mcpConfig.name, error });
      
      if (error instanceof ValidationError || error instanceof DeploymentError) {
        throw error;
      }
      
      throw new AWSServiceError(`Failed to deploy to ECS: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async deployToLambda(lambdaConfig: LambdaConfig, credentials: AWSCredentials): Promise<DeploymentResult> {
    try {
      this.validateLambdaConfig(lambdaConfig);
      
      const client = this.createLambdaClient(credentials);
      const startTime = new Date().toISOString();

      logger.info('Deploying MCP server to Lambda', { 
        functionName: lambdaConfig.functionName,
        runtime: lambdaConfig.runtime 
      });

      // Check if function exists
      let functionExists = false;
      try {
        await client.send(new GetFunctionCommand({ FunctionName: lambdaConfig.functionName }));
        functionExists = true;
      } catch (error: any) {
        if (error.name !== 'ResourceNotFoundException') {
          throw error;
        }
      }

      let response;
      if (functionExists) {
        // Update existing function
        response = await client.send(new UpdateFunctionCodeCommand({
          FunctionName: lambdaConfig.functionName,
          S3Bucket: lambdaConfig.code.s3Bucket,
          S3Key: lambdaConfig.code.s3Key
        }));
      } else {
        // Create new function
        response = await client.send(new CreateFunctionCommand({
          FunctionName: lambdaConfig.functionName,
          Runtime: lambdaConfig.runtime as any,
          Role: lambdaConfig.role,
          Handler: lambdaConfig.handler,
          Code: {
            S3Bucket: lambdaConfig.code.s3Bucket,
            S3Key: lambdaConfig.code.s3Key
          },
          Environment: lambdaConfig.environment ? {
            Variables: lambdaConfig.environment
          } : undefined,
          MemorySize: lambdaConfig.memory || 128,
          Timeout: lambdaConfig.timeout || 30,
          Tags: {
            CreatedBy: 'agent-builder',
            Environment: process.env.NODE_ENV || 'development'
          }
        }));
      }

      const result: DeploymentResult = {
        id: lambdaConfig.functionName,
        status: 'completed',
        target: 'lambda',
        resourceId: response.FunctionArn,
        endpoint: response.FunctionArn,
        startedAt: startTime,
        completedAt: new Date().toISOString()
      };

      logger.info('MCP server deployed to Lambda successfully', {
        functionName: lambdaConfig.functionName,
        functionArn: response.FunctionArn,
        state: response.State
      });

      return result;
    } catch (error) {
      logger.error('Failed to deploy MCP server to Lambda', { functionName: lambdaConfig.functionName, error });
      
      if (error instanceof ValidationError || error instanceof DeploymentError) {
        throw error;
      }
      
      throw new AWSServiceError(`Failed to deploy to Lambda: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async getServiceStatus(serviceName: string, target: 'ecs' | 'lambda', credentials: AWSCredentials): Promise<DeploymentResult> {
    try {
      if (target === 'ecs') {
        return await this.getECSServiceStatus(serviceName, credentials);
      } else {
        return await this.getLambdaServiceStatus(serviceName, credentials);
      }
    } catch (error) {
      logger.error('Failed to get service status', { serviceName, target, error });
      throw new AWSServiceError(`Failed to get service status: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async updateService(
    serviceName: string,
    config: Partial<McpServerConfig | LambdaConfig>,
    target: 'ecs' | 'lambda',
    credentials: AWSCredentials
  ): Promise<DeploymentResult> {
    try {
      if (target === 'ecs') {
        return await this.updateECSService(serviceName, config as Partial<McpServerConfig>, credentials);
      } else {
        return await this.updateLambdaService(serviceName, config as Partial<LambdaConfig>, credentials);
      }
    } catch (error) {
      logger.error('Failed to update service', { serviceName, target, error });
      throw new AWSServiceError(`Failed to update service: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async deleteService(serviceName: string, target: 'ecs' | 'lambda', credentials: AWSCredentials): Promise<void> {
    try {
      if (target === 'ecs') {
        await this.deleteECSService(serviceName, credentials);
      } else {
        await this.deleteLambdaService(serviceName, credentials);
      }
    } catch (error) {
      logger.error('Failed to delete service', { serviceName, target, error });
      throw new AWSServiceError(`Failed to delete service: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  private async registerTaskDefinition(client: ECSClient, mcpConfig: McpServerConfig): Promise<TaskDefinition> {
    const command = new RegisterTaskDefinitionCommand({
      family: `mcp-${mcpConfig.name}`,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: String(mcpConfig.cpu || 256),
      memory: String(mcpConfig.memory || 512),
      executionRoleArn: config.ECS_TASK_EXECUTION_ROLE_ARN,
      taskRoleArn: config.ECS_TASK_ROLE_ARN,
      containerDefinitions: [
        {
          name: mcpConfig.name,
          image: mcpConfig.image,
          portMappings: [
            {
              containerPort: mcpConfig.port,
              protocol: 'tcp'
            }
          ],
          environment: mcpConfig.environment ? 
            Object.entries(mcpConfig.environment).map(([name, value]) => ({ name, value })) : [],
          logConfiguration: {
            logDriver: 'awslogs',
            options: {
              'awslogs-group': `/ecs/mcp-${mcpConfig.name}`,
              'awslogs-region': config.DEFAULT_AWS_REGION,
              'awslogs-stream-prefix': 'ecs'
            }
          },
          essential: true
        }
      ],
      tags: [
        { key: 'CreatedBy', value: 'agent-builder' },
        { key: 'Environment', value: process.env.NODE_ENV || 'development' }
      ]
    });

    const response = await client.send(command);
    
    if (!response.taskDefinition) {
      throw new DeploymentError('Task definition registration failed');
    }

    return response.taskDefinition;
  }

  private async createOrUpdateECSService(client: ECSClient, mcpConfig: McpServerConfig, taskDefinitionArn: string): Promise<ECSService> {
    const serviceName = `mcp-${mcpConfig.name}`;

    // Check if service exists
    let serviceExists = false;
    try {
      const describeResponse = await client.send(new DescribeServicesCommand({
        cluster: config.ECS_CLUSTER_NAME,
        services: [serviceName]
      }));
      serviceExists = !!(describeResponse.services && describeResponse.services.length > 0 && 
                     describeResponse.services[0].status !== 'INACTIVE');
    } catch (error) {
      // Service doesn't exist, create new one
    }

    if (serviceExists) {
      // Update existing service
      const updateResponse = await client.send(new UpdateServiceCommand({
        cluster: config.ECS_CLUSTER_NAME,
        service: serviceName,
        taskDefinition: taskDefinitionArn,
        desiredCount: mcpConfig.replicas || 1
      }));

      if (!updateResponse.service) {
        throw new DeploymentError('Service update failed');
      }

      return updateResponse.service;
    } else {
      // Create new service
      const createResponse = await client.send(new CreateServiceCommand({
        serviceName,
        cluster: config.ECS_CLUSTER_NAME,
        taskDefinition: taskDefinitionArn,
        desiredCount: mcpConfig.replicas || 1,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            assignPublicIp: 'ENABLED',
            // Note: In production, you should specify specific subnets and security groups
            subnets: [], // Should be provided via configuration
            securityGroups: [] // Should be provided via configuration
          }
        },
        tags: [
          { key: 'CreatedBy', value: 'agent-builder' },
          { key: 'Environment', value: process.env.NODE_ENV || 'development' }
        ]
      }));

      if (!createResponse.service) {
        throw new DeploymentError('Service creation failed');
      }

      return createResponse.service;
    }
  }

  private async getECSServiceStatus(serviceName: string, credentials: AWSCredentials): Promise<DeploymentResult> {
    const client = this.createECSClient(credentials);
    const fullServiceName = serviceName.startsWith('mcp-') ? serviceName : `mcp-${serviceName}`;

    const response = await client.send(new DescribeServicesCommand({
      cluster: config.ECS_CLUSTER_NAME,
      services: [fullServiceName]
    }));

    if (!response.services || response.services.length === 0) {
      throw new DeploymentError(`ECS service ${fullServiceName} not found`);
    }

    const service = response.services[0];
    
    return {
      id: serviceName,
      status: this.mapECSServiceStatus(service.status!),
      target: 'ecs',
      resourceId: service.serviceArn,
      endpoint: this.generateECSEndpoint({ name: serviceName, port: 80 } as McpServerConfig),
      startedAt: service.createdAt?.toISOString() || new Date().toISOString()
    };
  }

  private async getLambdaServiceStatus(functionName: string, credentials: AWSCredentials): Promise<DeploymentResult> {
    const client = this.createLambdaClient(credentials);

    const response = await client.send(new GetFunctionCommand({ FunctionName: functionName }));

    return {
      id: functionName,
      status: this.mapLambdaState(response.Configuration?.State!),
      target: 'lambda',
      resourceId: response.Configuration?.FunctionArn,
      endpoint: response.Configuration?.FunctionArn,
      startedAt: response.Configuration?.LastModified || new Date().toISOString()
    };
  }

  private async updateECSService(serviceName: string, config: Partial<McpServerConfig>, credentials: AWSCredentials): Promise<DeploymentResult> {
    // Implementation for updating ECS service
    throw new DeploymentError('ECS service update not yet implemented');
  }

  private async updateLambdaService(functionName: string, config: Partial<LambdaConfig>, credentials: AWSCredentials): Promise<DeploymentResult> {
    // Implementation for updating Lambda function
    throw new DeploymentError('Lambda function update not yet implemented');
  }

  private async deleteECSService(serviceName: string, credentials: AWSCredentials): Promise<void> {
    const client = this.createECSClient(credentials);
    const fullServiceName = serviceName.startsWith('mcp-') ? serviceName : `mcp-${serviceName}`;

    await client.send(new DeleteServiceCommand({
      cluster: config.ECS_CLUSTER_NAME,
      service: fullServiceName,
      force: true
    }));

    logger.info('ECS service deleted', { serviceName: fullServiceName });
  }

  private async deleteLambdaService(functionName: string, credentials: AWSCredentials): Promise<void> {
    const client = this.createLambdaClient(credentials);

    await client.send(new DeleteFunctionCommand({ FunctionName: functionName }));

    logger.info('Lambda function deleted', { functionName });
  }

  private validateMcpConfig(config: McpServerConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new ValidationError('MCP server name is required');
    }

    if (!config.image || config.image.trim().length === 0) {
      throw new ValidationError('Docker image is required');
    }

    if (!config.port || config.port <= 0 || config.port > 65535) {
      throw new ValidationError('Valid port number is required (1-65535)');
    }
  }

  private validateLambdaConfig(config: LambdaConfig): void {
    if (!config.functionName || config.functionName.trim().length === 0) {
      throw new ValidationError('Lambda function name is required');
    }

    if (!config.runtime || config.runtime.trim().length === 0) {
      throw new ValidationError('Lambda runtime is required');
    }

    if (!config.handler || config.handler.trim().length === 0) {
      throw new ValidationError('Lambda handler is required');
    }

    if (!config.role || config.role.trim().length === 0) {
      throw new ValidationError('Lambda execution role is required');
    }

    if (!config.code?.s3Bucket || !config.code?.s3Key) {
      throw new ValidationError('S3 bucket and key are required for Lambda code');
    }
  }

  private mapECSServiceStatus(status: string): 'pending' | 'running' | 'completed' | 'failed' {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'running';
      case 'PENDING':
        return 'pending';
      case 'DRAINING':
      case 'INACTIVE':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapLambdaState(state: string): 'pending' | 'running' | 'completed' | 'failed' {
    switch (state) {
      case 'Active':
        return 'completed';
      case 'Pending':
        return 'pending';
      case 'Failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private generateECSEndpoint(config: { name: string; port: number }): string {
    // In a real implementation, this would return the actual load balancer or service discovery endpoint
    return `http://${config.name}.ecs.local:${config.port}`;
  }
}