import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  BarChart3, 
  User,
  Settings,
  Bell,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { useOperatorStore } from '@/stores/operatorStore';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Chat Queue',
    href: '/queue',
    icon: Clock,
    badge: 'queuedChats',
  },
  {
    name: 'Active Chats',
    href: '/active-chats',
    icon: MessageSquare,
    badge: 'activeSessions',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export const Sidebar: React.FC = () => {
  const { profile, status, activeSessions, queuedChats } = useOperatorStore();

  const getBadgeCount = (badgeType: string) => {
    switch (badgeType) {
      case 'queuedChats':
        return queuedChats.length;
      case 'activeSessions':
        return activeSessions.length;
      default:
        return 0;
    }
  };

  return (
    <div className="sidebar w-64 p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 bg-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-lg font-bold text-white">O</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-secondary-900">Onya</h1>
          <p className="text-sm text-secondary-500">Operator Dashboard</p>
        </div>
      </div>

      {profile && (
        <div className="mb-6 p-3 bg-secondary-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <StatusIndicator status={status} className="absolute -bottom-1 -right-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {profile.userId}
              </p>
              <p className="text-xs text-secondary-500 capitalize">
                {status.toLowerCase()}
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex justify-between text-xs text-secondary-600">
            <span>Load: {profile.currentLoad}/{profile.maxSessions}</span>
            <span>Skills: {profile.skills.length}</span>
          </div>
        </div>
      )}

      <nav className="space-y-2">
        {navigation.map((item) => {
          const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                )
              }
            >
              <item.icon size={20} />
              <span className="flex-1">{item.name}</span>
              {badgeCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary-600 rounded-full">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-secondary-200">
        <button className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900 rounded-lg transition-colors">
          <Bell size={20} />
          <span>Notifications</span>
        </button>
        
        <button className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900 rounded-lg transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};