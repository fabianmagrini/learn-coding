import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PRGovernancePage } from './pr-governance.js';

describe('PRGovernancePage', () => {
  it('renders the page header', () => {
    render(<PRGovernancePage />);
    expect(screen.getByText('PR Governance')).toBeDefined();
  });

  it('renders a row for each mock PR', () => {
    render(<PRGovernancePage />);
    expect(screen.getByText('feat: Add rate limiting to payments API')).toBeDefined();
    expect(screen.getByText('chore: Update npm dependencies')).toBeDefined();
  });

  it('shows risk tier badges', () => {
    render(<PRGovernancePage />);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getByText('LOW')).toBeDefined();
    expect(screen.getByText('MEDIUM')).toBeDefined();
  });

  it('renders AI badge for AI-generated PRs', () => {
    render(<PRGovernancePage />);
    const aiBadges = screen.getAllByText('AI');
    expect(aiBadges.length).toBeGreaterThan(0);
  });

  it('shows policy passed/failed status', () => {
    render(<PRGovernancePage />);
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
  });

  it('shows approval status badges', () => {
    render(<PRGovernancePage />);
    expect(screen.getAllByText('pending').length).toBeGreaterThan(0);
    expect(screen.getByText('approved')).toBeDefined();
  });

  it('displays column headers', () => {
    render(<PRGovernancePage />);
    expect(screen.getByText('Pull Request')).toBeDefined();
    expect(screen.getByText('Risk Tier')).toBeDefined();
    expect(screen.getByText('Policy')).toBeDefined();
    expect(screen.getByText('Approval')).toBeDefined();
  });

  it('shows total and open PR count in subtitle', () => {
    render(<PRGovernancePage />);
    // 4 total, 3 open from fixtures
    expect(screen.getByText(/4 total/)).toBeDefined();
    expect(screen.getByText(/3 open/)).toBeDefined();
  });
});
