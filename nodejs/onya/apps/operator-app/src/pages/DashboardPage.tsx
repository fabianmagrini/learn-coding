import React from 'react';
import { 
  MessageSquare, 
  Clock, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { useOperatorStore } from '@/stores/operatorStore';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';

export const DashboardPage: React.FC = () => {
  const { 
    profile, 
    activeSessions, 
    queuedChats, 
    dashboardMetrics 
  } = useOperatorStore();

  const metrics = dashboardMetrics?.operator || {} as any;
  const chatMetrics = dashboardMetrics?.chat || {} as any;
  const teamMetrics = dashboardMetrics?.team || {} as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">
          Welcome back, {profile?.userId || 'Operator'}!
        </h1>
        <p className="text-secondary-600">
          Here's your activity overview for today
        </p>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Chats"
          value={activeSessions.length}
          icon={<MessageSquare className="w-6 h-6" />}
          color="primary"
          change={`${activeSessions.length}/${profile?.maxSessions || 0} capacity`}
        />
        
        <MetricCard
          title="Queue Length"
          value={queuedChats.length}
          icon={<Clock className="w-6 h-6" />}
          color="warning"
          change={chatMetrics?.averageWaitTime ? `${Math.round(chatMetrics.averageWaitTime)}min avg wait` : ''}
        />
        
        <MetricCard
          title="Today's Sessions"
          value={metrics?.dailyStats?.sessionsHandled || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="success"
          change={`${((metrics?.resolutionRate || 0) * 100).toFixed(1)}% resolution rate`}
        />
        
        <MetricCard
          title="Customer Rating"
          value={`${((metrics?.customerSatisfactionScore || 0) * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="primary"
          change={metrics?.dailyStats?.customerRating ? `${metrics.dailyStats.customerRating.toFixed(1)}/5.0 today` : ''}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart />
          <RecentActivity />
        </div>
        
        <div className="space-y-6">
          <QuickActions />
          
          {/* Team Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Team Overview
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Online Operators</span>
                <span className="font-medium text-secondary-900">
                  {teamMetrics?.onlineOperators || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Total Active Chats</span>
                <span className="font-medium text-secondary-900">
                  {teamMetrics?.totalActiveSessions || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Avg Response Time</span>
                <span className="font-medium text-secondary-900">
                  {teamMetrics?.averageResponseTime ? `${Math.round(teamMetrics.averageResponseTime)}s` : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Customer Satisfaction</span>
                <span className="font-medium text-secondary-900">
                  {teamMetrics?.customerSatisfactionScore ? `${(teamMetrics.customerSatisfactionScore * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Skills Performance */}
          {teamMetrics?.performanceBySkill && teamMetrics.performanceBySkill.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Skills Performance
              </h3>
              
              <div className="space-y-3">
                {teamMetrics.performanceBySkill.slice(0, 5).map((skill: any, index: number) => (
                  <div key={skill.skill} className="flex justify-between items-center">
                    <span className="text-sm text-secondary-600">{skill.skill}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-secondary-900">
                        {skill.averageRating.toFixed(1)}/5.0
                      </span>
                      <p className="text-xs text-secondary-500">
                        {skill.totalSessions} sessions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};