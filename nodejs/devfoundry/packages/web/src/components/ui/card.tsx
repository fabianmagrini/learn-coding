/**
 * Card component — container with rounded border and shadow.
 */

import { cn } from '../../lib/utils.js';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** Container card with consistent styling. */
export function Card({ children, className }: CardProps): React.ReactElement {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/** Card header with title, optional subtitle, and optional action element. */
export function CardHeader({ title, subtitle, action }: CardHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

/** Card body with standard padding. */
export function CardBody({ children, className }: CardBodyProps): React.ReactElement {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}
