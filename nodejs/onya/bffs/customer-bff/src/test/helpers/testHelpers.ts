import { CreateContextOptions } from '@/trpc/context';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';

export const createMockContext = (overrides: Partial<CreateContextOptions> = {}): CreateContextOptions => {
  return {
    req: {
      headers: {},
      ...overrides.req,
    } as any,
    res: {
      setHeader: vi.fn(),
      ...overrides.res,
    } as any,
  };
};

export const createAuthenticatedContext = (user: any): CreateContextOptions => {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    'test-secret',
    { expiresIn: '1h' }
  );

  return createMockContext({
    req: {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  });
};

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  role: 'CUSTOMER',
  isActive: true,
  ...overrides,
});

export const createMockChatSession = (overrides: Partial<any> = {}) => ({
  id: 'session-123',
  customerId: 'user-123',
  status: 'ACTIVE',
  metadata: {
    subject: 'Test inquiry',
    priority: 'MEDIUM',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMessage = (overrides: Partial<any> = {}) => ({
  id: 'message-123',
  sessionId: 'session-123',
  content: 'Test message',
  type: 'USER',
  userId: 'user-123',
  timestamp: new Date(),
  metadata: {},
  ...overrides,
});

export const waitForMs = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};