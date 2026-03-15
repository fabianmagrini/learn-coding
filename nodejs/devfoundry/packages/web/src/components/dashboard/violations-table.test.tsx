import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ViolationsTable } from './violations-table.js';
import type { PolicyViolation } from '../../types/index.js';

const makeViolation = (overrides: Partial<PolicyViolation> = {}): PolicyViolation => ({
  id: 'v-1',
  rule: 'no-service-to-ui-import',
  message: 'Service cannot import UI module',
  severity: 'error',
  file: 'services/user.ts',
  repo: 'acme/myapp',
  createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  ...overrides,
});

describe('ViolationsTable', () => {
  it('shows empty state when there are no violations', () => {
    render(<ViolationsTable violations={[]} />);
    expect(screen.getByText('No policy violations')).toBeDefined();
  });

  it('renders a row for each violation', () => {
    const violations = [makeViolation(), makeViolation({ id: 'v-2', rule: 'other-rule' })];
    render(<ViolationsTable violations={violations} />);
    expect(screen.getByText('no-service-to-ui-import')).toBeDefined();
    expect(screen.getByText('other-rule')).toBeDefined();
  });

  it('shows file path in context column', () => {
    render(<ViolationsTable violations={[makeViolation()]} />);
    expect(screen.getByText('services/user.ts')).toBeDefined();
  });

  it('falls back to message when file is absent', () => {
    const violation = makeViolation({ file: undefined });
    render(<ViolationsTable violations={[violation]} />);
    expect(screen.getByText(violation.message)).toBeDefined();
  });

  it('shows repo name', () => {
    render(<ViolationsTable violations={[makeViolation()]} />);
    expect(screen.getByText('acme/myapp')).toBeDefined();
  });

  it('renders error severity badge for error violations', () => {
    render(<ViolationsTable violations={[makeViolation({ severity: 'error' })]} />);
    expect(screen.getByText('error')).toBeDefined();
  });

  it('renders warning severity badge for warning violations', () => {
    render(<ViolationsTable violations={[makeViolation({ severity: 'warning' })]} />);
    expect(screen.getByText('warning')).toBeDefined();
  });

  it('renders column headers', () => {
    render(<ViolationsTable violations={[makeViolation()]} />);
    expect(screen.getByText('Severity')).toBeDefined();
    expect(screen.getByText('Rule')).toBeDefined();
    expect(screen.getByText(/File/)).toBeDefined();
    expect(screen.getByText('Repo')).toBeDefined();
    expect(screen.getByText('Time')).toBeDefined();
  });
});
