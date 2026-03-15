/**
 * Unit tests for the DevFoundry CLI helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevFoundryApiClient } from '../src/lib/api-client.js';
import { success, error, riskBadge, statusBadge } from '../src/lib/output.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

describe('DevFoundryApiClient', () => {
  it('can be instantiated with a base URL', () => {
    const client = new DevFoundryApiClient('http://localhost:3000');
    expect(client).toBeDefined();
  });

  it('can be instantiated with a token', () => {
    const client = new DevFoundryApiClient('http://localhost:3000', 'my-token');
    expect(client).toBeDefined();
  });
});

describe('output helpers', () => {
  it('success writes to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    success('test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('error writes to stderr', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    error('test error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('riskBadge returns correct colours', () => {
    expect(riskBadge('high')).toContain('HIGH');
    expect(riskBadge('medium')).toContain('MED');
    expect(riskBadge('low')).toContain('LOW');
  });

  it('statusBadge handles all statuses', () => {
    expect(statusBadge('completed')).toContain('completed');
    expect(statusBadge('failed')).toContain('failed');
    expect(statusBadge('running')).toContain('running');
    expect(statusBadge('unknown')).toBe('unknown');
  });
});
