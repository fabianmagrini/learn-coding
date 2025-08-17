import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '@/features/chat/hooks/useChat';
import { mockTrpcClient } from '../__mocks__/trpc';
import { mockCreate } from '../__mocks__/zustand';

// Mock the chat store
const mockChatStore = {
  currentSession: null,
  messages: [],
  isSending: false,
  escalationStatus: { escalated: false, operatorId: null },
  customerId: 'test-customer',
  setCurrentSession: vi.fn(),
  addMessage: vi.fn(),
  setMessages: vi.fn(),
  setIsSending: vi.fn(),
  setEscalationStatus: vi.fn(),
};

vi.mock('@/shared/stores/chatStore', () => ({
  useChatStore: () => mockChatStore,
}));

// Mock tRPC client
vi.mock('@/shared/trpc/client', () => ({
  trpc: mockTrpcClient,
}));

describe('useChat hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockTrpcClient.chat.createSession.useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
      error: null,
      data: null,
    });

    mockTrpcClient.chat.sendMessage.useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
      error: null,
      data: null,
    });

    mockTrpcClient.chat.getChatHistory.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.currentSession).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.isSending).toBe(false);
    expect(result.current.escalationStatus).toEqual({ escalated: false, operatorId: null });
    expect(result.current.isCreatingSession).toBe(false);
  });

  it('creates a session successfully', async () => {
    const mockSession = { id: 'session-123', status: 'active' };
    const mockMutateAsync = vi.fn().mockResolvedValue({ session: mockSession });
    
    mockTrpcClient.chat.createSession.useMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: null,
      data: null,
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.createSession();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      customerData: {
        tier: 'basic',
      },
    });
  });

  it('sends a message successfully', async () => {
    const mockSession = { id: 'session-123', status: 'active' };
    const mockResponse = {
      message: { id: 'msg-456', content: 'Bot response', type: 'bot' },
      escalationStatus: { escalated: false, operatorId: null },
    };
    const mockMutateAsync = vi.fn().mockResolvedValue(mockResponse);
    
    // Set up store with active session
    Object.assign(mockChatStore, {
      currentSession: mockSession,
    });

    mockTrpcClient.chat.sendMessage.useMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: null,
      data: null,
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello bot');
    });

    // Should add user message immediately
    expect(mockChatStore.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Hello bot',
        type: 'user',
        sessionId: 'session-123',
        userId: 'test-customer',
      })
    );

    // Should send message to backend
    expect(mockMutateAsync).toHaveBeenCalledWith({
      message: 'Hello bot',
      sessionId: 'session-123',
    });
  });

  it('throws error when sending message without session', async () => {
    // No session in store
    Object.assign(mockChatStore, {
      currentSession: null,
    });

    const { result } = renderHook(() => useChat());

    await expect(async () => {
      await act(async () => {
        await result.current.sendMessage('Hello bot');
      });
    }).rejects.toThrow('No active session');
  });

  it('shows loading state when creating session', () => {
    mockTrpcClient.chat.createSession.useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: true,
      error: null,
      data: null,
    });

    const { result } = renderHook(() => useChat());

    expect(result.current.isCreatingSession).toBe(true);
  });

  it('loads chat history when session is available', () => {
    const mockSession = { id: 'session-123', status: 'active' };
    const mockMessages = [
      { id: '1', content: 'Hello', type: 'user' },
      { id: '2', content: 'Hi there!', type: 'bot' },
    ];

    Object.assign(mockChatStore, {
      currentSession: mockSession,
    });

    mockTrpcClient.chat.getChatHistory.useQuery.mockReturnValue({
      data: { messages: mockMessages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderHook(() => useChat());

    expect(mockTrpcClient.chat.getChatHistory.useQuery).toHaveBeenCalledWith(
      { sessionId: 'session-123' },
      expect.objectContaining({
        enabled: true,
        refetchOnWindowFocus: false,
      })
    );
  });

  it('sets up real-time message subscription when session is available', () => {
    const mockSession = { id: 'session-123', status: 'active' };

    Object.assign(mockChatStore, {
      currentSession: mockSession,
    });

    renderHook(() => useChat());

    expect(mockTrpcClient.chat.onNewMessage.useSubscription).toHaveBeenCalledWith(
      { sessionId: 'session-123' },
      expect.objectContaining({
        enabled: true,
        onData: expect.any(Function),
      })
    );
  });

  it('sets up real-time escalation subscription when session is available', () => {
    const mockSession = { id: 'session-123', status: 'active' };

    Object.assign(mockChatStore, {
      currentSession: mockSession,
    });

    renderHook(() => useChat());

    expect(mockTrpcClient.escalation.onEscalationStatusChange.useSubscription).toHaveBeenCalledWith(
      { sessionId: 'session-123' },
      expect.objectContaining({
        enabled: true,
        onData: expect.any(Function),
      })
    );
  });

  it('handles real-time message updates', () => {
    const mockSession = { id: 'session-123', status: 'active' };
    const mockOnData = vi.fn();

    Object.assign(mockChatStore, {
      currentSession: mockSession,
    });

    mockTrpcClient.chat.onNewMessage.useSubscription.mockImplementation((params, options) => {
      if (options?.onData) {
        mockOnData.mockImplementation(options.onData);
      }
    });

    renderHook(() => useChat());

    const newMessage = { id: 'new-msg', content: 'New message', type: 'bot' };
    act(() => {
      mockOnData(newMessage);
    });

    expect(mockChatStore.addMessage).toHaveBeenCalledWith(newMessage);
  });

  it('handles real-time escalation updates', () => {
    const mockSession = { id: 'session-123', status: 'active' };
    const mockOnData = vi.fn();

    Object.assign(mockChatStore, {
      currentSession: mockSession,
    });

    mockTrpcClient.escalation.onEscalationStatusChange.useSubscription.mockImplementation((params, options) => {
      if (options?.onData) {
        mockOnData.mockImplementation(options.onData);
      }
    });

    renderHook(() => useChat());

    const escalationUpdate = {
      escalationStatus: { escalated: true, operatorId: 'op-123' },
    };
    
    act(() => {
      mockOnData(escalationUpdate);
    });

    expect(mockChatStore.setEscalationStatus).toHaveBeenCalledWith({
      escalated: true,
      operatorId: 'op-123',
    });
  });

  it('updates messages when chat history changes', () => {
    const mockMessages = [
      { id: '1', content: 'Hello', type: 'user' },
      { id: '2', content: 'Hi there!', type: 'bot' },
    ];

    // Mock useEffect behavior by calling setMessages when data changes
    let currentData: any = undefined;
    
    vi.spyOn(require('react'), 'useEffect').mockImplementation((callback, deps) => {
      const newData = deps?.[0]?.messages;
      if (newData !== currentData) {
        currentData = newData;
        if (newData) {
          callback();
        }
      }
    });

    mockTrpcClient.chat.getChatHistory.useQuery.mockReturnValue({
      data: { messages: mockMessages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderHook(() => useChat());

    expect(mockChatStore.setMessages).toHaveBeenCalledWith(mockMessages);
  });

  it('handles sending mutation states correctly', () => {
    let mockOnMutate: (() => void) | undefined;
    let mockOnSuccess: ((data: any) => void) | undefined;
    let mockOnSettled: (() => void) | undefined;

    mockTrpcClient.chat.sendMessage.useMutation.mockImplementation((options) => {
      mockOnMutate = options?.onMutate;
      mockOnSuccess = options?.onSuccess;
      mockOnSettled = options?.onSettled;
      
      return {
        mutateAsync: vi.fn(),
        isLoading: false,
        error: null,
        data: null,
      };
    });

    renderHook(() => useChat());

    // Test onMutate
    if (mockOnMutate) {
      act(() => {
        mockOnMutate();
      });
      expect(mockChatStore.setIsSending).toHaveBeenCalledWith(true);
    }

    // Test onSuccess
    if (mockOnSuccess) {
      const responseData = {
        message: { id: 'msg-123', content: 'Response', type: 'bot' },
        escalationStatus: { escalated: false, operatorId: null },
      };
      
      act(() => {
        mockOnSuccess(responseData);
      });
      
      expect(mockChatStore.addMessage).toHaveBeenCalledWith(responseData.message);
      expect(mockChatStore.setEscalationStatus).toHaveBeenCalledWith(responseData.escalationStatus);
    }

    // Test onSettled
    if (mockOnSettled) {
      act(() => {
        mockOnSettled();
      });
      expect(mockChatStore.setIsSending).toHaveBeenCalledWith(false);
    }
  });

  it('works with custom sessionId parameter', () => {
    const customSessionId = 'custom-session-456';

    renderHook(() => useChat(customSessionId));

    expect(mockTrpcClient.chat.getChatHistory.useQuery).toHaveBeenCalledWith(
      { sessionId: customSessionId },
      expect.any(Object)
    );

    expect(mockTrpcClient.chat.onNewMessage.useSubscription).toHaveBeenCalledWith(
      { sessionId: customSessionId },
      expect.any(Object)
    );

    expect(mockTrpcClient.escalation.onEscalationStatusChange.useSubscription).toHaveBeenCalledWith(
      { sessionId: customSessionId },
      expect.any(Object)
    );
  });

  it('disables queries and subscriptions when no session is available', () => {
    Object.assign(mockChatStore, {
      currentSession: null,
    });

    renderHook(() => useChat());

    expect(mockTrpcClient.chat.getChatHistory.useQuery).toHaveBeenCalledWith(
      { sessionId: '' },
      expect.objectContaining({
        enabled: false,
      })
    );

    expect(mockTrpcClient.chat.onNewMessage.useSubscription).toHaveBeenCalledWith(
      { sessionId: '' },
      expect.objectContaining({
        enabled: false,
      })
    );

    expect(mockTrpcClient.escalation.onEscalationStatusChange.useSubscription).toHaveBeenCalledWith(
      { sessionId: '' },
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('provides refetch functionality', () => {
    const mockRefetch = vi.fn();
    
    mockTrpcClient.chat.getChatHistory.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useChat());

    expect(result.current.refetchHistory).toBe(mockRefetch);
  });

  it('exposes mutations for direct access', () => {
    const mockCreateMutation = { mutateAsync: vi.fn(), isLoading: false };
    const mockSendMutation = { mutateAsync: vi.fn(), isLoading: false };

    mockTrpcClient.chat.createSession.useMutation.mockReturnValue(mockCreateMutation);
    mockTrpcClient.chat.sendMessage.useMutation.mockReturnValue(mockSendMutation);

    const { result } = renderHook(() => useChat());

    expect(result.current.createSessionMutation).toBe(mockCreateMutation);
    expect(result.current.sendMessageMutation).toBe(mockSendMutation);
  });
});