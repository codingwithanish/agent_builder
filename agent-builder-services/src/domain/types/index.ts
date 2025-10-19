export type NodeStatus = 'draft' | 'deploying' | 'deployed' | 'failed';
export type FlowStatus = 'draft' | 'deploying' | 'deployed' | 'failed';
export type NodeKind = 'input' | 'output' | 'agent' | 'agentFlow' | 'tool' | 'condition' | 'human';
export type ResourceKind = 'agent' | 'tool' | 'unknown';
export type TestStatus = 'running' | 'completed' | 'failed';

export interface Position {
  x: number;
  y: number;
}

export interface RFEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  color?: string;
}

export interface BaseNodeData {
  name: string;
  description?: string;
}

export interface AgentNodeData extends BaseNodeData {
  agentId?: string;
  llmName?: string;
  env: Record<string, string>;
  attachedToolIds?: string[];
}

export interface ConditionNodeData extends BaseNodeData {
  scriptType: 'python' | 'javascript';
  script: string;
}

export interface HumanNodeData extends BaseNodeData {
  ask: string;
  promptConfig: string;
  inputValidator: string;
}

export interface RFNode<T = BaseNodeData> {
  id: string;
  kind: NodeKind;
  position: Position;
  data: T;
  status?: NodeStatus;
}

export interface TestStep {
  nodeId: string;
  nodeName: string;
  status: 'running' | 'completed' | 'failed';
  input: string;
  output?: string;
  error?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface TestRun {
  id: string;
  flowId: string;
  status: TestStatus;
  input: string;
  output?: string;
  error?: string;
  steps: TestStep[];
  startTime: string;
  endTime?: string;
}