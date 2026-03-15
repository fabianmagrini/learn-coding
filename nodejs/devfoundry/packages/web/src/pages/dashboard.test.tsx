import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardPage } from './dashboard.js';

// Recharts uses ResizeObserver which is unavailable in jsdom
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

describe('DashboardPage', () => {
  it('renders the page header', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Engineering Dashboard')).toBeDefined();
  });

  it('renders all four KPI cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('AI PR Acceptance Rate')).toBeDefined();
    expect(screen.getByText('Deploy Frequency')).toBeDefined();
    expect(screen.getByText('Lead Time')).toBeDefined();
    expect(screen.getByText('Active Agents')).toBeDefined();
  });

  it('renders the PR volume chart card', () => {
    render(<DashboardPage />);
    expect(screen.getByText('AI vs Human PR Volume')).toBeDefined();
  });

  it('renders the agent activity feed card', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Agent Activity Feed')).toBeDefined();
  });

  it('renders the policy violations card', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Policy Violations')).toBeDefined();
  });

  it('shows the KPI metric values from fixtures', () => {
    render(<DashboardPage />);
    // aiPrAcceptanceRate: 82
    expect(screen.getByText('82%')).toBeDefined();
    // activeAgents: 6
    expect(screen.getByText('6')).toBeDefined();
  });
});
