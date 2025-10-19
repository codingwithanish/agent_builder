import {
  AWSCredentials,
  ArtifactMetadata,
  ArtifactType,
  DeploymentRequest,
  DeploymentResult,
  BedrockAgentConfig,
  BedrockInvokeRequest,
  BedrockInvokeResponse,
  McpServerConfig,
  LambdaConfig,
  WebSocketEvent
} from '@/domain/types';

export interface CredentialProviderPort {
  resolveCredentials(headers: Record<string, string>): Promise<AWSCredentials>;
  validateCredentials(credentials: AWSCredentials): Promise<boolean>;
  assumeRole(credentials: AWSCredentials, roleArn: string): Promise<AWSCredentials>;
}

export interface ArtifactStoragePort {
  uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
    type: ArtifactType,
    credentials: AWSCredentials
  ): Promise<ArtifactMetadata>;
  
  getFileMetadata(
    key: string,
    credentials: AWSCredentials
  ): Promise<ArtifactMetadata | null>;
  
  generateSignedUrl(
    key: string,
    expiresIn: number,
    credentials: AWSCredentials
  ): Promise<string>;
  
  deleteFile(
    key: string,
    credentials: AWSCredentials
  ): Promise<void>;
}

export interface AgentDeployPort {
  createAgent(
    config: BedrockAgentConfig,
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  updateAgent(
    agentId: string,
    config: Partial<BedrockAgentConfig>,
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  prepareAgent(
    agentId: string,
    credentials: AWSCredentials
  ): Promise<void>;
  
  createAlias(
    agentId: string,
    aliasName: string,
    credentials: AWSCredentials
  ): Promise<string>;
  
  getAgentStatus(
    agentId: string,
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  deleteAgent(
    agentId: string,
    credentials: AWSCredentials
  ): Promise<void>;
}

export interface McpDeployPort {
  deployToECS(
    config: McpServerConfig,
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  deployToLambda(
    config: LambdaConfig,
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  getServiceStatus(
    serviceName: string,
    target: 'ecs' | 'lambda',
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  updateService(
    serviceName: string,
    config: Partial<McpServerConfig | LambdaConfig>,
    target: 'ecs' | 'lambda',
    credentials: AWSCredentials
  ): Promise<DeploymentResult>;
  
  deleteService(
    serviceName: string,
    target: 'ecs' | 'lambda',
    credentials: AWSCredentials
  ): Promise<void>;
}

export interface InvocationPort {
  invokeBedrockAgent(
    request: BedrockInvokeRequest,
    credentials: AWSCredentials
  ): Promise<BedrockInvokeResponse>;
  
  invokeBedrockModel(
    modelId: string,
    input: string,
    credentials: AWSCredentials
  ): Promise<string>;
  
  streamBedrockAgent(
    request: BedrockInvokeRequest,
    credentials: AWSCredentials,
    onChunk: (chunk: string) => void
  ): Promise<BedrockInvokeResponse>;
}

export interface EventEmitterPort {
  emit(event: WebSocketEvent): void;
  emitToClient(clientId: string, event: WebSocketEvent): void;
  broadcast(event: WebSocketEvent): void;
  emitDeploymentProgress(deploymentId: string, step: string, progress: number, message?: string): void;
  emitDeploymentComplete(deploymentId: string, status: string, resourceId?: string): void;
  emitDeploymentError(deploymentId: string, error: string, details?: any): void;
}

export interface HealthCheckPort {
  checkAWSConnectivity(credentials: AWSCredentials): Promise<boolean>;
  checkS3Access(credentials: AWSCredentials): Promise<boolean>;
  checkBedrockAccess(credentials: AWSCredentials): Promise<boolean>;
}