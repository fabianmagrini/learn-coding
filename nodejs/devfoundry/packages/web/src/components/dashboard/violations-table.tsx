/**
 * Policy Violations Table — lists recent violations with severity and context.
 */

import type { PolicyViolation } from '../../types/index.js';
import { formatRelativeTime } from '../../lib/utils.js';
import { Badge } from '../ui/badge.js';

interface ViolationsTableProps {
  violations: PolicyViolation[];
}

/** Table of recent policy violations with severity badges. */
export function ViolationsTable({ violations }: ViolationsTableProps): React.ReactElement {
  if (violations.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-gray-400">
        No policy violations
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Severity
            </th>
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Rule
            </th>
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              File / Context
            </th>
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Repo
            </th>
            <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {violations.map((v) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="py-3 pr-4">
                <Badge variant={v.severity === 'error' ? 'error' : 'warning'}>
                  {v.severity}
                </Badge>
              </td>
              <td className="py-3 pr-4 font-mono text-xs text-gray-700">{v.rule}</td>
              <td className="py-3 pr-4 max-w-xs truncate text-xs text-gray-500">
                {v.file ?? v.message}
              </td>
              <td className="py-3 pr-4 text-xs text-gray-500">{v.repo}</td>
              <td className="py-3 text-right text-xs text-gray-400">
                {formatRelativeTime(v.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
