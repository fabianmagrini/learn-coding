/**
 * KPI Card — displays a single key performance indicator with trend.
 */

import { cn } from '../../lib/utils.js';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number; // Positive = up, negative = down
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

/** Dashboard KPI card with a value, optional trend indicator, and icon. */
export function KpiCard({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  className,
}: KpiCardProps): React.ReactElement {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium',
              trendPositive && 'text-green-600',
              trendNegative && 'text-red-600',
              !trendPositive && !trendNegative && 'text-gray-500',
            )}
          >
            {trendPositive ? '↑' : trendNegative ? '↓' : '→'}{' '}
            {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
