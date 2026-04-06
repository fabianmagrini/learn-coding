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
import { useStore } from '../store/useStore';

export function Charts() {
  const { stats } = useStore();

  const displayStats = stats.length > 50 ? stats.slice(-50) : stats;

  const data = displayStats.map((s) => ({
    gen: s.generation,
    best: Math.round(s.bestFitness * 10) / 10,
    avg: Math.round(s.avgFitness * 10) / 10,
    diversity: Math.round(s.diversity * 100) / 100,
  }));

  if (data.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
        <p>No data yet. Start evolution to see fitness charts.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Fitness Over Generations</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="gen"
            label={{ value: 'Generation', position: 'insideBottom', offset: -2 }}
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="best"
            stroke="#FFD700"
            strokeWidth={2}
            dot={false}
            name="Best Fitness"
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#2196F3"
            strokeWidth={2}
            dot={false}
            name="Avg Fitness"
          />
        </LineChart>
      </ResponsiveContainer>

      <h2 style={{ margin: '16px 0 12px 0', fontSize: '18px' }}>Population Diversity</h2>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="gen" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="diversity"
            stroke="#4CAF50"
            strokeWidth={2}
            dot={false}
            name="Diversity"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
