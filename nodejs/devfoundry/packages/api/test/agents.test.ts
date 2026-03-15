/**
 * Unit tests for AgentsService and AgentsController.
 */

import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    ...overrides,
  };
}

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    agentType: 'feature',
    task: 'add login',
    projectId: 'proj-1',
    status: 'completed',
    durationMs: 1000,
    summary: 'Done',
    output: {},
    error: '',
    createdAt: new Date(),
    ...overrides,
  };
}

// ── AgentsService ─────────────────────────────────────────────────────────────

describe('AgentsService', () => {
  async function makeService(repoOverrides = {}) {
    const { AgentsService } = await import('../src/modules/agents/agents.service.js');
    const repo = makeRepo(repoOverrides);
    return { svc: new AgentsService(repo as never), repo };
  }

  describe('findAll', () => {
    it('returns all runs ordered by createdAt DESC', async () => {
      const { svc, repo } = await makeService();
      const runs = [makeRun(), makeRun({ id: 'run-2' })];
      repo.find.mockResolvedValue(runs);

      const result = await svc.findAll();

      expect(result).toEqual(runs);
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('returns the run when found', async () => {
      const { svc, repo } = await makeService();
      const run = makeRun();
      repo.findOne.mockResolvedValue(run);

      const result = await svc.findOne('run-1');

      expect(result).toEqual(run);
    });

    it('throws NotFoundException when not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAndRun', () => {
    it('saves an initial running record, executes agent, and updates status', async () => {
      const { svc, repo } = await makeService();
      const run = makeRun({ status: 'running' });
      repo.create.mockReturnValue(run);
      repo.save.mockResolvedValue(run);

      const dto = { agentType: 'feature', task: 'add login', repo: 'myapp', projectId: 'proj-1' };
      const result = await svc.createAndRun(dto);

      expect(repo.create).toHaveBeenCalled();
      // save called twice: initial persist and final update
      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('marks run as completed when agent succeeds', async () => {
      const { svc, repo } = await makeService();
      const run = makeRun({ status: 'running' });
      repo.create.mockReturnValue(run);
      repo.save.mockImplementation(async (r) => r);

      await svc.createAndRun({ agentType: 'test', task: 'generate tests', repo: 'myapp' });

      expect(run.status).toBe('completed');
    });

    it('marks run as failed when agent type is unknown', async () => {
      const { svc, repo } = await makeService();
      const run = makeRun({ status: 'running' });
      repo.create.mockReturnValue(run);
      repo.save.mockImplementation(async (r) => r);

      await svc.createAndRun({ agentType: 'unknown-type', task: 'do something', repo: 'myapp' });

      expect(run.status).toBe('failed');
      expect(run.error).toContain('Unknown agent type');
    });

    it('supports all valid agent types without throwing', async () => {
      const agentTypes = ['feature', 'test', 'refactor', 'security', 'dependency', 'pr-reviewer'];

      for (const agentType of agentTypes) {
        const { svc, repo } = await makeService();
        const run = makeRun({ status: 'running' });
        repo.create.mockReturnValue(run);
        repo.save.mockImplementation(async (r) => r);

        await expect(
          svc.createAndRun({ agentType, task: 'task', repo: 'repo' }),
        ).resolves.toBeDefined();
      }
    });
  });
});

// ── AgentsController ──────────────────────────────────────────────────────────

describe('AgentsController', () => {
  async function makeController() {
    const { AgentsController } = await import('../src/modules/agents/agents.controller.js');
    const svc = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      createAndRun: vi.fn(),
    };
    return { ctrl: new AgentsController(svc as never), svc };
  }

  it('findAll delegates to service', async () => {
    const { ctrl, svc } = await makeController();
    svc.findAll.mockResolvedValue([]);
    await ctrl.findAll();
    expect(svc.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.findOne.mockResolvedValue(makeRun());
    await ctrl.findOne('run-1');
    expect(svc.findOne).toHaveBeenCalledWith('run-1');
  });

  it('createAndRun delegates to service with dto', async () => {
    const { ctrl, svc } = await makeController();
    const dto = { agentType: 'feature', task: 'do it', repo: 'myapp' };
    svc.createAndRun.mockResolvedValue(makeRun());
    await ctrl.createAndRun(dto);
    expect(svc.createAndRun).toHaveBeenCalledWith(dto);
  });
});
