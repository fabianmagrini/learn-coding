import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Message } from '@/shared/types/chat.types';
import { clsx } from 'clsx';

interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  return (
    <div
      className={clsx(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[80%] rounded-lg px-4 py-2',
          {
            'bg-primary-600 text-white': isUser,
            'bg-white border border-secondary-200 text-secondary-900': !isUser && !isSystem,
            'bg-secondary-100 text-secondary-700 text-sm italic': isSystem,
          }
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div
          className={clsx(
            'mt-1 text-xs',
            {
              'text-primary-100': isUser,
              'text-secondary-500': !isUser,
            }
          )}
        >
          {format(new Date(message.timestamp), 'HH:mm')}
          {message.type === 'bot' && message.metadata?.confidence && (
            <span className="ml-2">
              ({Math.round(message.metadata.confidence * 100)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-secondary-200 rounded-lg px-4 py-2">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-secondary-500 text-sm ml-2">AI is typing...</span>
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isTyping = false }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-secondary-500">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm">
              Hi! I'm here to help you with any questions or issues you might have.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}