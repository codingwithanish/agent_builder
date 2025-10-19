import { FlowStatus, RFNode, RFEdge } from '@/domain/types';

export interface Flow {
  id: string;
  name: string;
  description?: string;
  llmName: string;
  nodes: RFNode[];
  edges: RFEdge[];
  status: FlowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowInput {
  name: string;
  description?: string;
  llmName: string;
}

export interface UpdateFlowInput {
  name?: string;
  description?: string;
  llmName?: string;
  nodes?: RFNode[];
  edges?: RFEdge[];
}