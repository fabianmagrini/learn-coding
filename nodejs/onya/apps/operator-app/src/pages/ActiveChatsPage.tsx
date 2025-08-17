import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  User, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useOperatorStore } from '@/stores/operatorStore';
import { ChatSession, ChatStatus } from '@/types/operator.types';
import { Button } from '@/components/ui/Button';

export const ActiveChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeSessions } = useOperatorStore();

  const handleOpenChat = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };

  const statusColors = {
    [ChatStatus.ACTIVE]: 'text-success-700 bg-success-100',
    [ChatStatus.PENDING]: 'text-warning-700 bg-warning-100',
    [ChatStatus.ESCALATED]: 'text-error-700 bg-error-100',
    [ChatStatus.TRANSFERRED]: 'text-primary-700 bg-primary-100',
    [ChatStatus.RESOLVED]: 'text-secondary-700 bg-secondary-100',
    [ChatStatus.CLOSED]: 'text-secondary-600 bg-secondary-50',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Active Chats</h1>
          <p className="text-secondary-600">
            {activeSessions.length} active conversation{activeSessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {activeSessions.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No active chats
          </h3>
          <p className="text-secondary-500 mb-4">
            Accept a chat from the queue to start helping customers
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/queue')}
          >
            View Chat Queue
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeSessions.map((session) => (
            <ActiveChatItem
              key={session.id}
              session={session}
              onOpen={handleOpenChat}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ActiveChatItemProps {
  session: ChatSession;
  onOpen: (sessionId: string) => void;
}

const ActiveChatItem: React.FC<ActiveChatItemProps> = ({ session, onOpen }) => {
  const statusColors = {
    [ChatStatus.ACTIVE]: 'text-success-700 bg-success-100',
    [ChatStatus.PENDING]: 'text-warning-700 bg-warning-100',
    [ChatStatus.ESCALATED]: 'text-error-700 bg-error-100',
    [ChatStatus.TRANSFERRED]: 'text-primary-700 bg-primary-100',
    [ChatStatus.RESOLVED]: 'text-secondary-700 bg-secondary-100',
    [ChatStatus.CLOSED]: 'text-secondary-600 bg-secondary-50',
  };

  const priorityColors = {
    LOW: 'text-secondary-600 bg-secondary-100',
    MEDIUM: 'text-warning-700 bg-warning-100',
    HIGH: 'text-error-700 bg-error-100',
    URGENT: 'text-white bg-error-600',
  };

  const sessionDuration = Math.floor((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60));
  const lastActivity = formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true });

  return (
    <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => onOpen(session.id)}>
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
                  {session.customerName}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[session.status]}`}>
                  {session.status}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[session.priority as keyof typeof priorityColors]}`}>
                  {session.priority}
                </span>
              </div>
              
              <p className="text-secondary-900 font-medium mb-2">
                {session.subject}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-secondary-500 mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {sessionDuration} minutes</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span>Last activity: {lastActivity}</span>
                </div>
              </div>

              {session.skills && session.skills.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-secondary-500">Skills:</span>
                  <div className="flex gap-1">
                    {session.skills.slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-secondary-100 text-secondary-700 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {session.skills.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-secondary-100 text-secondary-700 rounded">
                        +{session.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {session.messages && session.messages.length > 0 && (
                <div className="p-3 bg-secondary-50 rounded-lg">
                  <p className="text-sm text-secondary-600 mb-1">Latest message:</p>
                  <p className="text-sm text-secondary-900 truncate">
                    {session.messages[session.messages.length - 1]?.content || 'No messages yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <Button
            variant="primary"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(session.id);
            }}
          >
            Open Chat
          </Button>
        </div>
      </div>
    </div>
  );
};