/**
 * Unit tests for PoliciesService and PoliciesController.
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

function makePolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'policy-1',
    name: 'no-service-to-ui',
    type: 'architecture',
    rule: { source: 'services', operator: 'cannot-import', target: 'ui' },
    enabled: true,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── PoliciesService ───────────────────────────────────────────────────────────

describe('PoliciesService', () => {
  async function makeService(repoOverrides = {}) {
    const { PoliciesService } = await import('../src/modules/policies/policies.service.js');
    const repo = makeRepo(repoOverrides);
    return { svc: new PoliciesService(repo as never), repo };
  }

  describe('findAll', () => {
    it('returns policies ordered by createdAt DESC', async () => {
      const { svc, repo } = await makeService();
      const policies = [makePolicy()];
      repo.find.mockResolvedValue(policies);

      const result = await svc.findAll();

      expect(result).toEqual(policies);
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('returns the policy when found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(makePolicy());

      const result = await svc.findOne('policy-1');

      expect(result.id).toBe('policy-1');
    });

    it('throws NotFoundException when not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns the saved policy', async () => {
      const { svc, repo } = await makeService();
      const policy = makePolicy();
      repo.create.mockReturnValue(policy);
      repo.save.mockResolvedValue(policy);

      const dto = { name: 'no-service-to-ui', type: 'architecture', rule: {} };
      const result = await svc.create(dto as never);

      expect(result).toEqual(policy);
    });
  });

  describe('update', () => {
    it('updates and returns the saved policy', async () => {
      const { svc, repo } = await makeService();
      const policy = makePolicy();
      repo.findOne.mockResolvedValue(policy);
      const updated = { ...policy, enabled: false };
      repo.save.mockResolvedValue(updated);

      const result = await svc.update('policy-1', { enabled: false });

      expect(result.enabled).toBe(false);
    });

    it('throws NotFoundException when policy does not exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.update('missing', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes the policy', async () => {
      const { svc, repo } = await makeService();
      const policy = makePolicy();
      repo.findOne.mockResolvedValue(policy);
      repo.remove.mockResolvedValue(undefined);

      await svc.remove('policy-1');

      expect(repo.remove).toHaveBeenCalledWith(policy);
    });

    it('throws NotFoundException when policy does not exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

// ── PoliciesController ────────────────────────────────────────────────────────

describe('PoliciesController', () => {
  async function makeController() {
    const { PoliciesController } = await import('../src/modules/policies/policies.controller.js');
    const svc = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    return { ctrl: new PoliciesController(svc as never), svc };
  }

  it('findAll delegates to service', async () => {
    const { ctrl, svc } = await makeController();
    svc.findAll.mockResolvedValue([]);
    await ctrl.findAll();
    expect(svc.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.findOne.mockResolvedValue(makePolicy());
    await ctrl.findOne('policy-1');
    expect(svc.findOne).toHaveBeenCalledWith('policy-1');
  });

  it('create delegates to service with dto', async () => {
    const { ctrl, svc } = await makeController();
    const dto = { name: 'rule', type: 'architecture', rule: {} };
    svc.create.mockResolvedValue(makePolicy());
    await ctrl.create(dto as never);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service with id and dto', async () => {
    const { ctrl, svc } = await makeController();
    svc.update.mockResolvedValue(makePolicy());
    await ctrl.update('policy-1', { enabled: false });
    expect(svc.update).toHaveBeenCalledWith('policy-1', { enabled: false });
  });

  it('remove delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.remove.mockResolvedValue(undefined);
    await ctrl.remove('policy-1');
    expect(svc.remove).toHaveBeenCalledWith('policy-1');
  });
});
