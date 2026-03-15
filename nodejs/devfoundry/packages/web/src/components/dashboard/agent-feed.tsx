/**
 * Agent Activity Feed — live feed of recent agent runs.
 */

import type { AgentRun } from '../../types/index.js';
import { agentLabel, formatRelativeTime, formatDuration } from '../../lib/utils.js';
import { Badge } from '../ui/badge.js';

interface AgentFeedProps {
  runs: AgentRun[];
  maxItems?: number;
}

function statusVariant(status: string): 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'running':
      return 'info';
    default:
      return 'warning';
  }
}

/** Scrollable feed of the most recent agent activity. */
export function AgentActivityFeed({ runs, maxItems = 8 }: AgentFeedProps): React.ReactElement {
  const displayRuns = runs.slice(0, maxItems);

  if (displayRuns.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        No agent activity yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {displayRuns.map((run) => (
        <div key={run.id} className="flex items-start gap-3 py-3">
          {/* Status indicator */}
          <div
            className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
              run.status === 'completed'
                ? 'bg-green-500'
                : run.status === 'failed'
                  ? 'bg-red-500'
                  : run.status === 'running'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-yellow-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">
                {agentLabel(run.agentType)}
              </span>
              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">{run.task}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>{run.repo}</span>
              <span>·</span>
              <span>{formatRelativeTime(run.createdAt)}</span>
              {run.durationMs !== undefined && (
                <>
                  <span>·</span>
                  <span>{formatDuration(run.durationMs)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
