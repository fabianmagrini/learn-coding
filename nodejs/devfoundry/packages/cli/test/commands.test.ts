/**
 * Unit tests for CLI commands.
 *
 * Commands are tested by mocking the API client and verifying the correct
 * API methods are called with the expected arguments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock client factory
function makeMockClient() {
  return {
    runAgent: vi.fn(),
    getAgentRun: vi.fn(),
    listAgentRuns: vi.fn(),
    checkPolicy: vi.fn(),
    getDashboardMetrics: vi.fn(),
  };
}

// mockClient is reassigned in beforeEach; the vi.fn() closure captures the variable
// so getApiClient always returns the current value.
let mockClient = makeMockClient();

vi.mock('../src/lib/api-client.js', () => ({
  getApiClient: vi.fn(() => mockClient),
  DevFoundryApiClient: vi.fn(),
}));

// Silence output helpers during command tests
vi.mock('../src/lib/output.js', () => ({
  header: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  table: vi.fn(),
  statusBadge: vi.fn((s: string) => s),
  riskBadge: vi.fn((r: string) => r),
}));

beforeEach(() => {
  mockClient = makeMockClient();
});

// ── implement command ──────────────────────────────────────────────────────────

describe('implement command', () => {
  it('calls runAgent with agentType=feature', async () => {
    mockClient.runAgent.mockResolvedValue({
      id: 'run-1',
      agentType: 'feature',
      status: 'completed',
      durationMs: 1000,
      summary: 'Done',
    });

    const Implement = (await import('../src/commands/implement/index.js')).default;
    await Implement.run(['--description', 'add auth', '--repo', 'myapp']);

    expect(mockClient.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: 'feature', task: 'add auth', repo: 'myapp' }),
    );
  });

  it('passes context flag when provided', async () => {
    mockClient.runAgent.mockResolvedValue({ id: 'run-1', status: 'completed', durationMs: 0 });

    const Implement = (await import('../src/commands/implement/index.js')).default;
    await Implement.run(['-d', 'add auth', '-r', 'myapp', '-c', 'some context']);

    expect(mockClient.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'some context' }),
    );
  });

  it('exits 1 when agent run fails', async () => {
    mockClient.runAgent.mockResolvedValue({ id: 'run-1', status: 'failed', error: 'timeout' });

    const Implement = (await import('../src/commands/implement/index.js')).default;
    await expect(Implement.run(['-d', 'add auth', '-r', 'myapp'])).rejects.toThrow();
  });

  it('exits 1 when API call throws', async () => {
    mockClient.runAgent.mockRejectedValue(new Error('connection refused'));

    const Implement = (await import('../src/commands/implement/index.js')).default;
    await expect(Implement.run(['-d', 'add auth', '-r', 'myapp'])).rejects.toThrow();
  });
});

// ── agent run command ──────────────────────────────────────────────────────────

describe('agent run command', () => {
  it('calls runAgent with specified agent type', async () => {
    mockClient.runAgent.mockResolvedValue({ id: 'run-1', agentType: 'refactor', status: 'completed', durationMs: 500 });

    const AgentRun = (await import('../src/commands/agent/run.js')).default;
    await AgentRun.run(['--task', 'refactor user service', '--repo', 'myapp', '--agent', 'refactor']);

    expect(mockClient.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: 'refactor', task: 'refactor user service', repo: 'myapp' }),
    );
  });

  it('defaults to feature agent when --agent is not specified', async () => {
    mockClient.runAgent.mockResolvedValue({ id: 'run-1', agentType: 'feature', status: 'completed', durationMs: 0 });

    const AgentRun = (await import('../src/commands/agent/run.js')).default;
    await AgentRun.run(['--task', 'do something', '--repo', 'myapp']);

    expect(mockClient.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: 'feature' }),
    );
  });

  it('exits 1 on failed agent run', async () => {
    mockClient.runAgent.mockResolvedValue({ id: 'run-1', status: 'failed', error: 'boom' });

    const AgentRun = (await import('../src/commands/agent/run.js')).default;
    await expect(AgentRun.run(['--task', 'task', '--repo', 'myapp'])).rejects.toThrow();
  });
});

// ── policy check command ───────────────────────────────────────────────────────

describe('policy check command', () => {
  it('calls checkPolicy with the PR id', async () => {
    mockClient.checkPolicy.mockResolvedValue({
      passed: true,
      violations: [],
      tier: 'low',
      action: 'auto-merge',
    });

    const PolicyCheck = (await import('../src/commands/policy/check.js')).default;
    await PolicyCheck.run(['--pr', '142']);

    expect(mockClient.checkPolicy).toHaveBeenCalledWith('142');
  });

  it('exits 1 when policy check fails', async () => {
    mockClient.checkPolicy.mockResolvedValue({
      passed: false,
      violations: [{ rule: 'no-ui-import', message: 'violation', severity: 'error' }],
      tier: 'high',
      action: 'architecture-review',
    });

    const PolicyCheck = (await import('../src/commands/policy/check.js')).default;
    await expect(PolicyCheck.run(['--pr', '142'])).rejects.toThrow();
  });

  it('exits 1 when API throws', async () => {
    mockClient.checkPolicy.mockRejectedValue(new Error('not found'));

    const PolicyCheck = (await import('../src/commands/policy/check.js')).default;
    await expect(PolicyCheck.run(['--pr', '999'])).rejects.toThrow();
  });
});

// ── status command ─────────────────────────────────────────────────────────────

describe('status command', () => {
  it('calls getDashboardMetrics', async () => {
    mockClient.getDashboardMetrics.mockResolvedValue({
      aiPrAcceptanceRate: 82,
      deployFrequency: 4.2,
      leadTimeHours: 6.5,
      activeAgents: 6,
      architectureViolations: 3,
      totalAgentRuns: 147,
    });

    const Status = (await import('../src/commands/status.js')).default;
    await Status.run([]);

    expect(mockClient.getDashboardMetrics).toHaveBeenCalled();
  });

  it('exits 1 when API is unreachable', async () => {
    mockClient.getDashboardMetrics.mockRejectedValue(new Error('ECONNREFUSED'));

    const Status = (await import('../src/commands/status.js')).default;
    await expect(Status.run([])).rejects.toThrow();
  });
});
