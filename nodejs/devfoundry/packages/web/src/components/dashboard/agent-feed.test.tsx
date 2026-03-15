import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentActivityFeed } from './agent-feed.js';
import { mockAgentRuns } from '../../mocks/fixtures.js';

describe('AgentActivityFeed', () => {
  it('renders agent runs', () => {
    render(<AgentActivityFeed runs={mockAgentRuns.slice(0, 3)} />);
    expect(screen.getByText('FeatureAgent')).toBeInTheDocument();
  });

  it('shows empty state when no runs', () => {
    render(<AgentActivityFeed runs={[]} />);
    expect(screen.getByText('No agent activity yet')).toBeInTheDocument();
  });

  it('respects maxItems limit', () => {
    render(<AgentActivityFeed runs={mockAgentRuns} maxItems={2} />);
    // Only 2 agent names should appear
    const featureAgents = screen.getAllByText(/Agent/);
    expect(featureAgents.length).toBeLessThanOrEqual(2);
  });

  it('shows completed badge for completed runs', () => {
    const completedRuns = mockAgentRuns.filter((r) => r.status === 'completed');
    render(<AgentActivityFeed runs={completedRuns} />);
    const badges = screen.getAllByText('completed');
    expect(badges.length).toBeGreaterThan(0);
  });
});
