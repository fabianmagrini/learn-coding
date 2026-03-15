/**
 * Badge component — displays a small status indicator.
 */

import { cn } from '../../lib/utils.js';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

/** Small badge for displaying status, tier, or category labels. */
export function Badge({ children, variant = 'default', className }: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
