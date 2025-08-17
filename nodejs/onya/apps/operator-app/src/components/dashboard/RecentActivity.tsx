import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  UserPlus, 
  ArrowUpRight, 
  CheckCircle,
  Clock 
} from 'lucide-react';
import { useOperatorStore } from '@/stores/operatorStore';

interface ActivityItem {
  id: string;
  type: 'chat_assigned' | 'chat_resolved' | 'chat_escalated' | 'status_change';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

export const RecentActivity: React.FC = () => {
  const { activeSessions, profile } = useOperatorStore();

  // Mock recent activity data - in a real app this would come from an API
  const recentActivity: ActivityItem[] = [
    ...activeSessions.slice(0, 3).map(session => ({
      id: `chat-${session.id}`,
      type: 'chat_assigned' as const,
      title: `Chat assigned: ${session.customerName}`,
      description: session.subject,
      timestamp: new Date(session.createdAt),
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'text-primary-600',
    })),
    {
      id: 'status-change',
      type: 'status_change' as const,
      title: `Status changed to ${profile?.status || 'Unknown'}`,
      description: 'Operator status updated',
      timestamp: new Date(profile?.lastActiveAt || Date.now()),
      icon: <UserPlus className="w-4 h-4" />,
      color: 'text-success-600',
    },
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);

  if (recentActivity.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
          <p className="text-secondary-500">No recent activity</p>
          <p className="text-sm text-secondary-400 mt-1">
            Activity will appear here as you handle chats
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4">
        Recent Activity
      </h3>

      <div className="space-y-4">
        {recentActivity.map((item, index) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className={`p-2 rounded-full bg-secondary-100 ${item.color}`}>
              {item.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {item.title}
              </p>
              <p className="text-sm text-secondary-500 mt-1 truncate">
                {item.description}
              </p>
              <p className="text-xs text-secondary-400 mt-1">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </p>
            </div>

            {item.type === 'chat_assigned' && (
              <button className="p-1 text-secondary-400 hover:text-primary-600 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {recentActivity.length > 5 && (
        <div className="mt-4 pt-4 border-t border-secondary-200">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
};