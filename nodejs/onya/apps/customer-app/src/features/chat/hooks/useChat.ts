import { useCallback, useEffect } from 'react';
import { trpc } from '@/shared/trpc/client';
import { useChatStore } from '@/shared/stores/chatStore';

export const useChat = (sessionId?: string) => {
  const {
    currentSession,
    messages,
    isSending,
    escalationStatus,
    customerId,
    setCurrentSession,
    addMessage,
    setMessages,
    setIsSending,
    setEscalationStatus,
  } = useChatStore();

  // Create session mutation
  const createSessionMutation = trpc.chat.createSession.useMutation({
    onSuccess: (data) => {
      setCurrentSession(data.session);
    },
  });

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onMutate: () => {
      setIsSending(true);
    },
    onSuccess: (data) => {
      addMessage(data.message);
      setEscalationStatus(data.escalationStatus);
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  // Get chat history query
  const { data: chatHistory, refetch: refetchHistory } = trpc.chat.getChatHistory.useQuery(
    { sessionId: sessionId || currentSession?.id || '' },
    {
      enabled: !!(sessionId || currentSession?.id),
      refetchOnWindowFocus: false,
    }
  );

  // Real-time message subscription
  trpc.chat.onNewMessage.useSubscription(
    { sessionId: sessionId || currentSession?.id || '' },
    {
      enabled: !!(sessionId || currentSession?.id),
      onData: (message) => {
        addMessage(message);
      },
    }
  );

  // Real-time escalation subscription
  trpc.escalation.onEscalationStatusChange.useSubscription(
    { sessionId: sessionId || currentSession?.id || '' },
    {
      enabled: !!(sessionId || currentSession?.id),
      onData: (data) => {
        setEscalationStatus(data.escalationStatus);
      },
    }
  );

  // Update messages when chat history is loaded
  useEffect(() => {
    if (chatHistory?.messages) {
      setMessages(chatHistory.messages);
    }
  }, [chatHistory, setMessages]);

  // Create a new chat session
  const createSession = useCallback(async () => {
    return createSessionMutation.mutateAsync({
      customerData: {
        tier: 'basic', // This would come from user context
      },
    });
  }, [createSessionMutation]);

  // Send a message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!currentSession) {
        throw new Error('No active session');
      }

      // Add user message to UI immediately
      const userMessage = {
        id: Date.now().toString(),
        content: message,
        type: 'user' as const,
        timestamp: new Date(),
        sessionId: currentSession.id,
        userId: customerId,
      };
      addMessage(userMessage);

      // Send to backend
      return sendMessageMutation.mutateAsync({
        message,
        sessionId: currentSession.id,
      });
    },
    [currentSession, customerId, addMessage, sendMessageMutation]
  );

  return {
    // State
    currentSession,
    messages,
    isSending,
    escalationStatus,
    
    // Loading states
    isCreatingSession: createSessionMutation.isLoading,
    isLoadingHistory: chatHistory === undefined,
    
    // Actions
    createSession,
    sendMessage,
    refetchHistory,
    
    // Mutations for direct access
    createSessionMutation,
    sendMessageMutation,
  };
};