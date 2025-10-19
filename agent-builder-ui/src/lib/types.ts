export type Mode = 'dummy' | 'real';
export type Status = 'draft' | 'deploying' | 'deployed' | 'failed';

export type NodeKind = 'input'|'output'|'agent'|'agentFlow'|'tool'|'condition'|'human';

export interface Position { x: number; y: number }

export interface RFNode<T=any> {
  id: string;
  kind: NodeKind;
  position: Position;
  data: T;
  status?: Status; // UI-only status badge
}

export interface RFEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string;
  color?: 'default'|'green'|'red';
}

export interface FlowGraph {
  id: string;
  name: string; // ≤ 25 chars
  description?: string;
  llmName: string; // custom LLM Name alias (from Settings)
  nodes: RFNode[];
  edges: RFEdge[];
  status: Status; // flow-level
  createdAt: string;
  updatedAt: string;
}

export interface AgentNodeData {
  agentId?: string;
  name: string;
  description?: string;
  llmName?: string;
  env: Record<string,string>;
  attachedToolIds?: string[]; // top/bottom connections
}

export interface AgentFlowNodeData { 
  flowId: string; 
  name: string; 
  env?: Record<string,string>; 
}

export interface ToolNodeData { 
  toolId: string; 
  name: string; 
  env?: Record<string,string>; 
}

export type ScriptType = 'python'|'javascript';

export interface ConditionNodeData {
  name: string;
  description?: string;
  scriptType: ScriptType; // default 'python'
  script: string; // source code
}

export interface HumanNodeData {
  name: string;
  ask: string; // the question shown to user
  promptConfig: string; // text with $input
  inputValidator: string; // validation code referencing $input
}

export interface LlmConfig {
  id: string;
  name: string; // custom alias exposed in UI
  model: string; // provider/model id
  apiKeyMasked?: string;
  createdAt: string;
}

export interface ResourceUpload {
  id: string;
  name: string;
  filename: string;
  size: number;
  kind: 'agent'|'tool'|'unknown'; // best-effort classification
  createdAt: string;
}

export interface ToolOrAgentCard {
  id: string;
  kind: 'agent'|'tool';
  name: string;
  description?: string;
  status?: Status;
}

// Input/Output node data
export interface InputNodeData {
  name: string;
}

export interface OutputNodeData {
  name: string;
}

// Test execution types
export interface TestStep {
  nodeId: string;
  nodeName: string;
  status: 'running' | 'completed' | 'failed';
  input?: string;
  output?: string;
  error?: string;
  duration: number;
  startTime: string;
  endTime?: string;
}

export interface TestRun {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed';
  input: string;
  output?: string;
  error?: string;
  steps: TestStep[];
  startTime: string;
  endTime?: string;
}