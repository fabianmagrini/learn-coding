/**
 * Architecture Health screen — violations list and trend chart.
 */

import { Header } from '../components/layout/header.js';
import { Card, CardHeader, CardBody } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { mockArchitectureViolations } from '../mocks/fixtures.js';
import { formatRelativeTime } from '../lib/utils.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const trendData = [
  { week: 'W1', violations: 8 },
  { week: 'W2', violations: 6 },
  { week: 'W3', violations: 7 },
  { week: 'W4', violations: 4 },
  { week: 'W5', violations: 5 },
  { week: 'W6', violations: 3 },
];

const architectureRules = [
  { name: 'no-service-to-ui-import', enabled: true, violations: 2 },
  { name: 'no-direct-db-access-from-api', enabled: true, violations: 1 },
  { name: 'tests-required-for-high-risk', enabled: true, violations: 0 },
  { name: 'api-must-match-openapi-spec', enabled: false, violations: 0 },
];

/** Architecture Health screen with violations and trend chart. */
export function ArchitectureHealthPage(): React.ReactElement {
  const violations = mockArchitectureViolations;

  return (
    <div className="flex flex-col">
      <Header
        title="Architecture Health"
        subtitle="Track architecture rule violations and dependency health"
      />
      <div className="p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total Violations</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{violations.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Critical (Errors)</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {violations.filter((v) => v.severity === 'error').length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Warnings</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {violations.filter((v) => v.severity === 'warning').length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Trend chart */}
          <Card>
            <CardHeader title="Violations Trend" subtitle="Past 6 weeks" />
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="violations" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Rules list */}
          <Card>
            <CardHeader title="Architecture Rules" />
            <CardBody>
              <div className="space-y-3">
                {architectureRules.map((rule) => (
                  <div
                    key={rule.name}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-medium text-gray-900">{rule.name}</p>
                      {rule.violations > 0 && (
                        <p className="text-xs text-red-500">{rule.violations} violations</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {rule.violations > 0 && (
                        <Badge variant="error">{rule.violations}</Badge>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {rule.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Violations list */}
        <Card>
          <CardHeader title="Recent Violations" />
          <div className="divide-y divide-gray-50">
            {violations.map((v) => (
              <div key={v.id} className="flex items-start gap-4 px-6 py-4">
                <Badge variant={v.severity === 'error' ? 'error' : 'warning'}>
                  {v.severity}
                </Badge>
                <div className="flex-1">
                  <p className="font-mono text-xs font-semibold text-gray-900">{v.rule}</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    <span className="font-medium">{v.source}</span>
                    <span className="mx-1 text-gray-400">→</span>
                    <span className="font-medium">{v.target}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{v.file}</p>
                </div>
                <span className="text-xs text-gray-400">{formatRelativeTime(v.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
