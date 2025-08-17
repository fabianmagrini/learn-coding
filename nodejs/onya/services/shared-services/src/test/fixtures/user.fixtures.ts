import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const createUserData = (overrides: Partial<any> = {}) => ({
  email: 'test@example.com',
  password: 'hashedPassword123',
  role: Role.CUSTOMER,
  isActive: true,
  ...overrides,
});

export const createOperatorData = (overrides: Partial<any> = {}) => ({
  email: 'operator@example.com',
  password: 'hashedPassword123',
  role: Role.OPERATOR,
  isActive: true,
  ...overrides,
});

export const createSupervisorData = (overrides: Partial<any> = {}) => ({
  email: 'supervisor@example.com',
  password: 'hashedPassword123',
  role: Role.SUPERVISOR,
  isActive: true,
  ...overrides,
});

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const createHashedUserData = async (overrides: Partial<any> = {}) => {
  const userData = createUserData(overrides);
  if (userData.password) {
    userData.password = await hashPassword(userData.password);
  }
  return userData;
};