export type DeploymentTarget = 'ecs' | 'lambda';
export type DeploymentStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ArtifactType = 'mcp-tool' | 'agent-core' | 'knowledge-base' | 'other';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region?: string;
}

export interface ArtifactMetadata {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  type: ArtifactType;
  uploadedAt: string;
  etag?: string;
  url?: string;
}

export interface DeploymentRequest {
  id: string;
  name: string;
  description?: string;
  artifactKey?: string;
  target: DeploymentTarget;
  config: Record<string, any>;
}

export interface DeploymentResult {
  id: string;
  status: DeploymentStatus;
  target: DeploymentTarget;
  resourceId?: string;
  endpoint?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface BedrockAgentConfig {
  agentName: string;
  description?: string;
  instruction: string;
  foundationModel: string;
  agentResourceRoleArn: string;
  knowledgeBases?: string[];
  actionGroups?: BedrockActionGroup[];
}

export interface BedrockActionGroup {
  actionGroupName: string;
  description?: string;
  actionGroupExecutor?: {
    lambda?: string;
  };
  apiSchema?: {
    s3?: {
      s3BucketName: string;
      s3ObjectKey: string;
    };
  };
}

export interface BedrockInvokeRequest {
  agentId: string;
  agentAliasId: string;
  sessionId: string;
  inputText: string;
  enableTrace?: boolean;
}

export interface BedrockInvokeResponse {
  completion: string;
  sessionId: string;
  trace?: any[];
}

export interface McpServerConfig {
  name: string;
  image: string;
  port: number;
  environment?: Record<string, string>;
  memory?: number;
  cpu?: number;
  replicas?: number;
}

export interface LambdaConfig {
  functionName: string;
  runtime: string;
  handler: string;
  code: {
    s3Bucket: string;
    s3Key: string;
  };
  environment?: Record<string, string>;
  memory?: number;
  timeout?: number;
  role: string;
}

export interface WebSocketEvent {
  type: string;
  id: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}