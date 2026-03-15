import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArchitectureHealthPage } from './architecture-health.js';

// Recharts requires ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

describe('ArchitectureHealthPage', () => {
  it('renders the page header', () => {
    render(<ArchitectureHealthPage />);
    expect(screen.getByText('Architecture Health')).toBeDefined();
  });

  it('shows the total violations count', () => {
    render(<ArchitectureHealthPage />);
    expect(screen.getByText('Total Violations')).toBeDefined();
    // fixture has 3 violations
    expect(screen.getByText('3')).toBeDefined();
  });

  it('shows critical errors and warnings counts', () => {
    render(<ArchitectureHealthPage />);
    expect(screen.getByText('Critical (Errors)')).toBeDefined();
    expect(screen.getByText('Warnings')).toBeDefined();
  });

  it('renders the violations trend chart card', () => {
    render(<ArchitectureHealthPage />);
    expect(screen.getByText('Violations Trend')).toBeDefined();
  });

  it('renders the architecture rules list', () => {
    render(<ArchitectureHealthPage />);
    expect(screen.getByText('Architecture Rules')).toBeDefined();
    expect(screen.getByText('no-service-to-ui-import')).toBeDefined();
    expect(screen.getByText('no-direct-db-access-from-api')).toBeDefined();
  });

  it('shows enabled/disabled state for rules', () => {
    render(<ArchitectureHealthPage />);
    const enabledLabels = screen.getAllByText('enabled');
    expect(enabledLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('disabled')).toBeDefined();
  });

  it('renders the recent violations list', () => {
    render(<ArchitectureHealthPage />);
    expect(screen.getByText('Recent Violations')).toBeDefined();
    // violation sources from fixtures
    expect(screen.getByText('services/user.ts')).toBeDefined();
  });
});
