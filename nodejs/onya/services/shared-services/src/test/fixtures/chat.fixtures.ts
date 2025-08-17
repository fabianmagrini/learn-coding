import { ChatSessionStatus, MessageType } from '@prisma/client';

export const createChatSessionData = (overrides: Partial<any> = {}) => ({
  customerId: 'user-123',
  status: ChatSessionStatus.ACTIVE,
  metadata: {
    subject: 'Test inquiry',
    priority: 'MEDIUM',
    skills: ['general'],
  },
  ...overrides,
});

export const createMessageData = (overrides: Partial<any> = {}) => ({
  sessionId: 'session-123',
  content: 'Test message content',
  type: MessageType.USER,
  userId: 'user-123',
  metadata: {},
  ...overrides,
});

export const createOperatorMessageData = (overrides: Partial<any> = {}) => ({
  ...createMessageData(),
  type: MessageType.OPERATOR,
  userId: 'operator-123',
  metadata: {
    operatorId: 'operator-123',
  },
  ...overrides,
});

export const createLLMMessageData = (overrides: Partial<any> = {}) => ({
  ...createMessageData(),
  type: MessageType.LLM,
  userId: null,
  metadata: {
    model: 'mock-llm',
    responseTime: 250,
  },
  ...overrides,
});