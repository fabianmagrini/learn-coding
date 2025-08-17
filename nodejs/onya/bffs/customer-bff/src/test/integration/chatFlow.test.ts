import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { createMockUser, createMockChatSession, createMockMessage } from '../helpers/testHelpers';
import jwt from 'jsonwebtoken';

// Mock the shared service client for integration tests
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

describe('Customer BFF Integration Tests', () => {
  let mockUser: any;
  let authToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = createMockUser();
    authToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
      'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Complete Chat Flow', () => {
    it('should handle complete customer chat journey via tRPC', async () => {
      const mockSession = createMockChatSession();
      const mockUserMessage = createMockMessage({ type: 'USER', content: 'I need help' });
      const mockBotMessage = createMockMessage({ type: 'LLM', content: 'How can I help you?' });

      // 1. Start a new chat session
      mockSharedServiceClient.createChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      const startSessionResponse = await request(app)
        .post('/api/trpc/chat.startSession')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            subject: 'Need assistance with my order',
            customerData: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        })
        .expect(200);

      expect(startSessionResponse.body.result.data.success).toBe(true);
      expect(startSessionResponse.body.result.data.data.session.id).toBe(mockSession.id);

      // 2. Send a message
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockUserMessage },
      });

      const sendMessageResponse = await request(app)
        .post('/api/trpc/chat.sendMessage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: mockSession.id,
            content: 'I need help with my recent order',
          },
        })
        .expect(200);

      expect(sendMessageResponse.body.result.data.success).toBe(true);

      // 3. Get session with messages
      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      mockSharedServiceClient.getMessages.mockResolvedValue({
        success: true,
        data: { messages: [mockUserMessage, mockBotMessage] },
      });

      const getSessionResponse = await request(app)
        .post('/api/trpc/chat.getSession')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: { sessionId: mockSession.id },
        })
        .expect(200);

      expect(getSessionResponse.body.result.data.success).toBe(true);
      expect(getSessionResponse.body.result.data.data.messages).toHaveLength(2);

      // 4. Escalate to human
      mockSharedServiceClient.escalateChat.mockResolvedValue({
        success: true,
        data: {
          escalated: true,
          queuePosition: 2,
          estimatedWaitTime: 3,
        },
      });

      const escalateResponse = await request(app)
        .post('/api/trpc/chat.escalateToHuman')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: mockSession.id,
            reason: 'I need to speak with a human agent about my billing issue',
          },
        })
        .expect(200);

      expect(escalateResponse.body.result.data.success).toBe(true);
      expect(escalateResponse.body.result.data.data.escalated).toBe(true);
      expect(escalateResponse.body.result.data.data.queuePosition).toBe(2);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .post('/api/trpc/chat.startSession')
        .send({
          json: {
            subject: 'Test inquiry',
            customerData: {},
          },
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/trpc/chat.startSession')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          json: {
            subject: 'Test inquiry',
            customerData: {},
          },
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should validate session ownership', async () => {
      const otherUserSession = createMockChatSession({
        customerId: 'other-user-123',
      });

      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: true,
        data: { session: otherUserSession },
      });

      const response = await request(app)
        .post('/api/trpc/chat.sendMessage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: otherUserSession.id,
            content: 'Test message',
          },
        })
        .expect(200);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in startSession', async () => {
      const response = await request(app)
        .post('/api/trpc/chat.startSession')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            subject: '', // Empty subject
            customerData: {},
          },
        })
        .expect(400);

      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should validate message content', async () => {
      const response = await request(app)
        .post('/api/trpc/chat.sendMessage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: 'session-123',
            content: '', // Empty content
          },
        })
        .expect(400);

      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should sanitize HTML content', async () => {
      const mockMessage = createMockMessage();
      
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockMessage },
      });

      await request(app)
        .post('/api/trpc/chat.sendMessage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: 'session-123',
            content: '<script>alert("xss")</script>Hello world',
          },
        })
        .expect(200);

      // Verify the sanitized content was sent to the service
      const calledWith = mockSharedServiceClient.sendMessage.mock.calls[0][0];
      expect(calledWith.content).toBe('Hello world');
      expect(calledWith.content).not.toContain('<script>');
    });
  });

  describe('Error Handling', () => {
    it('should handle shared service unavailability', async () => {
      mockSharedServiceClient.createChatSession.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/trpc/chat.startSession')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            subject: 'Test inquiry',
            customerData: {},
          },
        })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle invalid session IDs', async () => {
      mockSharedServiceClient.getChatSession.mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      const response = await request(app)
        .post('/api/trpc/chat.getSession')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: { sessionId: 'invalid-session-id' },
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Health Check', () => {
    it('should return service health status', async () => {
      mockSharedServiceClient.healthCheck.mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });

      const response = await request(app)
        .post('/api/trpc/chat.healthCheck')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.result.data.success).toBe(true);
      expect(response.body.result.data.data.status).toBe('healthy');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on message sending', async () => {
      const mockMessage = createMockMessage();
      
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockMessage },
      });

      // Send multiple messages rapidly
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/trpc/chat.sendMessage')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            json: {
              sessionId: 'session-123',
              content: `Message ${i}`,
            },
          })
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle WebSocket message events', async () => {
      // This would test WebSocket integration if implemented
      // For now, we'll test the HTTP endpoints that would trigger WebSocket events
      
      const mockMessage = createMockMessage();
      
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: mockMessage },
      });

      const response = await request(app)
        .post('/api/trpc/chat.sendMessage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: 'session-123',
            content: 'Test WebSocket message',
          },
        })
        .expect(200);

      expect(response.body.result.data.success).toBe(true);
      
      // In a real implementation, we would verify that:
      // 1. WebSocket message was broadcast to connected clients
      // 2. Real-time updates were sent to operators
      // 3. Event was logged for analytics
    });
  });

  describe('Escalation Flow', () => {
    it('should handle complete escalation workflow', async () => {
      const mockSession = createMockChatSession();

      // 1. Customer starts with bot
      mockSharedServiceClient.createChatSession.mockResolvedValue({
        success: true,
        data: { session: mockSession },
      });

      await request(app)
        .post('/api/trpc/chat.startSession')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            subject: 'Complex billing issue',
            customerData: { name: 'John Doe' },
          },
        })
        .expect(200);

      // 2. Customer interacts with bot
      mockSharedServiceClient.sendMessage.mockResolvedValue({
        success: true,
        data: { message: createMockMessage() },
      });

      await request(app)
        .post('/api/trpc/chat.sendMessage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: mockSession.id,
            content: 'I need help with my billing dispute',
          },
        })
        .expect(200);

      // 3. Customer requests human escalation
      mockSharedServiceClient.escalateChat.mockResolvedValue({
        success: true,
        data: {
          escalated: true,
          queuePosition: 1,
          estimatedWaitTime: 2,
          operatorId: null,
        },
      });

      const escalateResponse = await request(app)
        .post('/api/trpc/chat.escalateToHuman')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          json: {
            sessionId: mockSession.id,
            reason: 'The bot cannot help with my billing dispute. I need a human agent.',
          },
        })
        .expect(200);

      expect(escalateResponse.body.result.data.data.escalated).toBe(true);
      expect(escalateResponse.body.result.data.data.queuePosition).toBe(1);

      // Verify all service calls were made correctly
      expect(mockSharedServiceClient.createChatSession).toHaveBeenCalled();
      expect(mockSharedServiceClient.sendMessage).toHaveBeenCalled();
      expect(mockSharedServiceClient.escalateChat).toHaveBeenCalledWith({
        sessionId: mockSession.id,
        customerId: mockUser.id,
        reason: 'The bot cannot help with my billing dispute. I need a human agent.',
      });
    });
  });
});