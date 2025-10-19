import { create } from 'zustand';
import type { ToolOrAgentCard } from '@/lib/types';
import type { ApiClient } from '@/services/api/ApiClient';

interface MarketState {
  catalogAgents: ToolOrAgentCard[];
  catalogTools: ToolOrAgentCard[];
  marketAgents: ToolOrAgentCard[];
  marketTools: ToolOrAgentCard[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setApiClient: (client: ApiClient) => void;
  loadCatalogData: () => Promise<void>;
  loadMarketData: () => Promise<void>;
  addMarketItemToCatalog: (id: string, kind: 'agent' | 'tool') => Promise<void>;
}

let apiClient: ApiClient;

export const useMarketStore = create<MarketState>((set, get) => ({
  catalogAgents: [],
  catalogTools: [],
  marketAgents: [],
  marketTools: [],
  isLoading: false,
  error: null,

  setApiClient: (client: ApiClient) => {
    apiClient = client;
  },

  loadCatalogData: async () => {
    if (!apiClient) return;
    
    set({ isLoading: true, error: null });
    try {
      const [agents, tools] = await Promise.all([
        apiClient.listCatalogAgents(),
        apiClient.listCatalogTools()
      ]);
      set({ catalogAgents: agents, catalogTools: tools, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load catalog', isLoading: false });
    }
  },

  loadMarketData: async () => {
    if (!apiClient) return;
    
    set({ isLoading: true, error: null });
    try {
      const [agents, tools] = await Promise.all([
        apiClient.listMarketAgents(),
        apiClient.listMarketTools()
      ]);
      set({ marketAgents: agents, marketTools: tools, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load marketplace', isLoading: false });
    }
  },

  addMarketItemToCatalog: async (id: string, kind: 'agent' | 'tool') => {
    if (!apiClient) return;
    
    try {
      await apiClient.addMarketItemToCatalog(id, kind);
      
      // Refresh catalog data to show the new item
      await get().loadCatalogData();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add item to catalog' });
    }
  }
}));