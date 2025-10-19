import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApiClientProvider } from '@/app/providers/ApiClientProvider';
import { DummyApiClient } from '@/services/api/DummyApiClient';
import { RealApiClient } from '@/services/api/RealApiClient';
import type { Mode } from '@/lib/types';
import App from '@/app/App';
import '@/styles/index.css';

const mode = (import.meta.env.VITE_APP_MODE as Mode) || 'dummy';
const apiClient = mode === 'real' ? new RealApiClient() : new DummyApiClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ApiClientProvider client={apiClient}>
        <App />
      </ApiClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);