import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ChatQueuePage } from '@/pages/ChatQueuePage';
import { ActiveChatsPage } from '@/pages/ActiveChatsPage';
import { ChatSessionPage } from '@/pages/ChatSessionPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function App() {
  const { isAuthenticated, isLoading, verifyToken } = useAuthStore();

  useEffect(() => {
    // Verify token on app startup
    verifyToken();
  }, [verifyToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="queue" element={<ChatQueuePage />} />
        <Route path="active-chats" element={<ActiveChatsPage />} />
        <Route path="chat/:sessionId" element={<ChatSessionPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;