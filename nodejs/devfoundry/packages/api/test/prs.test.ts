/**
 * Unit tests for PrsService and PrsController.
 */

import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

function makePR(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    prNumber: 42,
    title: 'feat: add rate limiting',
    repo: 'acme/myapp',
    status: 'open',
    riskTier: 'medium',
    approvalStatus: 'pending',
    policyPassed: true,
    isAiGenerated: true,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── PrsService ────────────────────────────────────────────────────────────────

describe('PrsService', () => {
  async function makeService(repoOverrides = {}) {
    const { PrsService } = await import('../src/modules/prs/prs.service.js');
    const repo = makeRepo(repoOverrides);
    return { svc: new PrsService(repo as never), repo };
  }

  describe('findAll', () => {
    it('returns PRs ordered by createdAt DESC', async () => {
      const { svc, repo } = await makeService();
      const prs = [makePR(), makePR({ id: 'pr-2', prNumber: 43 })];
      repo.find.mockResolvedValue(prs);

      const result = await svc.findAll();

      expect(result).toEqual(prs);
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('returns the PR when found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(makePR());

      const result = await svc.findOne('pr-1');

      expect(result.id).toBe('pr-1');
    });

    it('throws NotFoundException when not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns the saved PR', async () => {
      const { svc, repo } = await makeService();
      const pr = makePR();
      repo.create.mockReturnValue(pr);
      repo.save.mockResolvedValue(pr);

      const dto = { title: 'feat: add rate limiting', repo: 'acme/myapp', riskTier: 'medium' };
      const result = await svc.create(dto as never);

      expect(result).toEqual(pr);
      expect(repo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates and returns the saved PR', async () => {
      const { svc, repo } = await makeService();
      const pr = makePR();
      repo.findOne.mockResolvedValue(pr);
      const updated = { ...pr, status: 'merged' };
      repo.save.mockResolvedValue(updated);

      const result = await svc.update('pr-1', { status: 'merged' });

      expect(result.status).toBe('merged');
    });

    it('throws NotFoundException when PR does not exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.update('missing', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes the PR', async () => {
      const { svc, repo } = await makeService();
      const pr = makePR();
      repo.findOne.mockResolvedValue(pr);
      repo.remove.mockResolvedValue(undefined);

      await svc.remove('pr-1');

      expect(repo.remove).toHaveBeenCalledWith(pr);
    });

    it('throws NotFoundException when PR does not exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

// ── PrsController ─────────────────────────────────────────────────────────────

describe('PrsController', () => {
  async function makeController() {
    const { PrsController } = await import('../src/modules/prs/prs.controller.js');
    const svc = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    return { ctrl: new PrsController(svc as never), svc };
  }

  it('findAll delegates to service', async () => {
    const { ctrl, svc } = await makeController();
    svc.findAll.mockResolvedValue([]);
    await ctrl.findAll();
    expect(svc.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.findOne.mockResolvedValue(makePR());
    await ctrl.findOne('pr-1');
    expect(svc.findOne).toHaveBeenCalledWith('pr-1');
  });

  it('create delegates to service with dto', async () => {
    const { ctrl, svc } = await makeController();
    const dto = { title: 'feat: add x', repo: 'acme/myapp', riskTier: 'low' };
    svc.create.mockResolvedValue(makePR());
    await ctrl.create(dto as never);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service with id and dto', async () => {
    const { ctrl, svc } = await makeController();
    svc.update.mockResolvedValue(makePR());
    await ctrl.update('pr-1', { status: 'merged' });
    expect(svc.update).toHaveBeenCalledWith('pr-1', { status: 'merged' });
  });

  it('remove delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.remove.mockResolvedValue(undefined);
    await ctrl.remove('pr-1');
    expect(svc.remove).toHaveBeenCalledWith('pr-1');
  });
});
