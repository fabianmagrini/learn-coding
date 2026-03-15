/**
 * Unit tests for ProjectsService and ProjectsController.
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

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    name: 'myapp',
    repoUrl: 'https://github.com/acme/myapp',
    description: 'Test project',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── ProjectsService ───────────────────────────────────────────────────────────

describe('ProjectsService', () => {
  async function makeService(repoOverrides = {}) {
    const { ProjectsService } = await import('../src/modules/projects/projects.service.js');
    const repo = makeRepo(repoOverrides);
    return { svc: new ProjectsService(repo as never), repo };
  }

  describe('findAll', () => {
    it('returns all projects ordered by createdAt DESC', async () => {
      const { svc, repo } = await makeService();
      const projects = [makeProject(), makeProject({ id: 'proj-2', name: 'other' })];
      repo.find.mockResolvedValue(projects);

      const result = await svc.findAll();

      expect(result).toEqual(projects);
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('returns the project when found', async () => {
      const { svc, repo } = await makeService();
      const project = makeProject();
      repo.findOne.mockResolvedValue(project);

      const result = await svc.findOne('proj-1');

      expect(result).toEqual(project);
    });

    it('throws NotFoundException when not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('returns project when found by name', async () => {
      const { svc, repo } = await makeService();
      const project = makeProject();
      repo.findOne.mockResolvedValue(project);

      const result = await svc.findByName('myapp');

      expect(result).toEqual(project);
    });

    it('returns null when not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      const result = await svc.findByName('unknown');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns the saved project', async () => {
      const { svc, repo } = await makeService();
      const dto = { name: 'newapp', repoUrl: 'https://github.com/acme/newapp' };
      const project = makeProject({ ...dto });
      repo.create.mockReturnValue(project);
      repo.save.mockResolvedValue(project);

      const result = await svc.create(dto);

      expect(result).toEqual(project);
      expect(repo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates and returns the saved project', async () => {
      const { svc, repo } = await makeService();
      const project = makeProject();
      repo.findOne.mockResolvedValue(project);
      const updated = { ...project, description: 'updated' };
      repo.save.mockResolvedValue(updated);

      const result = await svc.update('proj-1', { description: 'updated' });

      expect(result.description).toBe('updated');
    });

    it('throws NotFoundException when project does not exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.update('missing', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes the project', async () => {
      const { svc, repo } = await makeService();
      const project = makeProject();
      repo.findOne.mockResolvedValue(project);
      repo.remove.mockResolvedValue(undefined);

      await svc.remove('proj-1');

      expect(repo.remove).toHaveBeenCalledWith(project);
    });

    it('throws NotFoundException when project does not exist', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(svc.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

// ── ProjectsController ────────────────────────────────────────────────────────

describe('ProjectsController', () => {
  async function makeController() {
    const { ProjectsController } = await import('../src/modules/projects/projects.controller.js');
    const svc = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    return { ctrl: new ProjectsController(svc as never), svc };
  }

  it('findAll delegates to service', async () => {
    const { ctrl, svc } = await makeController();
    svc.findAll.mockResolvedValue([]);
    await ctrl.findAll();
    expect(svc.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.findOne.mockResolvedValue(makeProject());
    await ctrl.findOne('proj-1');
    expect(svc.findOne).toHaveBeenCalledWith('proj-1');
  });

  it('create delegates to service with dto', async () => {
    const { ctrl, svc } = await makeController();
    const dto = { name: 'app', repoUrl: 'https://github.com/a/b' };
    svc.create.mockResolvedValue(makeProject());
    await ctrl.create(dto);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service with id and dto', async () => {
    const { ctrl, svc } = await makeController();
    svc.update.mockResolvedValue(makeProject());
    await ctrl.update('proj-1', { description: 'new' });
    expect(svc.update).toHaveBeenCalledWith('proj-1', { description: 'new' });
  });

  it('remove delegates to service with id', async () => {
    const { ctrl, svc } = await makeController();
    svc.remove.mockResolvedValue(undefined);
    await ctrl.remove('proj-1');
    expect(svc.remove).toHaveBeenCalledWith('proj-1');
  });
});
