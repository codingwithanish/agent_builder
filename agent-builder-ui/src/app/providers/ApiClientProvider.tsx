import React, { createContext, useContext, useEffect } from 'react';
import type { ApiClient } from '@/services/api/ApiClient';
import { useFlowStore } from '@/state/flowStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useMarketStore } from '@/state/marketStore';
import { useResourceStore } from '@/state/resourceStore';

interface ApiClientContextValue {
  client: ApiClient;
}

const ApiClientContext = createContext<ApiClientContextValue | null>(null);

interface ApiClientProviderProps {
  client: ApiClient;
  children: React.ReactNode;
}

export function ApiClientProvider({ client, children }: ApiClientProviderProps) {
  const setFlowApiClient = useFlowStore(state => state.setApiClient);
  const setSettingsApiClient = useSettingsStore(state => state.setApiClient);
  const setMarketApiClient = useMarketStore(state => state.setApiClient);
  const setResourceApiClient = useResourceStore(state => state.setApiClient);

  useEffect(() => {
    // Initialize all stores with the API client
    setFlowApiClient(client);
    setSettingsApiClient(client);
    setMarketApiClient(client);
    setResourceApiClient(client);
  }, [client, setFlowApiClient, setSettingsApiClient, setMarketApiClient, setResourceApiClient]);

  return (
    <ApiClientContext.Provider value={{ client }}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient() {
  const context = useContext(ApiClientContext);
  if (!context) {
    throw new Error('useApiClient must be used within ApiClientProvider');
  }
  return context.client;
}