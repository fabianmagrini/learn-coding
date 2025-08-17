import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart 
} from 'recharts';
import { useOperatorStore } from '@/stores/operatorStore';

export const PerformanceChart: React.FC = () => {
  const { dashboardMetrics } = useOperatorStore();

  // Mock performance data - in a real app this would come from the metrics API
  const performanceData = [
    { time: '09:00', chats: 2, satisfaction: 4.8, responseTime: 45 },
    { time: '10:00', chats: 5, satisfaction: 4.6, responseTime: 38 },
    { time: '11:00', chats: 8, satisfaction: 4.9, responseTime: 42 },
    { time: '12:00', chats: 6, satisfaction: 4.7, responseTime: 35 },
    { time: '13:00', chats: 3, satisfaction: 4.8, responseTime: 40 },
    { time: '14:00', chats: 7, satisfaction: 4.5, responseTime: 48 },
    { time: '15:00', chats: 9, satisfaction: 4.9, responseTime: 33 },
    { time: '16:00', chats: 4, satisfaction: 4.8, responseTime: 37 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
          <p className="font-medium text-secondary-900">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
              {entry.name === 'Response Time' && 's'}
              {entry.name === 'Satisfaction' && '/5'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900">
          Today's Performance
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-500"></div>
            <span className="text-secondary-600">Chats Handled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success-500"></div>
            <span className="text-secondary-600">Satisfaction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning-500"></div>
            <span className="text-secondary-600">Response Time</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="chats"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              name="Chats"
            />
            <Line
              type="monotone"
              dataKey="satisfaction"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2 }}
              name="Satisfaction"
            />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2 }}
              name="Response Time"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold text-primary-600">
            {performanceData.reduce((sum, item) => sum + item.chats, 0)}
          </p>
          <p className="text-sm text-secondary-600">Total Chats</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-success-600">
            {(performanceData.reduce((sum, item) => sum + item.satisfaction, 0) / performanceData.length).toFixed(1)}
          </p>
          <p className="text-sm text-secondary-600">Avg Satisfaction</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-warning-600">
            {Math.round(performanceData.reduce((sum, item) => sum + item.responseTime, 0) / performanceData.length)}s
          </p>
          <p className="text-sm text-secondary-600">Avg Response</p>
        </div>
      </div>
    </div>
  );
};