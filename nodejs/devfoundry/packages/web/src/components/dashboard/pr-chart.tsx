/**
 * PR Volume Chart — AI vs human PR volume over time.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PRChartDataPoint } from '../../types/index.js';

interface PRChartProps {
  data: PRChartDataPoint[];
}

/** Line chart comparing AI-generated vs human PR volume over the past week. */
export function PRVolumeChart({ data }: PRChartProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)} // Show MM-DD
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="aiPRs"
          name="AI PRs"
          stroke="#4c6ef5"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="humanPRs"
          name="Human PRs"
          stroke="#94a3b8"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
