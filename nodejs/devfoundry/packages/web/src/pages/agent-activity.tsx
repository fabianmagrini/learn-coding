/**
 * AI Agent Activity screen — table of all agent runs with detail panel.
 */

import { useState } from 'react';
import { Header } from '../components/layout/header.js';
import { Card, CardHeader, CardBody } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { mockAgentRuns } from '../mocks/fixtures.js';
import type { AgentRun } from '../types/index.js';
import { agentLabel, formatRelativeTime, formatDuration } from '../lib/utils.js';

function statusVariant(status: string): 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'running': return 'info';
    default: return 'warning';
  }
}

interface RunDetailProps {
  run: AgentRun;
}

function RunDetail({ run }: RunDetailProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Task</h4>
        <p className="mt-1 text-sm text-gray-900">{run.task}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</h4>
          <div className="mt-1">
            <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Duration</h4>
          <p className="mt-1 text-sm text-gray-900">
            {run.durationMs !== undefined ? formatDuration(run.durationMs) : '—'}
          </p>
        </div>
      </div>
      {run.summary && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Summary</h4>
          <p className="mt-1 text-sm text-gray-700">{run.summary}</p>
        </div>
      )}
      {run.error && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-red-500">Error</h4>
          <p className="mt-1 text-sm text-red-700 bg-red-50 rounded p-2">{run.error}</p>
        </div>
      )}
      {run.output?.paths && run.output.paths.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Changed Files ({run.output.paths.length})
          </h4>
          <ul className="mt-1 space-y-1">
            {run.output.paths.map((p) => (
              <li key={p} className="font-mono text-xs text-gray-600">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Full-page agent activity table with expandable detail panel. */
export function AgentActivityPage(): React.ReactElement {
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const runs = mockAgentRuns;

  return (
    <div className="flex flex-col">
      <Header title="AI Agent Activity" subtitle="All agent runs across your repositories" />
      <div className="flex flex-1 gap-6 p-8">
        {/* Main table */}
        <div className={selectedRun ? 'flex-1' : 'w-full'}>
          <Card>
            <CardHeader
              title="Agent Runs"
              subtitle={`${runs.length} runs`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Repo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedRun?.id === run.id ? 'bg-brand-50' : ''}`}
                      onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                    >
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {agentLabel(run.agentType)}
                      </td>
                      <td className="px-6 py-3 max-w-xs truncate text-gray-600">{run.task}</td>
                      <td className="px-6 py-3 text-xs text-gray-500">{run.repo}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {run.durationMs !== undefined ? formatDuration(run.durationMs) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-gray-400">
                        {formatRelativeTime(run.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        {selectedRun && (
          <div className="w-80 flex-shrink-0">
            <Card>
              <CardHeader
                title={agentLabel(selectedRun.agentType)}
                subtitle={selectedRun.id}
                action={
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    ✕
                  </button>
                }
              />
              <CardBody>
                <RunDetail run={selectedRun} />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
