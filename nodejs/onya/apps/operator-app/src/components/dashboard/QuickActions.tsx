import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Clock, 
  BarChart3, 
  Plus,
  RefreshCw 
} from 'lucide-react';
import { useOperatorStore } from '@/stores/operatorStore';
import { Button } from '@/components/ui/Button';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { queuedChats, activeSessions, refreshData } = useOperatorStore();

  const actions = [
    {
      label: 'View Queue',
      description: `${queuedChats.length} waiting`,
      icon: <Clock className="w-5 h-5" />,
      onClick: () => navigate('/queue'),
      color: 'primary' as const,
    },
    {
      label: 'Active Chats',
      description: `${activeSessions.length} active`,
      icon: <MessageSquare className="w-5 h-5" />,
      onClick: () => navigate('/active-chats'),
      color: 'success' as const,
    },
    {
      label: 'Analytics',
      description: 'View reports',
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => navigate('/analytics'),
      color: 'secondary' as const,
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-secondary-900">
          Quick Actions
        </h3>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={refreshData}
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
          >
            <div className="p-2 rounded-md bg-secondary-100">
              {action.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-secondary-900">{action.label}</p>
              <p className="text-sm text-secondary-500">{action.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-secondary-200">
        <p className="text-sm text-secondary-600 mb-3">
          Need to escalate or transfer a chat?
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          className="w-full"
          onClick={() => navigate('/active-chats')}
        >
          Manage Active Chats
        </Button>
      </div>
    </div>
  );
};