/**
 * Unit tests for MetricsService and MetricsController.
 */

import { describe, it, expect, vi } from 'vitest';

function makeRepo(overrides: Record<string, unknown> = {}) {
  const qb = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
  };
  return {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    _qb: qb,
    ...overrides,
  };
}

function makeMetric(name: string, value: number) {
  return { id: 'metric-1', name, value, recordedAt: new Date() };
}

// ── MetricsService ────────────────────────────────────────────────────────────

describe('MetricsService', () => {
  async function makeService(repoOverrides = {}) {
    const { MetricsService } = await import('../src/modules/metrics/metrics.service.js');
    const repo = makeRepo(repoOverrides);
    return { svc: new MetricsService(repo as never), repo };
  }

  describe('record', () => {
    it('creates and saves a metric', async () => {
      const { svc, repo } = await makeService();
      const metric = makeMetric('deploy_frequency', 4.2);
      repo.create.mockReturnValue(metric);
      repo.save.mockResolvedValue(metric);

      const result = await svc.record('deploy_frequency', 4.2);

      expect(result).toEqual(metric);
      expect(repo.create).toHaveBeenCalledWith({ name: 'deploy_frequency', value: 4.2, dimension: undefined, unit: undefined });
    });

    it('passes dimension and unit through', async () => {
      const { svc, repo } = await makeService();
      const metric = makeMetric('deploy_frequency', 4.2);
      repo.create.mockReturnValue(metric);
      repo.save.mockResolvedValue(metric);

      await svc.record('deploy_frequency', 4.2, 'prod', 'per-day');

      expect(repo.create).toHaveBeenCalledWith({
        name: 'deploy_frequency',
        value: 4.2,
        dimension: 'prod',
        unit: 'per-day',
      });
    });
  });

  describe('getLatest', () => {
    it('returns the most recent metric', async () => {
      const { svc, repo } = await makeService();
      const metric = makeMetric('ai_pr_acceptance_rate', 82);
      repo.findOne.mockResolvedValue(metric);

      const result = await svc.getLatest('ai_pr_acceptance_rate');

      expect(result).toEqual(metric);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { name: 'ai_pr_acceptance_rate' },
        order: { recordedAt: 'DESC' },
      });
    });

    it('returns null when no metric recorded', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      const result = await svc.getLatest('ai_pr_acceptance_rate');

      expect(result).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('queries metrics since the given number of days ago', async () => {
      const { svc, repo } = await makeService();
      const metrics = [makeMetric('deploy_frequency', 4)];
      repo._qb.getMany.mockResolvedValue(metrics);

      const result = await svc.getHistory('deploy_frequency', 7);

      expect(result).toEqual(metrics);
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('m');
    });

    it('defaults to 30 days', async () => {
      const { svc, repo } = await makeService();
      repo._qb.getMany.mockResolvedValue([]);

      await svc.getHistory('deploy_frequency');

      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getDashboardMetrics', () => {
    it('returns defaults when no metrics are recorded', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      const result = await svc.getDashboardMetrics();

      expect(result.aiPrAcceptanceRate).toBe(82);
      expect(result.deployFrequency).toBe(4.2);
      expect(result.leadTimeHours).toBe(6.5);
      expect(result.activeAgents).toBe(6);
      expect(result.architectureViolations).toBe(3);
    });

    it('uses stored values when metrics exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockImplementation(async ({ where }) => {
        if (where.name === 'ai_pr_acceptance_rate') return makeMetric('ai_pr_acceptance_rate', 95);
        if (where.name === 'deploy_frequency') return makeMetric('deploy_frequency', 8);
        return null;
      });

      const result = await svc.getDashboardMetrics();

      expect(result.aiPrAcceptanceRate).toBe(95);
      expect(result.deployFrequency).toBe(8);
    });

    it('always returns 6 active agents', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      const result = await svc.getDashboardMetrics();

      expect(result.activeAgents).toBe(6);
    });
  });
});

// ── MetricsController ─────────────────────────────────────────────────────────

describe('MetricsController', () => {
  async function makeController() {
    const { MetricsController } = await import('../src/modules/metrics/metrics.controller.js');
    const svc = { getDashboardMetrics: vi.fn() };
    return { ctrl: new MetricsController(svc as never), svc };
  }

  it('getDashboard delegates to MetricsService', async () => {
    const { ctrl, svc } = await makeController();
    const metrics = {
      aiPrAcceptanceRate: 82,
      deployFrequency: 4.2,
      leadTimeHours: 6.5,
      activeAgents: 6,
      architectureViolations: 3,
      totalAgentRuns: 147,
    };
    svc.getDashboardMetrics.mockResolvedValue(metrics);

    const result = await ctrl.getDashboard();

    expect(result).toEqual(metrics);
    expect(svc.getDashboardMetrics).toHaveBeenCalled();
  });
});
