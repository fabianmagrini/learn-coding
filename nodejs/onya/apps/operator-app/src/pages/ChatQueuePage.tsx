import React, { useState } from 'react';
import { 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle,
  Filter,
  RefreshCw,
  Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useOperatorStore } from '@/stores/operatorStore';
import { QueuedChat, ChatPriority } from '@/types/operator.types';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const ChatQueuePage: React.FC = () => {
  const { queuedChats, acceptChat, refreshData } = useOperatorStore();
  const [selectedPriority, setSelectedPriority] = useState<ChatPriority | 'ALL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const handleAcceptChat = async (sessionId: string) => {
    await acceptChat(sessionId);
  };

  const filteredChats = queuedChats.filter(chat => 
    selectedPriority === 'ALL' || chat.priority === selectedPriority
  );

  const priorityColors = {
    [ChatPriority.LOW]: 'text-secondary-600 bg-secondary-100',
    [ChatPriority.MEDIUM]: 'text-warning-700 bg-warning-100',
    [ChatPriority.HIGH]: 'text-error-700 bg-error-100',
    [ChatPriority.URGENT]: 'text-white bg-error-600',
  };

  const priorityOptions = [
    { value: 'ALL', label: 'All Priorities' },
    { value: ChatPriority.URGENT, label: 'Urgent' },
    { value: ChatPriority.HIGH, label: 'High' },
    { value: ChatPriority.MEDIUM, label: 'Medium' },
    { value: ChatPriority.LOW, label: 'Low' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Chat Queue</h1>
          <p className="text-secondary-600">
            {filteredChats.length} customers waiting for assistance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as ChatPriority | 'ALL')}
            className="input w-auto"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <Button
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {filteredChats.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No chats in queue
          </h3>
          <p className="text-secondary-500">
            All customers are being helped or there are no pending requests
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredChats.map((chat) => (
            <ChatQueueItem
              key={chat.sessionId}
              chat={chat}
              onAccept={handleAcceptChat}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ChatQueueItemProps {
  chat: QueuedChat;
  onAccept: (sessionId: string) => void;
}

const ChatQueueItem: React.FC<ChatQueueItemProps> = ({ chat, onAccept }) => {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(chat.sessionId);
    } finally {
      setIsAccepting(false);
    }
  };

  const priorityColors = {
    [ChatPriority.LOW]: 'text-secondary-600 bg-secondary-100',
    [ChatPriority.MEDIUM]: 'text-warning-700 bg-warning-100',
    [ChatPriority.HIGH]: 'text-error-700 bg-error-100',
    [ChatPriority.URGENT]: 'text-white bg-error-600',
  };

  const waitTime = Math.floor((Date.now() - new Date(chat.queuedAt).getTime()) / (1000 * 60));

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-medium text-secondary-900">
                  {chat.customerName}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[chat.priority]}`}>
                  {chat.priority}
                </span>
                {chat.customerTier && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                    {chat.customerTier}
                  </span>
                )}
              </div>
              
              <p className="text-secondary-900 font-medium mb-2">
                {chat.subject}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-secondary-500 mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Waiting {waitTime} minutes</span>
                </div>
                
                {chat.skills.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>Skills:</span>
                    <span className="font-medium">
                      {chat.skills.slice(0, 2).join(', ')}
                      {chat.skills.length > 2 && ` +${chat.skills.length - 2}`}
                    </span>
                  </div>
                )}
              </div>

              {chat.escalationReason && (
                <div className="flex items-center gap-2 p-2 bg-warning-50 rounded-lg mb-3">
                  <AlertTriangle className="w-4 h-4 text-warning-600" />
                  <span className="text-sm text-warning-700">
                    Escalated: {chat.escalationReason}
                  </span>
                </div>
              )}

              {chat.previousOperatorId && (
                <p className="text-sm text-secondary-500 mb-3">
                  Previously handled by operator {chat.previousOperatorId}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <Button
            variant="primary"
            icon={<Check className="w-4 h-4" />}
            onClick={handleAccept}
            loading={isAccepting}
            disabled={isAccepting}
          >
            Accept Chat
          </Button>
        </div>
      </div>
    </div>
  );
};