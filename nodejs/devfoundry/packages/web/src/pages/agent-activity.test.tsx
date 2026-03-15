import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AgentActivityPage } from './agent-activity.js';

describe('AgentActivityPage', () => {
  it('renders the page header', () => {
    render(<AgentActivityPage />);
    expect(screen.getByText('AI Agent Activity')).toBeDefined();
  });

  it('renders a row for each mock agent run', () => {
    render(<AgentActivityPage />);
    // fixture has 6 runs; all tasks should appear
    expect(screen.getByText('Implement rate limiting on payments API')).toBeDefined();
    expect(screen.getByText('Generate tests for UserService')).toBeDefined();
  });

  it('shows the total run count in the card header', () => {
    render(<AgentActivityPage />);
    expect(screen.getByText(/6 runs/)).toBeDefined();
  });

  it('renders status badges for each run', () => {
    render(<AgentActivityPage />);
    // at least one completed badge
    const badges = screen.getAllByText('completed');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('opens the detail panel when a row is clicked', () => {
    render(<AgentActivityPage />);
    const firstRow = screen.getByText('Implement rate limiting on payments API').closest('tr');
    fireEvent.click(firstRow!);
    // Detail panel shows the close button
    expect(screen.getByRole('button', { name: '✕' })).toBeDefined();
  });

  it('closes the detail panel when the close button is clicked', () => {
    render(<AgentActivityPage />);
    const firstRow = screen.getByText('Implement rate limiting on payments API').closest('tr');
    fireEvent.click(firstRow!);
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByRole('button', { name: '✕' })).toBeNull();
  });

  it('toggles the detail panel off when the same row is clicked again', () => {
    render(<AgentActivityPage />);
    const firstRow = screen.getByText('Implement rate limiting on payments API').closest('tr');
    fireEvent.click(firstRow!);
    fireEvent.click(firstRow!);
    expect(screen.queryByRole('button', { name: '✕' })).toBeNull();
  });
});
