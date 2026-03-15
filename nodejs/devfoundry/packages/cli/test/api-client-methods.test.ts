/**
 * Unit tests for DevFoundryApiClient methods.
 * Tests error handling and request construction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
    })),
  },
}));

beforeEach(() => {
  mockPost.mockReset();
  mockGet.mockReset();
});

async function makeClient(token?: string) {
  const { DevFoundryApiClient } = await import('../src/lib/api-client.js');
  return new DevFoundryApiClient('http://localhost:3000', token);
}

// ── runAgent ───────────────────────────────────────────────────────────────────

describe('DevFoundryApiClient.runAgent', () => {
  it('posts to /agents/runs and returns the response', async () => {
    const client = await makeClient();
    const agentRun = { id: 'run-1', agentType: 'feature', status: 'completed' };
    mockPost.mockResolvedValue({ data: agentRun });

    const result = await client.runAgent({ agentType: 'feature', task: 'add auth', repo: 'myapp' });

    expect(mockPost).toHaveBeenCalledWith('/agents/runs', {
      agentType: 'feature',
      task: 'add auth',
      repo: 'myapp',
    });
    expect(result).toEqual(agentRun);
  });

  it('throws a descriptive error on API error response', async () => {
    const client = await makeClient();
    const axiosError = Object.assign(new Error('Bad Request'), {
      response: { status: 400, data: { message: 'invalid agent type' } },
      request: {},
      config: { baseURL: 'http://localhost:3000' },
      isAxiosError: true,
    });
    mockPost.mockRejectedValue(axiosError);

    await expect(client.runAgent({ agentType: 'bad', task: 'task', repo: 'repo' })).rejects.toThrow(
      'API error: invalid agent type',
    );
  });

  it('throws a connection error when no response received', async () => {
    const client = await makeClient();
    const axiosError = Object.assign(new Error('Network Error'), {
      request: {},
      config: { baseURL: 'http://localhost:3000' },
      isAxiosError: true,
    });
    mockPost.mockRejectedValue(axiosError);

    await expect(client.runAgent({ agentType: 'feature', task: 'task', repo: 'repo' })).rejects.toThrow(
      'Cannot connect to DevFoundry API',
    );
  });
});

// ── getAgentRun ────────────────────────────────────────────────────────────────

describe('DevFoundryApiClient.getAgentRun', () => {
  it('gets from /agents/runs/:id', async () => {
    const client = await makeClient();
    const run = { id: 'run-1', status: 'completed' };
    mockGet.mockResolvedValue({ data: run });

    const result = await client.getAgentRun('run-1');

    expect(mockGet).toHaveBeenCalledWith('/agents/runs/run-1');
    expect(result).toEqual(run);
  });
});

// ── listAgentRuns ──────────────────────────────────────────────────────────────

describe('DevFoundryApiClient.listAgentRuns', () => {
  it('gets from /agents/runs', async () => {
    const client = await makeClient();
    const runs = [{ id: 'run-1' }, { id: 'run-2' }];
    mockGet.mockResolvedValue({ data: runs });

    const result = await client.listAgentRuns();

    expect(mockGet).toHaveBeenCalledWith('/agents/runs');
    expect(result).toEqual(runs);
  });
});

// ── checkPolicy ────────────────────────────────────────────────────────────────

describe('DevFoundryApiClient.checkPolicy', () => {
  it('gets from /prs/:prId/policy', async () => {
    const client = await makeClient();
    const policyResult = { passed: true, violations: [], tier: 'low', action: 'auto-merge' };
    mockGet.mockResolvedValue({ data: policyResult });

    const result = await client.checkPolicy('pr-42');

    expect(mockGet).toHaveBeenCalledWith('/prs/pr-42/policy');
    expect(result).toEqual(policyResult);
  });
});

// ── getDashboardMetrics ────────────────────────────────────────────────────────

describe('DevFoundryApiClient.getDashboardMetrics', () => {
  it('gets from /metrics/dashboard', async () => {
    const client = await makeClient();
    const metrics = { aiPrAcceptanceRate: 82, deployFrequency: 4.2 };
    mockGet.mockResolvedValue({ data: metrics });

    const result = await client.getDashboardMetrics();

    expect(mockGet).toHaveBeenCalledWith('/metrics/dashboard');
    expect(result).toEqual(metrics);
  });

  it('propagates API errors', async () => {
    const client = await makeClient();
    const axiosError = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { message: 'Unauthorized' } },
      request: {},
      config: { baseURL: 'http://localhost:3000' },
      isAxiosError: true,
    });
    mockGet.mockRejectedValue(axiosError);

    await expect(client.getDashboardMetrics()).rejects.toThrow('API error: Unauthorized');
  });
});

// ── error handling edge cases ─────────────────────────────────────────────────

describe('error handling', () => {
  it('re-throws non-axios errors unchanged', async () => {
    const client = await makeClient();
    const genericError = new Error('unexpected error');
    // No .request or .response properties — treated as a non-axios error
    mockGet.mockRejectedValue(genericError);

    await expect(client.getDashboardMetrics()).rejects.toThrow('unexpected error');
  });

  it('handles API error without message field gracefully', async () => {
    const client = await makeClient();
    const axiosError = Object.assign(new Error('Server Error'), {
      response: { status: 500, data: 'Internal Server Error' },
      request: {},
      config: { baseURL: 'http://localhost:3000' },
      isAxiosError: true,
    });
    mockGet.mockRejectedValue(axiosError);

    await expect(client.getDashboardMetrics()).rejects.toThrow('HTTP 500');
  });
});
