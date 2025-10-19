import type { ApiClient } from './ApiClient';
import type { FlowGraph, LlmConfig, ResourceUpload, ToolOrAgentCard } from '@/lib/types';

export class RealApiClient implements ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async listFlows(): Promise<FlowGraph[]> {
    return this.request<FlowGraph[]>('/flows');
  }

  async getFlow(id: string): Promise<FlowGraph> {
    return this.request<FlowGraph>(`/flows/${id}`);
  }

  async createFlow(input: {name: string; description?: string; llmName: string;}): Promise<FlowGraph> {
    return this.request<FlowGraph>('/flows', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async saveFlow(graph: FlowGraph): Promise<void> {
    await this.request(`/flows/${graph.id}`, {
      method: 'PUT',
      body: JSON.stringify(graph),
    });
  }

  async publishFlow(id: string): Promise<void> {
    await this.request(`/flows/${id}/deploy`, {
      method: 'POST',
    });
  }

  async testFlow(id: string, payload: unknown): Promise<{ output: unknown }> {
    return this.request<{ output: unknown }>(`/flows/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
  }

  async listLlms(): Promise<LlmConfig[]> {
    return this.request<LlmConfig[]>('/llms');
  }

  async createLlm(input: {name: string; model: string; apiKey: string}): Promise<LlmConfig> {
    return this.request<LlmConfig>('/llms', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async testLlm(input: {model: string; apiKey: string}): Promise<{ ok: boolean; message?: string }> {
    return this.request<{ ok: boolean; message?: string }>('/llm/test', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async uploadResource(input: {name: string; file: File}): Promise<ResourceUpload> {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('file', input.file);

    const response = await fetch(`${this.baseUrl}/resources/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async listCatalogAgents(): Promise<ToolOrAgentCard[]> {
    return this.request<ToolOrAgentCard[]>('/catalog/agents');
  }

  async listCatalogTools(): Promise<ToolOrAgentCard[]> {
    return this.request<ToolOrAgentCard[]>('/catalog/tools');
  }

  async listMarketAgents(): Promise<ToolOrAgentCard[]> {
    return this.request<ToolOrAgentCard[]>('/market/agents');
  }

  async listMarketTools(): Promise<ToolOrAgentCard[]> {
    return this.request<ToolOrAgentCard[]>('/market/tools');
  }

  async addMarketItemToCatalog(id: string, kind: 'agent'|'tool'): Promise<void> {
    await this.request(`/market/${id}/add`, {
      method: 'POST',
      body: JSON.stringify({ kind }),
    });
  }
}