import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiCard } from './kpi-card.js';

describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="Deploy Frequency" value={4.2} />);
    expect(screen.getByText('Deploy Frequency')).toBeDefined();
    expect(screen.getByText('4.2')).toBeDefined();
  });

  it('renders unit when provided', () => {
    render(<KpiCard title="Deploy Frequency" value={4.2} unit="/day" />);
    expect(screen.getByText('/day')).toBeDefined();
  });

  it('omits unit when not provided', () => {
    const { container } = render(<KpiCard title="Active Agents" value={6} />);
    expect(container.querySelector('.text-sm.font-medium.text-gray-500')).toBeNull();
  });

  it('shows upward trend arrow for positive trend', () => {
    render(<KpiCard title="Rate" value={82} trend={4.2} />);
    expect(screen.getByText(/↑/)).toBeDefined();
  });

  it('shows downward trend arrow for negative trend', () => {
    render(<KpiCard title="Rate" value={82} trend={-1.5} />);
    expect(screen.getByText(/↓/)).toBeDefined();
  });

  it('shows neutral arrow for zero trend', () => {
    render(<KpiCard title="Rate" value={82} trend={0} />);
    expect(screen.getByText(/→/)).toBeDefined();
  });

  it('shows absolute value of trend', () => {
    render(<KpiCard title="Rate" value={82} trend={-3.7} />);
    expect(screen.getByText(/3\.7%/)).toBeDefined();
  });

  it('renders trendLabel when provided', () => {
    render(<KpiCard title="Rate" value={82} trend={2} trendLabel="vs last week" />);
    expect(screen.getByText('vs last week')).toBeDefined();
  });

  it('does not render trend section when trend is undefined', () => {
    const { container } = render(<KpiCard title="Agents" value={6} />);
    expect(container.querySelector('.mt-3')).toBeNull();
  });

  it('renders icon when provided', () => {
    render(<KpiCard title="Rate" value={82} icon={<span data-testid="icon">★</span>} />);
    expect(screen.getByTestId('icon')).toBeDefined();
  });
});
