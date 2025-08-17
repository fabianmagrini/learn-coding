import { vi } from 'vitest';

// Mock Zustand store
export const mockChatStore = {
  currentSession: null,
  messages: [],
  isSending: false,
  escalationStatus: 'NONE',
  customerId: 'test-customer',
  setCurrentSession: vi.fn(),
  addMessage: vi.fn(),
  setMessages: vi.fn(),
  setIsSending: vi.fn(),
  setEscalationStatus: vi.fn(),
  clearChat: vi.fn(),
};

// Mock Zustand create function
export const mockCreate = vi.fn(() => () => mockChatStore);