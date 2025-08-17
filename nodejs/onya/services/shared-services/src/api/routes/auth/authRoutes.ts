import { Router } from 'express';
import { AuthService } from '../../../services/auth/authService';
import { authenticate, rateLimit } from '../../../middleware/authMiddleware';
import { logger } from '../../../shared/utils/logger';
import { z } from 'zod';

const router = Router();
const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['CUSTOMER', 'OPERATOR', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Apply rate limiting to auth routes
router.use(rateLimit(900, 10)); // 10 requests per 15 minutes

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const result = await authService.register(validatedData);
    
    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Registration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: req.body.email,
      ip: req.ip,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const result = await authService.login(validatedData);
    
    logger.info('User logged in successfully', {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: req.body.email,
      ip: req.ip,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    
    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await authService.logout(req.user!.userId);
    
    logger.info('User logged out', {
      userId: req.user!.userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await authService.getUserFromToken(
      authService.extractTokenFromHeader(req.headers.authorization) || ''
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error('Get user profile failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );
    
    logger.info('Password changed successfully', {
      userId: req.user!.userId,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Password change failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      ip: req.ip,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Password change failed',
    });
  }
});

// POST /api/auth/verify-token (for service-to-service verification)
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    
    const payload = await authService.verifyToken(token);
    
    res.json({
      success: true,
      data: { payload },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

export { router as authRoutes };