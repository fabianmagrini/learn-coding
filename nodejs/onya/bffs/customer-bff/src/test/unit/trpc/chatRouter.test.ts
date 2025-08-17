import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chatRouter } from '@/trpc/routers/chatRouter';
import { createMockContext, createAuthenticatedContext, createMockUser, createMockChatSession, createMockMessage } from '../../helpers/testHelpers';
import { TRPCError } from '@trpc/server';

// Mock the shared service client
const mockSharedServiceClient = {
  createChatSession: vi.fn(),
  sendMessage: vi.fn(),
  getChatSession: vi.fn(),
  getMessages: vi.fn(),
  escalateChat: vi.fn(),
  healthCheck: vi.fn(),
};

vi.mock('@/shared/services/sharedServiceClient', () => ({
  SharedServiceClient: vi.fn(() => mockSharedServiceClient),
}));

describe('ChatRouter', () => {
  let caller: any;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = createMockUser();
    const ctx = createAuthenticatedContext(mockUser);
    caller = chatRouter.createCaller(ctx as any);
  });

  describe('startSession', () => {
    it('should create a new chat session', async () => {
      const mockSession = createMockChatSession();
      const sessionData = {
        subject: 'Test inquiry',
        customerData: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockSharedServiceClient.createChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      const result = await caller.startSession(sessionData);

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(mockSharedServiceClient.createChatSession).toHaveBeenCalledWith({
        customerId: mockUser.id,
        ...sessionData,
      });
    });

    it('should handle service errors', async () => {
      mockSharedServiceClient.createChatSession.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
      });

      await expect(
        caller.startSession({
          subject: 'Test inquiry',
          customerData: {},
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should validate required fields', async () => {
      await expect(
        caller.startSession({
          subject: '', // Empty subject
          customerData: {},
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('sendMessage', () => {
    it('should send a message to existing session', async () => {
      const mockMessage = createMockMessage();
      const messageData = {
        sessionId: 'session-123',
        content: 'Hello, I need help',
      };

      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockMessage },
      });

      const result = await caller.sendMessage(messageData);

      expect(result.success).toBe(true);
      expect(result.data.message).toEqual(mockMessage);
      expect(mockSharedServiceClient.sendMessage).toHaveBeenCalledWith({
        ...messageData,
        type: 'USER',
        userId: mockUser.id,
      });
    });

    it('should handle empty messages', async () => {
      await expect(
        caller.sendMessage({
          sessionId: 'session-123',
          content: '',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should handle service errors', async () => {
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      await expect(
        caller.sendMessage({
          sessionId: 'invalid-session',
          content: 'Test message',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getSession', () => {
    it('should retrieve session with messages', async () => {
      const mockSession = createMockChatSession();
      const mockMessages = [
        createMockMessage({ type: 'USER', content: 'Hello' }),
        createMockMessage({ type: 'LLM', content: 'Hi there!' }),
      ];

      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      mockSharedServiceClient.getMessages.mockResolvedValue({
        success: true,
        data: { messages: mockMessages },
      });

      const result = await caller.getSession({ sessionId: 'session-123' });

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(result.data.messages).toEqual(mockMessages);
    });

    it('should handle non-existent session', async () => {
      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      await expect(
        caller.getSession({ sessionId: 'non-existent' })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages for session', async () => {
      const mockMessages = [
        createMockMessage({ content: 'First message' }),
        createMockMessage({ content: 'Second message' }),
      ];

      mockSharedServiceClient.getMessages.mockResolvedValue({
        success: true,
        data: { messages: mockMessages },
      });

      const result = await caller.getMessages({
        sessionId: 'session-123',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.messages).toEqual(mockMessages);
      expect(mockSharedServiceClient.getMessages).toHaveBeenCalledWith({
        sessionId: 'session-123',
        limit: 10,
      });
    });

    it('should use default limit when not specified', async () => {
      mockSharedServiceClient.getMessages.mockResolvedValue({
        success: true,
        data: { messages: [] },
      });

      await caller.getMessages({ sessionId: 'session-123' });

      expect(mockSharedServiceClient.getMessages).toHaveBeenCalledWith({
        sessionId: 'session-123',
        limit: 50,
      });
    });
  });

  describe('escalateToHuman', () => {
    it('should escalate session to human operator', async () => {
      const escalationData = {
        sessionId: 'session-123',
        reason: 'Complex technical issue',
      };

      mockSharedServiceClient.escalateChat.mockResolvedValue({
        success: true,
        data: {
          escalated: true,
          queuePosition: 3,
          estimatedWaitTime: 5,
        },
      });

      const result = await caller.escalateToHuman(escalationData);

      expect(result.success).toBe(true);
      expect(result.data.escalated).toBe(true);
      expect(mockSharedServiceClient.escalateChat).toHaveBeenCalledWith({
        ...escalationData,
        customerId: mockUser.id,
      });
    });

    it('should validate escalation reason', async () => {
      await expect(
        caller.escalateToHuman({
          sessionId: 'session-123',
          reason: '', // Empty reason
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('health check', () => {
    it('should return service health status', async () => {
      mockSharedServiceClient.healthCheck.mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });

      const result = await caller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
    });
  });

  describe('unauthorized access', () => {
    it('should reject requests without authentication', async () => {
      const unauthenticatedCaller = chatRouter.createCaller(createMockContext() as any);

      await expect(
        unauthenticatedCaller.startSession({
          subject: 'Test inquiry',
          customerData: {},
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('session validation', () => {
    it('should validate session ownership', async () => {
      // Mock a session owned by a different user
      const otherUserSession = createMockChatSession({
        customerId: 'other-user-123',
      });

      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: true,
        data: { session: otherUserSession },
      });

      await expect(
        caller.sendMessage({
          sessionId: 'session-123',
          content: 'Test message',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('input validation', () => {
    it('should validate session ID format', async () => {
      await expect(
        caller.getSession({ sessionId: '' })
      ).rejects.toThrow();
    });

    it('should validate message content length', async () => {
      const longMessage = 'a'.repeat(5001); // Assuming 5000 char limit

      await expect(
        caller.sendMessage({
          sessionId: 'session-123',
          content: longMessage,
        })
      ).rejects.toThrow();
    });

    it('should sanitize message content', async () => {
      const messageWithHtml = '<script>alert("xss")</script>Hello';
      
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: createMockMessage() },
      });

      await caller.sendMessage({
        sessionId: 'session-123',
        content: messageWithHtml,
      });

      // Check that HTML was sanitized
      const calledWith = mockSharedServiceClient.sendMessage.mock.calls[0][0];
      expect(calledWith.content).not.toContain('<script>');
      expect(calledWith.content).toBe('Hello');
    });
  });
});