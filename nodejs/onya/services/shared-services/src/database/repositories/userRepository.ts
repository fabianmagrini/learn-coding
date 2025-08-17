import { User, UserRole, UserTier, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { logger } from '../../shared/utils/logger';
import bcrypt from 'bcryptjs';

export class UserRepository {
  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    tier?: UserTier;
  }): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });

      logger.info('User created', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', { error, email: data.email });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to find user by ID', { error, userId: id });
      throw error;
    }
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
      });

      logger.info('User updated', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Failed to update user', { error, userId: id });
      throw error;
    }
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error('Failed to verify password', { error, userId: user.id });
      throw error;
    }
  }

  async listUsers(options: {
    role?: UserRole;
    tier?: UserTier;
    isActive?: boolean;
    skip?: number;
    take?: number;
  } = {}): Promise<User[]> {
    try {
      const { role, tier, isActive, skip = 0, take = 50 } = options;

      return await prisma.user.findMany({
        where: {
          ...(role && { role }),
          ...(tier && { tier }),
          ...(isActive !== undefined && { isActive }),
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to list users', { error, options });
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info('User deactivated', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Failed to deactivate user', { error, userId: id });
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });

      logger.info('User deleted', { userId: id });
    } catch (error) {
      logger.error('Failed to delete user', { error, userId: id });
      throw error;
    }
  }

  async getUserStats(): Promise<{
    total: number;
    customers: number;
    operators: number;
    admins: number;
    active: number;
  }> {
    try {
      const [total, customers, operators, admins, active] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({ where: { role: 'OPERATOR' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { isActive: true } }),
      ]);

      return { total, customers, operators, admins, active };
    } catch (error) {
      logger.error('Failed to get user stats', { error });
      throw error;
    }
  }
}