import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastContainer } from '@/components/common/Toast';
import { useFlowStore } from '@/state/flowStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useMarketStore } from '@/state/marketStore';
import { useToastStore } from '@/state/toastStore';

function App() {
  const loadFlows = useFlowStore(state => state.loadFlows);
  const loadLlms = useSettingsStore(state => state.loadLlms);
  const loadCatalogData = useMarketStore(state => state.loadCatalogData);
  const loadMarketData = useMarketStore(state => state.loadMarketData);
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    // Load initial data
    loadFlows();
    loadLlms();
    loadCatalogData();
    loadMarketData();
  }, [loadFlows, loadLlms, loadCatalogData, loadMarketData]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/:flowId?" element={<AppShell />} />
      </Routes>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorBoundary>
  );
}

export default App;