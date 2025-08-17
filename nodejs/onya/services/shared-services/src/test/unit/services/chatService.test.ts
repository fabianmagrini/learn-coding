import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedChatService } from '@/services/chat-engine/enhancedChatService';
import { MockLLMService } from '@/services/llm/services/mockLlmService';
import { prisma } from '../../setup';
import { createTestUser, createTestChatSession, createTestMessage } from '../../helpers/testHelpers';
import { ChatSessionStatus, MessageType, Role } from '@prisma/client';

describe('EnhancedChatService', () => {
  let chatService: EnhancedChatService;
  let mockLLMService: MockLLMService;

  beforeEach(() => {
    mockLLMService = new MockLLMService();
    chatService = new EnhancedChatService(mockLLMService);
  });

  describe('createSession', () => {
    it('should create a new chat session', async () => {
      const customer = await createTestUser({ role: Role.CUSTOMER });

      const session = await chatService.createSession(customer.id, {
        subject: 'Test inquiry',
        priority: 'MEDIUM',
        skills: ['general'],
      });

      expect(session).toBeDefined();
      expect(session.customerId).toBe(customer.id);
      expect(session.status).toBe(ChatSessionStatus.ACTIVE);
      expect(session.metadata.subject).toBe('Test inquiry');
    });

    it('should validate required fields', async () => {
      const customer = await createTestUser({ role: Role.CUSTOMER });

      await expect(chatService.createSession(customer.id, {}))
        .rejects.toThrow('Subject is required');
    });
  });

  describe('sendMessage', () => {
    it('should add user message to session', async () => {
      const customer = await createTestUser({ role: Role.CUSTOMER });
      const session = await createTestChatSession({ customerId: customer.id });

      const message = await chatService.sendMessage(session.id, {
        content: 'Hello, I need help',
        type: MessageType.USER,
        userId: customer.id,
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, I need help');
      expect(message.type).toBe(MessageType.USER);
      expect(message.sessionId).toBe(session.id);
    });

    it('should generate LLM response for user messages', async () => {
      const customer = await createTestUser({ role: Role.CUSTOMER });
      const session = await createTestChatSession({ customerId: customer.id });

      const userMessage = await chatService.sendMessage(session.id, {
        content: 'I need help with my account',
        type: MessageType.USER,
        userId: customer.id,
      });

      // Wait for LLM response to be generated
      await new Promise(resolve => setTimeout(resolve, 100));

      const messages = await prisma.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe(MessageType.USER);
      expect(messages[1].type).toBe(MessageType.LLM);
      expect(messages[1].content).toContain('help');
    });

    it('should not generate LLM response for operator messages', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      const session = await createTestChatSession();

      await chatService.sendMessage(session.id, {
        content: 'Hello, how can I help?',
        type: MessageType.OPERATOR,
        userId: operator.id,
      });

      // Wait a bit to ensure no LLM response is generated
      await new Promise(resolve => setTimeout(resolve, 100));

      const messages = await prisma.message.findMany({
        where: { sessionId: session.id },
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe(MessageType.OPERATOR);
    });
  });

  describe('getSessionMessages', () => {
    it('should return messages in chronological order', async () => {
      const session = await createTestChatSession();
      
      const message1 = await createTestMessage({
        sessionId: session.id,
        content: 'First message',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });
      
      const message2 = await createTestMessage({
        sessionId: session.id,
        content: 'Second message',
        createdAt: new Date('2024-01-01T10:01:00Z'),
      });

      const messages = await chatService.getSessionMessages(session.id);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    it('should limit messages when specified', async () => {
      const session = await createTestChatSession();
      
      for (let i = 1; i <= 5; i++) {
        await createTestMessage({
          sessionId: session.id,
          content: `Message ${i}`,
        });
      }

      const messages = await chatService.getSessionMessages(session.id, 3);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 3'); // Most recent 3
      expect(messages[2].content).toBe('Message 5');
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      const session = await createTestChatSession({
        status: ChatSessionStatus.ACTIVE,
      });

      const updatedSession = await chatService.updateSessionStatus(
        session.id,
        ChatSessionStatus.RESOLVED
      );

      expect(updatedSession.status).toBe(ChatSessionStatus.RESOLVED);
    });

    it('should update session timestamp', async () => {
      const session = await createTestChatSession();
      const originalTimestamp = session.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedSession = await chatService.updateSessionStatus(
        session.id,
        ChatSessionStatus.RESOLVED
      );

      expect(updatedSession.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });
  });

  describe('assignOperator', () => {
    it('should assign operator to session', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      const session = await createTestChatSession();

      const updatedSession = await chatService.assignOperator(session.id, operator.id);

      expect(updatedSession.operatorId).toBe(operator.id);
      expect(updatedSession.status).toBe(ChatSessionStatus.ACTIVE);
    });

    it('should create system message for operator assignment', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      const session = await createTestChatSession();

      await chatService.assignOperator(session.id, operator.id);

      const systemMessages = await prisma.message.findMany({
        where: {
          sessionId: session.id,
          type: MessageType.SYSTEM,
        },
      });

      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).toContain('Operator assigned');
    });
  });

  describe('escalateSession', () => {
    it('should escalate session and update metadata', async () => {
      const session = await createTestChatSession();
      const escalationData = {
        reason: 'Complex technical issue',
        priority: 'HIGH',
        operatorId: 'operator-123',
      };

      const updatedSession = await chatService.escalateSession(session.id, escalationData);

      expect(updatedSession.status).toBe(ChatSessionStatus.ESCALATED);
      expect(updatedSession.metadata.escalationReason).toBe(escalationData.reason);
      expect(updatedSession.metadata.priority).toBe(escalationData.priority);
    });

    it('should create system message for escalation', async () => {
      const session = await createTestChatSession();

      await chatService.escalateSession(session.id, {
        reason: 'Technical issue',
        operatorId: 'operator-123',
      });

      const systemMessages = await prisma.message.findMany({
        where: {
          sessionId: session.id,
          type: MessageType.SYSTEM,
        },
      });

      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).toContain('escalated');
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions', async () => {
      const customer1 = await createTestUser({ role: Role.CUSTOMER });
      const customer2 = await createTestUser({ role: Role.CUSTOMER });

      await createTestChatSession({
        customerId: customer1.id,
        status: ChatSessionStatus.ACTIVE,
      });

      await createTestChatSession({
        customerId: customer2.id,
        status: ChatSessionStatus.RESOLVED,
      });

      const activeSessions = await chatService.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].status).toBe(ChatSessionStatus.ACTIVE);
    });

    it('should include message count', async () => {
      const session = await createTestChatSession();
      
      await createTestMessage({ sessionId: session.id });
      await createTestMessage({ sessionId: session.id });

      const activeSessions = await chatService.getActiveSessions();

      expect(activeSessions[0]._count.messages).toBe(2);
    });
  });

  describe('getSessionsByOperator', () => {
    it('should return sessions assigned to specific operator', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      
      await createTestChatSession({ operatorId: operator.id });
      await createTestChatSession({ operatorId: 'other-operator' });
      await createTestChatSession({ operatorId: null });

      const operatorSessions = await chatService.getSessionsByOperator(operator.id);

      expect(operatorSessions).toHaveLength(1);
      expect(operatorSessions[0].operatorId).toBe(operator.id);
    });
  });

  describe('searchSessions', () => {
    it('should search sessions by customer email', async () => {
      const customer = await createTestUser({ 
        email: 'search@example.com',
        role: Role.CUSTOMER 
      });
      
      await createTestChatSession({ customerId: customer.id });
      await createTestChatSession({ customerId: 'other-customer' });

      const results = await chatService.searchSessions({
        customerEmail: 'search@example.com',
      });

      expect(results).toHaveLength(1);
      expect(results[0].customerId).toBe(customer.id);
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      await createTestChatSession({
        createdAt: today,
      });

      await createTestChatSession({
        createdAt: yesterday,
      });

      const results = await chatService.searchSessions({
        startDate: today,
        endDate: today,
      });

      expect(results).toHaveLength(1);
    });
  });
});