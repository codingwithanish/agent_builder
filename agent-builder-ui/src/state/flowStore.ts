import { create } from 'zustand';
import type { FlowGraph, Status, RFNode, TestRun } from '@/lib/types';
import type { ApiClient } from '@/services/api/ApiClient';
import { useToastStore } from './toastStore';

interface FlowState {
  flows: FlowGraph[];
  activeFlowId: string | null;
  activeFlow: FlowGraph | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setApiClient: (client: ApiClient) => void;
  loadFlows: () => Promise<void>;
  createFlow: (input: {name: string; description?: string; llmName: string}) => Promise<FlowGraph>;
  openFlow: (id: string) => Promise<void>;
  saveActiveFlow: () => Promise<void>;
  updateActiveFlow: (updates: Partial<FlowGraph>) => void;
  updateNodeStatus: (nodeId: string, status: Status) => void;
  publishFlow: (id: string) => Promise<void>;
  testFlow: (id: string, payload: string) => Promise<TestRun>;
  clearActiveFlow: () => void;
}

let apiClient: ApiClient;

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  activeFlowId: null,
  activeFlow: null,
  isLoading: false,
  error: null,

  setApiClient: (client: ApiClient) => {
    apiClient = client;
  },

  loadFlows: async () => {
    if (!apiClient) return;
    
    set({ isLoading: true, error: null });
    try {
      const flows = await apiClient.listFlows();
      set({ flows, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load flows', isLoading: false });
    }
  },

  createFlow: async (input) => {
    if (!apiClient) throw new Error('API client not initialized');
    
    set({ isLoading: true, error: null });
    try {
      const flow = await apiClient.createFlow(input);
      set(state => ({ 
        flows: [...state.flows, flow], 
        activeFlow: flow,
        activeFlowId: flow.id,
        isLoading: false 
      }));
      return flow;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create flow', isLoading: false });
      throw error;
    }
  },

  openFlow: async (id: string) => {
    if (!apiClient) return;
    
    set({ isLoading: true, error: null });
    try {
      const flow = await apiClient.getFlow(id);
      set({ activeFlow: flow, activeFlowId: id, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load flow', isLoading: false });
    }
  },

  saveActiveFlow: async () => {
    const { activeFlow } = get();
    if (!apiClient || !activeFlow) return;
    
    try {
      await apiClient.saveFlow(activeFlow);
      set(state => ({
        flows: state.flows.map(f => f.id === activeFlow.id ? activeFlow : f)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save flow' });
      throw error;
    }
  },

  updateActiveFlow: (updates) => {
    set(state => ({
      activeFlow: state.activeFlow ? { ...state.activeFlow, ...updates } : null
    }));
  },

  updateNodeStatus: (nodeId: string, status: Status) => {
    set(state => {
      if (!state.activeFlow) return state;
      
      const updatedNodes = state.activeFlow.nodes.map(node => 
        node.id === nodeId ? { ...node, status } : node
      );
      
      return {
        activeFlow: {
          ...state.activeFlow,
          nodes: updatedNodes
        }
      };
    });
  },

  publishFlow: async (id: string) => {
    if (!apiClient) return;
    
    const { activeFlow } = get();
    if (!activeFlow || activeFlow.id !== id) return;

    set({ isLoading: true, error: null });

    try {
      // Start deployment simulation for dummy mode
      const nonIONodes = activeFlow.nodes.filter(n => n.kind !== 'input' && n.kind !== 'output');
      
      for (const node of nonIONodes) {
        get().updateNodeStatus(node.id, 'deploying');
        
        // Simulate deployment time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1200 + 400));
        
        // Occasionally simulate failure (10% chance)
        const shouldFail = Math.random() < 0.1;
        get().updateNodeStatus(node.id, shouldFail ? 'failed' : 'deployed');
      }

      await apiClient.publishFlow(id);
      
      // Update flow status
      get().updateActiveFlow({ status: 'deployed' });
      await get().saveActiveFlow();
      
      // Show success notification
      const { showSuccess } = useToastStore.getState();
      showSuccess('Flow Published', 'Your flow has been successfully deployed and is now ready for testing');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish flow';
      set({ error: errorMessage });
      
      // Show error notification
      const { showError } = useToastStore.getState();
      showError('Publish Failed', errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },

  testFlow: async (id: string, payload: string) => {
    if (!apiClient) throw new Error('API client not initialized');
    
    try {
      return await apiClient.testFlow(id, payload);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to test flow' });
      throw error;
    }
  },

  clearActiveFlow: () => {
    set({ activeFlow: null, activeFlowId: null });
  }
}));