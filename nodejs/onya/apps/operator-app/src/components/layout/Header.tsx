import React from 'react';
import { Menu, Search, Bell, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { useOperatorStore } from '@/stores/operatorStore';
import { Button } from '@/components/ui/Button';
import { StatusSelector } from '@/components/operator/StatusSelector';
import { socketService } from '@/services/socket';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { profile, status } = useOperatorStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white border-b border-secondary-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-secondary-100 rounded-lg lg:hidden">
            <Menu size={20} />
          </button>
          
          <div className="relative max-w-md flex-1">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Search chats, customers..."
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary-600">Status:</span>
            <StatusSelector />
          </div>

          <div className="flex items-center gap-2">
            <span 
              className={clsx(
                'w-2 h-2 rounded-full',
                socketService.isConnected() ? 'bg-success-500' : 'bg-error-500'
              )}
            />
            <span className="text-xs text-secondary-500">
              {socketService.isConnected() ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <button className="relative p-2 hover:bg-secondary-100 rounded-lg">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full"></span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-secondary-200">
            <div className="text-right">
              <p className="text-sm font-medium text-secondary-900">
                {user?.email}
              </p>
              <p className="text-xs text-secondary-500">
                {user?.role?.toLowerCase()}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut size={16} />}
              onClick={handleLogout}
              className="text-secondary-600 hover:text-error-600"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};