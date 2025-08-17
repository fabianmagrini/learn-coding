import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useOperatorStore } from '@/stores/operatorStore';
import { useAuthStore } from '@/stores/authStore';

export const DashboardLayout: React.FC = () => {
  const { refreshData } = useOperatorStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      // Load initial data when layout mounts
      refreshData();

      // Set up periodic refresh for real-time data
      const interval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshData]);

  return (
    <div className="flex h-screen bg-secondary-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollable p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};