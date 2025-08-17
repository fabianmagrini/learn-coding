import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '@/features/chat/services/chatService';
import { createMockChatSession, createMockMessage } from '../../helpers/testHelpers';

// Mock the shared service client
const mockSharedServiceClient = {
  createChatSession: vi.fn(),
  sendMessage: vi.fn(),
  getChatSession: vi.fn(),
  getMessages: vi.fn(),
  escalateChat: vi.fn(),
  updateSession: vi.fn(),
};

vi.mock('@/shared/services/sharedServiceClient', () => ({
  SharedServiceClient: vi.fn(() => mockSharedServiceClient),
}));

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    chatService = new ChatService();
  });

  describe('createSession', () => {
    it('should create a new chat session', async () => {
      const mockSession = createMockChatSession();
      const sessionRequest = {
        customerId: 'user-123',
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

      const result = await chatService.createSession(sessionRequest);

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(mockSharedServiceClient.createChatSession).toHaveBeenCalledWith(sessionRequest);
    });

    it('should handle service failures', async () => {
      mockSharedServiceClient.createChatSession.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
      });

      const result = await chatService.createSession({
        customerId: 'user-123',
        subject: 'Test inquiry',
        customerData: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });

    it('should validate required fields', async () => {
      const result = await chatService.createSession({
        customerId: '',
        subject: 'Test inquiry',
        customerData: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer ID is required');
    });
  });

  describe('sendMessage', () => {
    it('should send message to session', async () => {
      const mockMessage = createMockMessage();
      const messageRequest = {
        sessionId: 'session-123',
        content: 'Hello, I need help',
        type: 'USER' as const,
        userId: 'user-123',
      };

      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockMessage },
      });

      const result = await chatService.sendMessage(messageRequest);

      expect(result.success).toBe(true);
      expect(result.data.message).toEqual(mockMessage);
      expect(mockSharedServiceClient.sendMessage).toHaveBeenCalledWith(messageRequest);
    });

    it('should sanitize message content', async () => {
      const mockMessage = createMockMessage();
      const messageWithHtml = {
        sessionId: 'session-123',
        content: '<script>alert("xss")</script>Hello world',
        type: 'USER' as const,
        userId: 'user-123',
      };

      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockMessage },
      });

      const result = await chatService.sendMessage(messageWithHtml);

      expect(result.success).toBe(true);
      
      // Check that the sanitized content was sent
      const calledWith = mockSharedServiceClient.sendMessage.mock.calls[0][0];
      expect(calledWith.content).toBe('Hello world');
      expect(calledWith.content).not.toContain('<script>');
    });

    it('should reject empty messages', async () => {
      const result = await chatService.sendMessage({
        sessionId: 'session-123',
        content: '',
        type: 'USER',
        userId: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message content cannot be empty');
    });

    it('should handle rate limiting', async () => {
      // Simulate multiple rapid messages
      const messageRequest = {
        sessionId: 'session-123',
        content: 'Test message',
        type: 'USER' as const,
        userId: 'user-123',
      };

      // Set up the service to track rate limiting
      chatService = new ChatService({ rateLimitWindow: 1000, rateLimitMax: 2 });

      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: createMockMessage() },
      });

      // Send allowed messages
      await chatService.sendMessage(messageRequest);
      await chatService.sendMessage(messageRequest);

      // Third message should be rate limited
      const result = await chatService.sendMessage(messageRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });

  describe('getSession', () => {
    it('should retrieve session with validation', async () => {
      const mockSession = createMockChatSession();

      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      const result = await chatService.getSession('session-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
    });

    it('should reject access to other users sessions', async () => {
      const otherUserSession = createMockChatSession({
        customerId: 'other-user-123',
      });

      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: true,
        data: { session: otherUserSession },
      });

      const result = await chatService.getSession('session-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('access denied');
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

      const result = await chatService.getMessages({
        sessionId: 'session-123',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.messages).toEqual(mockMessages);
    });

    it('should filter sensitive information from messages', async () => {
      const mockMessages = [
        createMockMessage({
          content: 'My credit card is 4111-1111-1111-1111',
          metadata: { systemInfo: 'internal data' },
        }),
      ];

      mockSharedServiceClient.getMessages.mockResolvedValue({
        success: true,
        data: { messages: mockMessages },
      });

      const result = await chatService.getMessages({
        sessionId: 'session-123',
      });

      expect(result.success).toBe(true);
      
      // Check that sensitive data was filtered
      const filteredMessage = result.data.messages[0];
      expect(filteredMessage.content).toContain('****');
      expect(filteredMessage.metadata.systemInfo).toBeUndefined();
    });
  });

  describe('escalateToHuman', () => {
    it('should escalate session with valid reason', async () => {
      const escalationRequest = {
        sessionId: 'session-123',
        customerId: 'user-123',
        reason: 'Complex technical issue requiring human expertise',
      };

      mockSharedServiceClient.escalateChat.mockResolvedValue({
        success: true,
        data: {
          escalated: true,
          queuePosition: 3,
          estimatedWaitTime: 5,
        },
      });

      const result = await chatService.escalateToHuman(escalationRequest);

      expect(result.success).toBe(true);
      expect(result.data.escalated).toBe(true);
      expect(result.data.queuePosition).toBe(3);
    });

    it('should validate escalation reason', async () => {
      const result = await chatService.escalateToHuman({
        sessionId: 'session-123',
        customerId: 'user-123',
        reason: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Escalation reason is required');
    });

    it('should prevent duplicate escalations', async () => {
      const escalationRequest = {
        sessionId: 'session-123',
        customerId: 'user-123',
        reason: 'Need human help',
      };

      // First escalation succeeds
      mockSharedServiceClient.escalateChat.mockResolvedValueOnce({
        success: true,
        data: { escalated: true },
      });

      await chatService.escalateToHuman(escalationRequest);

      // Second escalation should be rejected
      const result = await chatService.escalateToHuman(escalationRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already escalated');
    });
  });

  describe('formatResponse', () => {
    it('should format successful responses consistently', async () => {
      const mockSession = createMockChatSession();
      
      mockSharedServiceClient.createChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      const result = await chatService.createSession({
        customerId: 'user-123',
        subject: 'Test',
        customerData: {},
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should format error responses consistently', async () => {
      const result = await chatService.createSession({
        customerId: '',
        subject: 'Test',
        customerData: {},
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('connection handling', () => {
    it('should handle shared service connection failures', async () => {
      mockSharedServiceClient.createChatSession.mockRejectedValue(
        new Error('Connection timeout')
      );

      const result = await chatService.createSession({
        customerId: 'user-123',
        subject: 'Test',
        customerData: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('service unavailable');
    });

    it('should retry failed requests', async () => {
      // First call fails, second succeeds
      mockSharedServiceClient.createChatSession
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { session: createMockChatSession() },
        });

      const result = await chatService.createSession({
        customerId: 'user-123',
        subject: 'Test',
        customerData: {},
      });

      expect(result.success).toBe(true);
      expect(mockSharedServiceClient.createChatSession).toHaveBeenCalledTimes(2);
    });
  });
});