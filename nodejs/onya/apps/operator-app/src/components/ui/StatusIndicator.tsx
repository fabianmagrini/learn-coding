import React from 'react';
import { clsx } from 'clsx';
import { OperatorStatus } from '@/types/operator.types';

interface StatusIndicatorProps {
  status: OperatorStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'sm',
  showLabel = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    [OperatorStatus.ONLINE]: 'bg-success-500',
    [OperatorStatus.BUSY]: 'bg-warning-500',
    [OperatorStatus.AWAY]: 'bg-secondary-400',
    [OperatorStatus.OFFLINE]: 'bg-error-500',
  };

  const statusLabels = {
    [OperatorStatus.ONLINE]: 'Online',
    [OperatorStatus.BUSY]: 'Busy',
    [OperatorStatus.AWAY]: 'Away',
    [OperatorStatus.OFFLINE]: 'Offline',
  };

  if (showLabel) {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <div
          className={clsx(
            'rounded-full border-2 border-white',
            sizeClasses[size],
            statusClasses[status]
          )}
        />
        <span className="text-sm font-medium text-secondary-700">
          {statusLabels[status]}
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full border-2 border-white',
        sizeClasses[size],
        statusClasses[status],
        className
      )}
      title={statusLabels[status]}
    />
  );
};