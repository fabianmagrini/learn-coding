import { db } from '../../db/client.js';
import { hashPassword, comparePassword } from '../../shared/utils/password.js';
import { generateToken } from '../../shared/utils/jwt.js';
import { AppError } from '../../shared/middleware/errorHandler.js';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async register(input: RegisterInput) {
    const { email, username, password } = input;

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError(400, 'User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, is_onboarded)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, is_onboarded`,
      [email, username, passwordHash, false]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isOnboarded: user.is_onboarded,
      },
      token,
    };
  },

  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user
    const result = await db.query(
      'SELECT id, email, username, password_hash, is_onboarded FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isOnboarded: user.is_onboarded,
      },
      token,
    };
  },

  async getMe(userId: string) {
    const result = await db.query(
      'SELECT id, email, username, is_onboarded FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isOnboarded: user.is_onboarded,
    };
  },
};
