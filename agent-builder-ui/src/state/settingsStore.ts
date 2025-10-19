import { create } from 'zustand';
import type { LlmConfig } from '@/lib/types';
import type { ApiClient } from '@/services/api/ApiClient';

interface SettingsState {
  llms: LlmConfig[];
  isLoading: boolean;
  error: string | null;

  // Modal states
  isCreateLlmModalOpen: boolean;
  isTestingLlm: boolean;
  testResult: { ok: boolean; message?: string } | null;

  // Actions
  setApiClient: (client: ApiClient) => void;
  loadLlms: () => Promise<void>;
  createLlm: (input: {name: string; model: string; apiKey: string}) => Promise<void>;
  testLlm: (input: {model: string; apiKey: string}) => Promise<{ ok: boolean; message?: string }>;
  openCreateLlmModal: () => void;
  closeCreateLlmModal: () => void;
  clearTestResult: () => void;
}

let apiClient: ApiClient;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  llms: [],
  isLoading: false,
  error: null,
  isCreateLlmModalOpen: false,
  isTestingLlm: false,
  testResult: null,

  setApiClient: (client: ApiClient) => {
    apiClient = client;
  },

  loadLlms: async () => {
    if (!apiClient) return;
    
    set({ isLoading: true, error: null });
    try {
      const llms = await apiClient.listLlms();
      set({ llms, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load LLMs', isLoading: false });
    }
  },

  createLlm: async (input) => {
    if (!apiClient) throw new Error('API client not initialized');
    
    set({ isLoading: true, error: null });
    try {
      const llm = await apiClient.createLlm(input);
      set(state => ({ 
        llms: [...state.llms, llm], 
        isLoading: false,
        isCreateLlmModalOpen: false 
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create LLM', isLoading: false });
      throw error;
    }
  },

  testLlm: async (input) => {
    if (!apiClient) throw new Error('API client not initialized');
    
    set({ isTestingLlm: true, testResult: null });
    try {
      const result = await apiClient.testLlm(input);
      set({ testResult: result, isTestingLlm: false });
      return result;
    } catch (error) {
      const errorResult = { 
        ok: false, 
        message: error instanceof Error ? error.message : 'Test failed' 
      };
      set({ testResult: errorResult, isTestingLlm: false });
      return errorResult;
    }
  },

  openCreateLlmModal: () => set({ isCreateLlmModalOpen: true, testResult: null }),
  
  closeCreateLlmModal: () => set({ isCreateLlmModalOpen: false, testResult: null }),
  
  clearTestResult: () => set({ testResult: null })
}));