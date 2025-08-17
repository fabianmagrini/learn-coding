import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  MoreVertical, 
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { ChatMessage, MessageType } from '@/types/operator.types';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';

export const ChatSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => apiClient.getChatSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => apiClient.sendMessage(sessionId!, content),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries(['chat-session', sessionId]);
    },
    onError: (error) => {
      toast.error('Failed to send message');
    }
  });

  const resolveSessionMutation = useMutation({
    mutationFn: (data: { resolution: string; customerSatisfaction?: number; tags?: string[] }) =>
      apiClient.resolveChat(sessionId!, data),
    onSuccess: () => {
      toast.success('Chat resolved successfully');
      navigate('/active-chats');
    }
  });

  useEffect(() => {
    // Set up socket listener for new messages
    const handleNewMessage = (data: any) => {
      if (data.sessionId === sessionId) {
        queryClient.invalidateQueries(['chat-session', sessionId]);
      }
    };

    socketService.on('chat:message', handleNewMessage);
    return () => socketService.off('chat:message', handleNewMessage);
  }, [sessionId, queryClient]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionData?.data?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsTyping(true);
    try {
      await sendMessageMutation.mutateAsync(message.trim());
      // Also send via socket for real-time delivery
      socketService.sendMessage(sessionId!, message.trim());
    } finally {
      setIsTyping(false);
    }
  };

  const handleResolveChat = () => {
    const resolution = prompt('Please provide a resolution summary:');
    if (resolution) {
      resolveSessionMutation.mutate({ resolution });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !sessionData?.success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-error-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            Chat session not found
          </h3>
          <p className="text-secondary-500 mb-4">
            The chat session may have been closed or transferred.
          </p>
          <Button variant="primary" onClick={() => navigate('/active-chats')}>
            Back to Active Chats
          </Button>
        </div>
      </div>
    );
  }

  const { session, messages } = sessionData.data || { session: null, messages: [] };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-error-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            Session data not available
          </h3>
          <Button variant="primary" onClick={() => navigate('/active-chats')}>
            Back to Active Chats
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/active-chats')}
          >
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-secondary-900">
                {session.customerName}
              </h1>
              <p className="text-sm text-secondary-500">
                {session.subject}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="success"
            size="sm"
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={handleResolveChat}
            loading={resolveSessionMutation.isPending}
          >
            Resolve
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            icon={<MoreVertical className="w-4 h-4" />}
          >
            More
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg: ChatMessage) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-secondary-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">Sending...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-secondary-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 input"
            disabled={isTyping}
          />
          <Button
            type="submit"
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            disabled={!message.trim() || isTyping}
            loading={isTyping}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOperator = message.type === MessageType.OPERATOR;
  const isSystem = message.type === MessageType.SYSTEM;
  const isCustomer = message.type === MessageType.CUSTOMER;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1 bg-secondary-100 text-secondary-600 text-sm rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOperator ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOperator
            ? 'bg-primary-600 text-white'
            : 'bg-secondary-100 text-secondary-900'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isOperator ? 'text-primary-100' : 'text-secondary-500'
          }`}
        >
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};