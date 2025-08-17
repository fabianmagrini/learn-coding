import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  MessageSquare,
  Star,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: dashboardMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', timeRange],
    queryFn: () => apiClient.getDashboardMetrics(timeRange),
  });

  const { data: teamMetrics, isLoading: teamLoading } = useQuery({
    queryKey: ['team-metrics', timeRange],
    queryFn: () => apiClient.getTeamMetrics(timeRange),
  });

  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: () => apiClient.getPerformanceMetrics(),
  });

  const isLoading = metricsLoading || teamLoading || performanceLoading;

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const dashboard = dashboardMetrics?.data || {} as any;
  const team = teamMetrics?.data?.metrics || {} as any;
  const performance = performanceMetrics?.data || {} as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Analytics</h1>
          <p className="text-secondary-600">
            Performance insights and team metrics
          </p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="input w-auto"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sessions"
          value={dashboard?.chat?.totalSessions || 0}
          icon={<MessageSquare className="w-6 h-6" />}
          color="primary"
          change={`${dashboard?.chat?.activeSessions || 0} currently active`}
        />
        
        <MetricCard
          title="Resolution Rate"
          value={`${((dashboard?.chat?.resolutionRate || 0) * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="success"
          change="Above target"
          trend="up"
        />
        
        <MetricCard
          title="Avg Wait Time"
          value={`${Math.round(dashboard?.chat?.averageWaitTime || 0)}min`}
          icon={<Clock className="w-6 h-6" />}
          color="warning"
          change="Within SLA"
        />
        
        <MetricCard
          title="Customer Satisfaction"
          value={`${((dashboard?.chat?.customerSatisfactionScore || 0) * 100).toFixed(1)}%`}
          icon={<Star className="w-6 h-6" />}
          color="primary"
          change="Excellent rating"
          trend="up"
        />
      </div>

      {/* Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Team Overview
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary-600" />
                <span className="font-medium">Online Operators</span>
              </div>
              <span className="text-lg font-semibold text-primary-600">
                {team?.onlineOperators || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-success-600" />
                <span className="font-medium">Active Sessions</span>
              </div>
              <span className="text-lg font-semibold text-success-600">
                {team?.totalActiveSessions || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-warning-600" />
                <span className="font-medium">Avg Response Time</span>
              </div>
              <span className="text-lg font-semibold text-warning-600">
                {Math.round(team?.averageResponseTime || 0)}s
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-primary-600" />
                <span className="font-medium">Team Satisfaction</span>
              </div>
              <span className="text-lg font-semibold text-primary-600">
                {((team?.customerSatisfactionScore || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Operator Performance
          </h3>
          
          {performance?.operators && performance.operators.length > 0 ? (
            <div className="space-y-3">
              {performance.operators.slice(0, 5).map((operator: any, index: number) => (
                <div key={operator.operatorId} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div>
                    <p className="font-medium text-secondary-900">
                      Operator {operator.operatorId.slice(-4)}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {operator.metrics.totalSessions || 0} sessions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">
                      {((operator.metrics.customerSatisfactionScore || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-secondary-500">
                      {Math.round(operator.metrics.averageResponseTime || 0)}s avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No performance data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Skills Performance */}
      {team?.performanceBySkill && team.performanceBySkill.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Skills Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.performanceBySkill.map((skill: any) => (
              <div key={skill.skill} className="p-4 bg-secondary-50 rounded-lg">
                <h4 className="font-medium text-secondary-900 mb-2">
                  {skill.skill}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Operators:</span>
                    <span className="font-medium">{skill.operatorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Rating:</span>
                    <span className="font-medium">{skill.averageRating.toFixed(1)}/5.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Sessions:</span>
                    <span className="font-medium">{skill.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Handle Time:</span>
                    <span className="font-medium">{Math.round(skill.averageHandleTime)}min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Hours */}
      {team?.peakHours && team.peakHours.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Peak Activity Hours
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {team.peakHours.map((hour: string) => (
              <span
                key={hour}
                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
              >
                {hour}:00
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};