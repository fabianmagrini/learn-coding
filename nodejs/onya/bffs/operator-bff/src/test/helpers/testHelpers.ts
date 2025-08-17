import jwt from 'jsonwebtoken';
import { vi } from 'vitest';

export const createMockOperator = (overrides: Partial<any> = {}) => ({
  id: 'operator-123',
  email: 'operator@example.com',
  role: 'OPERATOR',
  operatorId: 'op-123',
  isActive: true,
  status: 'AVAILABLE',
  ...overrides,
});

export const createMockSupervisor = (overrides: Partial<any> = {}) => ({
  id: 'supervisor-123',
  email: 'supervisor@example.com',
  role: 'SUPERVISOR',
  operatorId: 'sup-123',
  isActive: true,
  status: 'AVAILABLE',
  ...overrides,
});

export const createMockChatSession = (overrides: Partial<any> = {}) => ({
  id: 'session-123',
  customerId: 'customer-123',
  operatorId: null,
  status: 'PENDING',
  metadata: {
    subject: 'Test inquiry',
    priority: 'MEDIUM',
    skill: 'TECHNICAL',
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
  userId: 'customer-123',
  timestamp: new Date(),
  metadata: {},
  ...overrides,
});

export const createAuthenticatedRequest = (user: any) => {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, operatorId: user.operatorId },
    'test-secret',
    { expiresIn: '1h' }
  );

  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
    user,
  };
};

export const createMockSocket = (user: any) => ({
  id: 'socket-123',
  user,
  join: vi.fn(),
  leave: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
  on: vi.fn(),
  disconnect: vi.fn(),
  handshake: {
    auth: {
      token: jwt.sign(
        { userId: user.id, email: user.email, role: user.role, operatorId: user.operatorId },
        'test-secret',
        { expiresIn: '1h' }
      ),
    },
  },
});

export const createMockResponse = () => ({
  status: vi.fn(() => mockResponse),
  json: vi.fn(() => mockResponse),
  send: vi.fn(() => mockResponse),
  setHeader: vi.fn(),
});

const mockResponse = createMockResponse();

export const createMockRequest = (overrides: any = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: null,
  ...overrides,
});

export const waitForMs = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createMockMetrics = (overrides: Partial<any> = {}) => ({
  totalSessions: 150,
  activeSessions: 12,
  queuedSessions: 8,
  averageWaitTime: 2.5,
  averageResolutionTime: 8.2,
  customerSatisfaction: 4.3,
  operatorUtilization: 0.78,
  ...overrides,
});

export const createMockAnalytics = (overrides: Partial<any> = {}) => ({
  timeRange: '24h',
  data: {
    sessionsHandled: 45,
    averageResponseTime: 1.2,
    customerSatisfactionScore: 4.5,
    resolutionRate: 0.92,
    escalationRate: 0.08,
  },
  ...overrides,
});