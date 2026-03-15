/**
 * Unit tests for AuthService and AuthController.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

function makeUserRepo(overrides: Record<string, unknown> = {}) {
  return {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    ...overrides,
  };
}

function makeJwtService() {
  return { sign: vi.fn().mockReturnValue('signed-jwt') };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'developer',
    isActive: true,
    ...overrides,
  };
}

// ── AuthService ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: Awaited<ReturnType<typeof makeService>>;

  async function makeService(repoOverrides = {}) {
    const { AuthService } = await import('../src/modules/auth/auth.service.js');
    const repo = makeUserRepo(repoOverrides);
    const jwt = makeJwtService();
    return { svc: new AuthService(repo as never, jwt as never), repo, jwt };
  }

  describe('register', () => {
    it('creates a new user and returns a JWT', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);
      const user = makeUser();
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);

      const result = await svc.register({ email: 'test@example.com', password: 'secret', name: 'Test' });

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws ConflictException if email is already registered', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(makeUser());

      await expect(
        svc.register({ email: 'test@example.com', password: 'secret', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password before saving', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);
      const user = makeUser();
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);

      await svc.register({ email: 'test@example.com', password: 'my-plain-password', name: 'Test' });

      expect(bcrypt.hash).toHaveBeenCalledWith('my-plain-password', 12);
    });
  });

  describe('login', () => {
    it('returns a JWT for valid credentials', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(makeUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await svc.login({ email: 'test@example.com', password: 'secret' });

      expect(result.accessToken).toBe('signed-jwt');
    });

    it('throws UnauthorizedException when user not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      await expect(
        svc.login({ email: 'nobody@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(makeUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        svc.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('returns the user when found and active', async () => {
      const { svc, repo } = await makeService();
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const result = await svc.validateUser({ sub: 'user-1', email: 'test@example.com', role: 'developer' });

      expect(result).toEqual(user);
    });

    it('returns null when user not found', async () => {
      const { svc, repo } = await makeService();
      repo.findOne.mockResolvedValue(null);

      const result = await svc.validateUser({ sub: 'missing', email: 'x@x.com', role: 'developer' });

      expect(result).toBeNull();
    });
  });
});

// ── AuthController ────────────────────────────────────────────────────────────

describe('AuthController', () => {
  async function makeController() {
    const { AuthController } = await import('../src/modules/auth/auth.controller.js');
    const svc = { register: vi.fn(), login: vi.fn() };
    return { ctrl: new AuthController(svc as never), svc };
  }

  it('register delegates to AuthService', async () => {
    const { ctrl, svc } = await makeController();
    const dto = { email: 'a@b.com', password: 'pw', name: 'A' };
    svc.register.mockResolvedValue({ accessToken: 'tok', user: {} });

    await ctrl.register(dto);

    expect(svc.register).toHaveBeenCalledWith(dto);
  });

  it('login delegates to AuthService', async () => {
    const { ctrl, svc } = await makeController();
    const dto = { email: 'a@b.com', password: 'pw' };
    svc.login.mockResolvedValue({ accessToken: 'tok', user: {} });

    await ctrl.login(dto);

    expect(svc.login).toHaveBeenCalledWith(dto);
  });
});
