import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { UserRepository } from '../../database/repositories/userRepository';
import { logger } from '../../shared/utils/logger';
import { config } from '../../shared/utils/config';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = config.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtRefreshSecret = config.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
    this.accessTokenExpiry = config.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = config.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!config.JWT_SECRET) {
      logger.warn('JWT_SECRET not set, using default (insecure for production)');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = await this.userRepository.createUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role || 'CUSTOMER',
      });

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Failed to register user', { error, email: data.email });
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await this.userRepository.verifyPassword(user, credentials.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Failed to login user', { error, email: credentials.email });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as AuthTokenPayload;

      // Get user to ensure they still exist and are active
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email,
      });

      return tokens;
    } catch (error) {
      logger.error('Failed to refresh token', { error });
      throw new Error('Invalid refresh token');
    }
  }

  async verifyToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
      
      // Optionally verify user still exists and is active
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return payload;
    } catch (error) {
      logger.error('Failed to verify token', { error });
      throw new Error('Invalid token');
    }
  }

  async getUserFromToken(token: string): Promise<Omit<User, 'password'> | null> {
    try {
      const payload = await this.verifyToken(token);
      const user = await this.userRepository.findById(payload.userId);
      
      if (!user) {
        return null;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Failed to get user from token', { error });
      return null;
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // In a production system, you might want to maintain a blacklist of tokens
      // For now, we'll just log the logout event
      logger.info('User logged out', { userId });
    } catch (error) {
      logger.error('Failed to logout user', { error, userId });
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.userRepository.verifyPassword(user, currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await this.userRepository.updateUser(userId, {
        password: await this.hashPassword(newPassword),
      });

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Failed to change password', { error, userId });
      throw error;
    }
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: this.accessTokenExpiry } as any);
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: this.refreshTokenExpiry } as any);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  // Helper method to extract token from Authorization header
  public extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Helper method to check if user has required role
  public hasRole(user: AuthTokenPayload, roles: UserRole[]): boolean {
    return roles.includes(user.role);
  }

  // Helper method to check if user has required permissions
  public hasPermission(user: AuthTokenPayload, resource: string, action: string): boolean {
    // Implement role-based access control logic here
    // This is a simple example - in production, you'd have a more sophisticated RBAC system
    
    switch (user.role) {
      case 'ADMIN':
        return true; // Admins can do everything
      
      case 'OPERATOR':
        // Operators can read most things and manage assigned chats
        if (action === 'read') return true;
        if (resource === 'chat' && ['update', 'message'].includes(action)) return true;
        return false;
      
      case 'CUSTOMER':
        // Customers can only manage their own resources
        if (resource === 'chat' && action === 'read') return true;
        if (resource === 'chat' && action === 'create') return true;
        if (resource === 'message' && action === 'create') return true;
        return false;
      
      default:
        return false;
    }
  }
}