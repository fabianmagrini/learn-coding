import { useEffect } from 'react';
import { MessageSquare, Headphones } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { EscalationNotice } from '@/features/escalation/components/EscalationNotice';
import { Button } from '@/shared/components/ui/Button';
import { trpc } from '@/shared/trpc/client';

export function ChatContainer() {
  const {
    currentSession,
    messages,
    isSending,
    escalationStatus,
    isCreatingSession,
    createSession,
    sendMessage,
  } = useChat();

  // Request escalation mutation
  const requestEscalationMutation = trpc.escalation.requestEscalation.useMutation();
  
  // Cancel escalation mutation
  const cancelEscalationMutation = trpc.escalation.cancelEscalation.useMutation();

  // Create session on mount if none exists
  useEffect(() => {
    if (!currentSession && !isCreatingSession) {
      createSession();
    }
  }, [currentSession, isCreatingSession, createSession]);

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleRequestEscalation = async () => {
    if (!currentSession) return;
    
    try {
      await requestEscalationMutation.mutateAsync({
        sessionId: currentSession.id,
        reason: 'Customer requested human agent',
        priority: 'medium',
      });
    } catch (error) {
      console.error('Failed to request escalation:', error);
    }
  };

  const handleCancelEscalation = async () => {
    if (!currentSession) return;
    
    try {
      await cancelEscalationMutation.mutateAsync({
        sessionId: currentSession.id,
      });
    } catch (error) {
      console.error('Failed to cancel escalation:', error);
    }
  };

  if (isCreatingSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-primary-600 mb-4" />
          <h2 className="text-lg font-medium text-secondary-900 mb-2">
            Connecting to support...
          </h2>
          <p className="text-secondary-600">
            Please wait while we set up your chat session.
          </p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-medium text-secondary-900 mb-2">
            Connection Error
          </h2>
          <p className="text-secondary-600 mb-4">
            We're having trouble connecting to our chat service.
          </p>
          <Button onClick={createSession}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-secondary-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary-200 bg-white px-4 py-3">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-lg font-semibold text-secondary-900">
              Customer Support
            </h1>
            <p className="text-sm text-secondary-600">
              {escalationStatus.escalated 
                ? escalationStatus.operatorId 
                  ? 'Connected to agent'
                  : 'Waiting for agent...'
                : 'AI Assistant'
              }
            </p>
          </div>
        </div>
        
        {!escalationStatus.escalated && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestEscalation}
            loading={requestEscalationMutation.isLoading}
            className="flex items-center space-x-2"
          >
            <Headphones className="h-4 w-4" />
            <span>Talk to Human</span>
          </Button>
        )}
      </div>

      {/* Escalation Notice */}
      <EscalationNotice
        escalationStatus={escalationStatus}
        onCancelEscalation={handleCancelEscalation}
        canCancel={!escalationStatus.operatorId}
      />

      {/* Messages */}
      <MessageList 
        messages={messages} 
        isTyping={isSending}
      />

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isSending}
        placeholder={
          escalationStatus.escalated && escalationStatus.operatorId
            ? "Type your message to the agent..."
            : escalationStatus.escalated
            ? "You can continue chatting while waiting for an agent..."
            : "Type your message..."
        }
      />
    </div>
  );
}