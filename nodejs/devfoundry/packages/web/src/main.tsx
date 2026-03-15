/**
 * DevFoundry Web Dashboard — application entry point.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/app-layout.js';
import { DashboardPage } from './pages/dashboard.js';
import { AgentActivityPage } from './pages/agent-activity.js';
import { PRGovernancePage } from './pages/pr-governance.js';
import { ArchitectureHealthPage } from './pages/architecture-health.js';
import { PolicyConfigPage } from './pages/policy-config.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentActivityPage />} />
            <Route path="/prs" element={<PRGovernancePage />} />
            <Route path="/architecture" element={<ArchitectureHealthPage />} />
            <Route path="/policies" element={<PolicyConfigPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
