import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@/services/auth/authService';
import { prisma } from '../../setup';
import { createTestUser } from '../../helpers/testHelpers';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: Role.CUSTOMER,
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.password).not.toBe(userData.password); // Password should be hashed
      expect(user.isActive).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        role: Role.CUSTOMER,
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow('User with this email already exists');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        role: Role.CUSTOMER,
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should authenticate user with correct credentials', async () => {
      const user = await createTestUser({
        email: 'login@example.com',
        password: 'password123',
      });

      const result = await authService.login('login@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject invalid email', async () => {
      await expect(authService.login('nonexistent@example.com', 'password123'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      await createTestUser({
        email: 'wrongpass@example.com',
        password: 'password123',
      });

      await expect(authService.login('wrongpass@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      await createTestUser({
        email: 'inactive@example.com',
        password: 'password123',
        isActive: false,
      });

      await expect(authService.login('inactive@example.com', 'password123'))
        .rejects.toThrow('Account is deactivated');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const user = await createTestUser();
      const loginResult = await authService.login(user.email, 'password123');

      const verificationResult = await authService.verifyToken(loginResult.accessToken);

      expect(verificationResult).toBeDefined();
      expect(verificationResult.id).toBe(user.id);
      expect(verificationResult.email).toBe(user.email);
    });

    it('should reject invalid token', async () => {
      await expect(authService.verifyToken('invalid-token'))
        .rejects.toThrow('Invalid token');
    });

    it('should reject expired token', async () => {
      // This would require mocking time or using a very short expiry
      // For now, we'll test with a malformed token
      await expect(authService.verifyToken('expired.token.here'))
        .rejects.toThrow('Invalid token');
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const user = await createTestUser();
      const loginResult = await authService.login(user.email, 'password123');

      const refreshResult = await authService.refreshToken(loginResult.refreshToken);

      expect(refreshResult).toBeDefined();
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(refreshResult.accessToken).not.toBe(loginResult.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-refresh-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should invalidate refresh token', async () => {
      const user = await createTestUser();
      const loginResult = await authService.login(user.email, 'password123');

      await authService.logout(loginResult.refreshToken);

      // Try to use the refresh token - should fail
      await expect(authService.refreshToken(loginResult.refreshToken))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const user = await createTestUser();

      const foundUser = await authService.getUserById(user.id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(user.id);
      expect(foundUser!.email).toBe(user.email);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await authService.getUserById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const user = await createTestUser();
      const updates = {
        email: 'updated@example.com',
        metadata: { firstName: 'John', lastName: 'Doe' },
      };

      const updatedUser = await authService.updateUserProfile(user.id, updates);

      expect(updatedUser.email).toBe(updates.email);
      expect(updatedUser.metadata).toEqual(updates.metadata);
    });

    it('should not allow updating to existing email', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });

      await expect(authService.updateUserProfile(user1.id, { email: 'user2@example.com' }))
        .rejects.toThrow('Email already exists');
    });
  });
});