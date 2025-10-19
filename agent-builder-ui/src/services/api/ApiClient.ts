import type { FlowGraph, LlmConfig, ResourceUpload, ToolOrAgentCard, TestRun } from '@/lib/types';

export interface ApiClient {
  // Flows
  listFlows(): Promise<FlowGraph[]>;
  getFlow(id: string): Promise<FlowGraph>;
  createFlow(input: {name: string; description?: string; llmName: string;}): Promise<FlowGraph>;
  saveFlow(graph: FlowGraph): Promise<void>;
  publishFlow(id: string): Promise<void>; // triggers deploy
  testFlow(id: string, payload: string): Promise<TestRun>;

  // LLMs
  listLlms(): Promise<LlmConfig[]>;
  createLlm(input: {name: string; model: string; apiKey: string}): Promise<LlmConfig>;
  testLlm(input: {model: string; apiKey: string}): Promise<{ ok: boolean; message?: string }>;

  // Resources
  uploadResource(input: {name: string; file: File}): Promise<ResourceUpload>;

  // Catalog & Marketplace (simplified)
  listCatalogAgents(): Promise<ToolOrAgentCard[]>;
  listCatalogTools(): Promise<ToolOrAgentCard[]>;
  listMarketAgents(): Promise<ToolOrAgentCard[]>;
  listMarketTools(): Promise<ToolOrAgentCard[]>;
  addMarketItemToCatalog(id: string, kind: 'agent'|'tool'): Promise<void>;
}