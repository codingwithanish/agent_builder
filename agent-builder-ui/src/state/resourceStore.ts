import { create } from 'zustand';
import type { ResourceUpload } from '@/lib/types';
import type { ApiClient } from '@/services/api/ApiClient';

interface ResourceState {
  resources: ResourceUpload[];
  isLoading: boolean;
  error: string | null;
  
  // Modal state
  isAddResourceModalOpen: boolean;
  isUploading: boolean;

  // Actions
  setApiClient: (client: ApiClient) => void;
  uploadResource: (input: {name: string; file: File}) => Promise<ResourceUpload>;
  openAddResourceModal: () => void;
  closeAddResourceModal: () => void;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

let apiClient: ApiClient;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.zip', '.json', '.yaml', '.yml', '.js', '.ts'];

export const useResourceStore = create<ResourceState>((set, get) => ({
  resources: [],
  isLoading: false,
  error: null,
  isAddResourceModalOpen: false,
  isUploading: false,

  setApiClient: (client: ApiClient) => {
    apiClient = client;
  },

  uploadResource: async (input) => {
    if (!apiClient) throw new Error('API client not initialized');
    
    set({ isUploading: true, error: null });
    try {
      const resource = await apiClient.uploadResource(input);
      set(state => ({ 
        resources: [...state.resources, resource], 
        isUploading: false,
        isAddResourceModalOpen: false 
      }));
      return resource;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to upload resource', isUploading: false });
      throw error;
    }
  },

  openAddResourceModal: () => set({ isAddResourceModalOpen: true, error: null }),
  
  closeAddResourceModal: () => set({ isAddResourceModalOpen: false, error: null }),

  validateFile: (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File exceeds 50MB limit' };
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return { 
        valid: false, 
        error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
      };
    }

    return { valid: true };
  }
}));