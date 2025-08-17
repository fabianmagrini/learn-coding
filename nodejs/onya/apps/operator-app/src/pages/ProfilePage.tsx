import React from 'react';
import { 
  User, 
  Settings, 
  Clock, 
  Star,
  MessageSquare,
  TrendingUp,
  Award
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useOperatorStore } from '@/stores/operatorStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

export const ProfilePage: React.FC = () => {
  const { profile, status } = useOperatorStore();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['operator-metrics', '30d'],
    queryFn: () => apiClient.getMyMetrics('30d'),
  });

  const metrics = metricsData?.data?.metrics || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Profile</h1>
        <p className="text-secondary-600">
          Your operator profile and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-primary-600" />
              </div>
              <StatusIndicator 
                status={status} 
                size="md" 
                className="absolute bottom-3 right-0"
              />
            </div>
            
            <h2 className="text-xl font-semibold text-secondary-900 mb-1">
              {profile?.userId || 'Operator'}
            </h2>
            
            <StatusIndicator 
              status={status} 
              showLabel 
              className="justify-center mb-4"
            />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Current Load:</span>
                <span className="font-medium">
                  {profile?.currentLoad || 0} / {profile?.maxSessions || 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-secondary-600">Skills:</span>
                <span className="font-medium">{profile?.skills?.length || 0}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-secondary-600">Last Active:</span>
                <span className="font-medium">
                  {profile?.lastActiveAt ? 
                    new Date(profile.lastActiveAt).toLocaleDateString() : 
                    'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-6">
            30-Day Performance
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <MessageSquare className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary-600">
                {metrics.totalSessions || 0}
              </p>
              <p className="text-sm text-secondary-600">Total Sessions</p>
            </div>
            
            <div className="text-center p-4 bg-success-50 rounded-lg">
              <Star className="w-8 h-8 text-success-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-success-600">
                {((metrics.customerSatisfactionScore || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-secondary-600">Satisfaction</p>
            </div>
            
            <div className="text-center p-4 bg-warning-50 rounded-lg">
              <Clock className="w-8 h-8 text-warning-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-warning-600">
                {Math.round(metrics.averageResponseTime || 0)}s
              </p>
              <p className="text-sm text-secondary-600">Avg Response</p>
            </div>
            
            <div className="text-center p-4 bg-error-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-error-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-error-600">
                {((metrics.resolutionRate || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-secondary-600">Resolution Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile?.skills && profile.skills.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Skills & Expertise
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Daily/Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.dailyStats && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Today's Performance
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Sessions Handled:</span>
                <span className="font-medium text-secondary-900">
                  {metrics.dailyStats.sessionsHandled || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Avg Handle Time:</span>
                <span className="font-medium text-secondary-900">
                  {Math.round(metrics.dailyStats.averageHandleTime || 0)} min
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Customer Rating:</span>
                <span className="font-medium text-secondary-900">
                  {(metrics.dailyStats.customerRating || 0).toFixed(1)}/5.0
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Escalations:</span>
                <span className="font-medium text-secondary-900">
                  {metrics.dailyStats.escalationsReceived || 0} received, {metrics.dailyStats.escalationsResolved || 0} resolved
                </span>
              </div>
            </div>
          </div>
        )}

        {metrics.weeklyStats && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              This Week's Summary
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Total Sessions:</span>
                <span className="font-medium text-secondary-900">
                  {metrics.weeklyStats.totalSessions || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Average Rating:</span>
                <span className="font-medium text-secondary-900">
                  {(metrics.weeklyStats.averageRating || 0).toFixed(1)}/5.0
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary-600">Productivity Score:</span>
                <span className="font-medium text-secondary-900">
                  {((metrics.weeklyStats.productivityScore || 0) * 100).toFixed(1)}%
                </span>
              </div>
              
              {metrics.weeklyStats.peakHours && metrics.weeklyStats.peakHours.length > 0 && (
                <div>
                  <span className="text-secondary-600">Peak Hours:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {metrics.weeklyStats.peakHours.map((hour: string) => (
                      <span
                        key={hour}
                        className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs"
                      >
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preferences */}
      {profile?.preferences && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">
              Preferences
            </h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Edit Settings
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Chat Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Auto Accept:</span>
                  <span className="font-medium">
                    {profile.preferences.autoAcceptChats ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Max Concurrent:</span>
                  <span className="font-medium">
                    {profile.preferences.maxConcurrentChats}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Notifications</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-600">New Chat Sound:</span>
                  <span className="font-medium">
                    {profile.preferences.notificationSettings?.newChatSound ? 'On' : 'Off'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Email Alerts:</span>
                  <span className="font-medium">
                    {profile.preferences.notificationSettings?.emailNotifications ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};