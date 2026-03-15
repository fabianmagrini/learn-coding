import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PolicyConfigPage } from './policy-config.js';

describe('PolicyConfigPage', () => {
  it('renders the page header', () => {
    render(<PolicyConfigPage />);
    expect(screen.getByText('Policy & Risk Config')).toBeDefined();
  });

  it('renders the risk tier editor with default config', () => {
    render(<PolicyConfigPage />);
    expect(screen.getByText('Risk Tier Rules')).toBeDefined();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDefined();
    expect((textarea as HTMLTextAreaElement).value).toContain('riskTierRules');
  });

  it('renders the architecture rules section', () => {
    render(<PolicyConfigPage />);
    expect(screen.getByText('Architecture Rules')).toBeDefined();
    expect(screen.getByText(/services\/\*\*/)).toBeDefined();
    expect(screen.getByText(/cannot import/)).toBeDefined();
  });

  it('shows active/inactive status for architecture rules', () => {
    render(<PolicyConfigPage />);
    const activeLabels = screen.getAllByText('active');
    expect(activeLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('inactive')).toBeDefined();
  });

  it('renders the approval workflows section', () => {
    render(<PolicyConfigPage />);
    expect(screen.getByText('Approval Workflows')).toBeDefined();
    expect(screen.getByText('HIGH')).toBeDefined();
    expect(screen.getByText('MEDIUM')).toBeDefined();
    expect(screen.getByText('LOW')).toBeDefined();
  });

  it('shows approval actions for each tier', () => {
    render(<PolicyConfigPage />);
    expect(screen.getByText('Architecture review required')).toBeDefined();
    expect(screen.getByText('Team lead review required')).toBeDefined();
    expect(screen.getByText('Auto-merge')).toBeDefined();
  });

  it('saves valid JSON and shows saved state', async () => {
    render(<PolicyConfigPage />);
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);
    expect(screen.getByText('✓ Saved')).toBeDefined();
  });

  it('shows JSON parse error for invalid config', () => {
    render(<PolicyConfigPage />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'not valid json{' } });
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);
    expect(screen.getByText(/JSON Error/)).toBeDefined();
  });

  it('clears parse error when user edits after a failed save', () => {
    render(<PolicyConfigPage />);
    const textarea = screen.getByRole('textbox');
    // Trigger error
    fireEvent.change(textarea, { target: { value: 'bad json' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/JSON Error/)).toBeDefined();
    // Edit again — error should clear
    fireEvent.change(textarea, { target: { value: '{}' } });
    expect(screen.queryByText(/JSON Error/)).toBeNull();
  });

  it('renders the Add Rule button', () => {
    render(<PolicyConfigPage />);
    expect(screen.getByText('+ Add Rule')).toBeDefined();
  });
});
