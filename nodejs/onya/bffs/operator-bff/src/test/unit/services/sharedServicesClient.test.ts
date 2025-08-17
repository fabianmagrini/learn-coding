import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { SharedServicesClient } from '@/services/sharedServicesClient';
import { createMockChatSession, createMockOperator, createMockMessage } from '../../helpers/testHelpers';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

describe('SharedServicesClient', () => {
  let client: SharedServicesClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    (axios.create as any).mockReturnValue(mockAxiosInstance);

    client = new SharedServicesClient({
      baseURL: 'http://localhost:3000',
      serviceToken: 'test-token',
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Methods', () => {
    it('should verify token successfully', async () => {
      const mockUser = createMockOperator();
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: { user: mockUser } },
      });

      const result = await client.verifyToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.data.user).toEqual(mockUser);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/verify-token', { token: 'valid-token' });
    });

    it('should get user profile', async () => {
      const mockUser = createMockOperator();
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { user: mockUser } },
      });

      const result = await client.getUserProfile('user-token');

      expect(result.success).toBe(true);
      expect(result.data.user).toEqual(mockUser);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/auth/me', {
        headers: { Authorization: 'Bearer user-token' },
      });
    });
  });

  describe('Chat Session Methods', () => {
    it('should get chat sessions with filters', async () => {
      const mockSessions = [createMockChatSession(), createMockChatSession()];
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { sessions: mockSessions, total: 2 } },
      });

      const result = await client.getChatSessions({
        status: 'PENDING',
        priority: 'HIGH',
        skip: 0,
        take: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.sessions).toEqual(mockSessions);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/chat/sessions', {
        params: { status: 'PENDING', priority: 'HIGH', skip: 0, take: 10 },
      });
    });

    it('should get single chat session', async () => {
      const mockSession = createMockChatSession();
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { session: mockSession } },
      });

      const result = await client.getChatSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/chat/sessions/session-123');
    });

    it('should get chat messages', async () => {
      const mockMessages = [createMockMessage(), createMockMessage()];
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { messages: mockMessages } },
      });

      const result = await client.getChatMessages('session-123', 50);

      expect(result.success).toBe(true);
      expect(result.data.messages).toEqual(mockMessages);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/chat/sessions/session-123/messages', {
        params: { limit: 50 },
      });
    });

    it('should update chat session', async () => {
      const mockSession = createMockChatSession({ status: 'ACTIVE' });
      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: { session: mockSession } },
      });

      const result = await client.updateChatSession('session-123', {
        status: 'ACTIVE',
        operatorId: 'op-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/chat/sessions/session-123', {
        status: 'ACTIVE',
        operatorId: 'op-123',
      });
    });

    it('should add chat message', async () => {
      const mockMessage = createMockMessage({ type: 'OPERATOR' });
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: { message: mockMessage } },
      });

      const messageData = {
        content: 'Hello, how can I help?',
        type: 'OPERATOR',
        userId: 'op-123',
      };

      const result = await client.addChatMessage('session-123', messageData);

      expect(result.success).toBe(true);
      expect(result.data.message).toEqual(mockMessage);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/chat/sessions/session-123/messages', messageData);
    });
  });

  describe('Operator Assignment Methods', () => {
    it('should assign operator to session', async () => {
      const mockSession = createMockChatSession({ operatorId: 'op-123', status: 'ESCALATED' });
      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: { session: mockSession } },
      });

      const result = await client.assignOperatorToSession('session-123', 'op-123');

      expect(result.success).toBe(true);
      expect(result.data.session.operatorId).toBe('op-123');
      expect(result.data.session.status).toBe('ESCALATED');
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/chat/sessions/session-123', {
        operatorId: 'op-123',
        status: 'ESCALATED',
        metadata: expect.objectContaining({
          assignedAt: expect.any(String),
        }),
      });
    });

    it('should escalate session', async () => {
      const mockSession = createMockChatSession({ status: 'ESCALATED' });
      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: { session: mockSession } },
      });

      const escalationData = {
        operatorId: 'op-123',
        reason: 'Complex technical issue',
        priority: 'HIGH',
      };

      const result = await client.escalateSession('session-123', escalationData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/chat/sessions/session-123', {
        operatorId: 'op-123',
        status: 'ESCALATED',
        metadata: expect.objectContaining({
          escalationReason: 'Complex technical issue',
          escalatedAt: expect.any(String),
          priority: 'HIGH',
        }),
      });
    });

    it('should resolve session', async () => {
      const mockSession = createMockChatSession({ status: 'RESOLVED' });
      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: { session: mockSession } },
      });

      const resolutionData = {
        operatorId: 'op-123',
        resolution: 'Issue resolved successfully',
        customerSatisfaction: 5,
        tags: ['billing', 'resolved'],
      };

      const result = await client.resolveSession('session-123', resolutionData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/chat/sessions/session-123', {
        status: 'RESOLVED',
        metadata: expect.objectContaining({
          resolvedAt: expect.any(String),
          resolvedBy: 'op-123',
          resolution: 'Issue resolved successfully',
          customerSatisfaction: 5,
          tags: ['billing', 'resolved'],
        }),
      });
    });

    it('should close session', async () => {
      const mockSession = createMockChatSession({ status: 'CLOSED' });
      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: { session: mockSession } },
      });

      const result = await client.closeSession('session-123', 'op-123');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/chat/sessions/session-123', {
        status: 'CLOSED',
        metadata: expect.objectContaining({
          closedAt: expect.any(String),
          closedBy: 'op-123',
        }),
      });
    });
  });

  describe('User Management Methods', () => {
    it('should get users with filters', async () => {
      const mockUsers = [createMockOperator(), createMockOperator()];
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { users: mockUsers } },
      });

      const result = await client.getUsers({
        role: 'OPERATOR',
        status: 'ACTIVE',
        skip: 0,
        take: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data.users).toEqual(mockUsers);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users', {
        params: { role: 'OPERATOR', status: 'ACTIVE', skip: 0, take: 20 },
      });
    });

    it('should get operators', async () => {
      const mockOperators = [createMockOperator(), createMockOperator()];
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { users: mockOperators } },
      });

      const result = await client.getOperators();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users', {
        params: { role: 'OPERATOR' },
      });
    });

    it('should get operator profile', async () => {
      const mockOperator = createMockOperator();
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: { operator: mockOperator } },
      });

      const result = await client.getOperatorProfile('op-123');

      expect(result.success).toBe(true);
      expect(result.data.operator).toEqual(mockOperator);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/operators/op-123');
    });

    it('should update operator status', async () => {
      const mockOperator = createMockOperator({ status: 'BUSY' });
      mockAxiosInstance.put.mockResolvedValue({
        data: { success: true, data: { operator: mockOperator } },
      });

      const result = await client.updateOperatorStatus('op-123', 'BUSY');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/users/operators/op-123/status', {
        status: 'BUSY',
      });
    });
  });

  describe('Metrics and Analytics Methods', () => {
    it('should get general metrics', async () => {
      const mockMetrics = { totalChats: 100, activeOperators: 5 };
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.getMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/metrics/custom');
    });

    it('should get chat metrics', async () => {
      const mockMetrics = { totalSessions: 50, averageTime: 5.2 };
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.getChatMetrics('7d');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/analytics/chat', {
        params: { timeRange: '7d' },
      });
    });

    it('should get operator metrics', async () => {
      const mockMetrics = { sessionsHandled: 25, avgResponseTime: 1.5 };
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.getOperatorMetrics('op-123', '24h');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/analytics/operators/op-123', {
        params: { timeRange: '24h' },
      });
    });

    it('should get team metrics', async () => {
      const mockMetrics = { teamEfficiency: 0.85, totalResolutions: 120 };
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.getTeamMetrics('30d');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/analytics/team', {
        params: { timeRange: '30d' },
      });
    });
  });

  describe('Error Handling', () => {
    it('should identify service errors correctly', () => {
      const serviceError = { response: { status: 500 } };
      const clientError = { response: { status: 400 } };
      const networkError = { message: 'Network error' };

      expect(client.isServiceError(serviceError)).toBe(true);
      expect(client.isServiceError(clientError)).toBe(false);
      expect(client.isServiceError(networkError)).toBe(false);
    });

    it('should identify client errors correctly', () => {
      const serviceError = { response: { status: 500 } };
      const clientError = { response: { status: 404 } };
      const networkError = { message: 'Network error' };

      expect(client.isClientError(serviceError)).toBe(false);
      expect(client.isClientError(clientError)).toBe(true);
      expect(client.isClientError(networkError)).toBe(false);
    });

    it('should extract error messages', () => {
      const errorWithData = { response: { data: { error: 'Custom error message' } } };
      const errorWithMessage = { message: 'Network timeout' };
      const unknownError = {};

      expect(client.getErrorMessage(errorWithData)).toBe('Custom error message');
      expect(client.getErrorMessage(errorWithMessage)).toBe('Network timeout');
      expect(client.getErrorMessage(unknownError)).toBe('Unknown error occurred');
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch session updates', async () => {
      const updates = [
        { sessionId: 'session-1', data: { status: 'ACTIVE' } },
        { sessionId: 'session-2', data: { status: 'RESOLVED' } },
      ];

      mockAxiosInstance.patch
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true } });

      const results = await client.batchUpdateSessions(updates);

      expect(results).toHaveLength(2);
      expect(mockAxiosInstance.patch).toHaveBeenCalledTimes(2);
    });

    it('should handle batch operator assignments', async () => {
      const assignments = [
        { sessionId: 'session-1', operatorId: 'op-1' },
        { sessionId: 'session-2', operatorId: 'op-2' },
      ];

      mockAxiosInstance.patch
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true } });

      const results = await client.batchAssignSessions(assignments);

      expect(results).toHaveLength(2);
      expect(mockAxiosInstance.patch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, status: 'healthy' },
      });

      const result = await client.healthCheck();

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
    });
  });

  describe('WebSocket Integration', () => {
    it('should get WebSocket endpoint', async () => {
      const endpoint = await client.getWebSocketEndpoint();

      expect(endpoint).toBe('ws://localhost:3000/ws');
    });
  });
});