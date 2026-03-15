/**
 * Policy Config screen — admin UI for risk tier rules and approval workflows.
 */

import { useState } from 'react';
import { Header } from '../components/layout/header.js';
import { Card, CardHeader, CardBody } from '../components/ui/card.js';

const DEFAULT_RISK_CONFIG = JSON.stringify(
  {
    riskTierRules: {
      high: ['db/schema/**', 'auth/**', 'payments/**'],
      medium: ['services/**', 'api/**'],
      low: ['ui/**', 'docs/**'],
    },
    approvalWorkflows: {
      high: { required: ['architecture-team'], sla: '24h' },
      medium: { required: ['team-lead'], sla: '4h' },
      low: { action: 'auto-merge' },
    },
  },
  null,
  2,
);

/** Policy configuration admin screen with JSON editor and workflow viewer. */
export function PolicyConfigPage(): React.ReactElement {
  const [riskConfig, setRiskConfig] = useState(DEFAULT_RISK_CONFIG);
  const [saved, setSaved] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleSave(): void {
    try {
      JSON.parse(riskConfig);
      setParseError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Policy & Risk Config" subtitle="Configure risk tier rules and approval workflows" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Risk Tier Editor */}
          <Card>
            <CardHeader
              title="Risk Tier Rules"
              subtitle="JSON configuration for path-pattern risk classification"
              action={
                <button
                  onClick={handleSave}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                    saved ? 'bg-green-500' : 'bg-brand-600 hover:bg-brand-700'
                  }`}
                >
                  {saved ? '✓ Saved' : 'Save'}
                </button>
              }
            />
            <CardBody>
              <textarea
                value={riskConfig}
                onChange={(e) => {
                  setRiskConfig(e.target.value);
                  setParseError(null);
                  setSaved(false);
                }}
                className={`h-80 w-full rounded-lg border p-3 font-mono text-xs focus:outline-none focus:ring-2 ${
                  parseError
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-gray-200 focus:ring-brand-500'
                }`}
                spellCheck={false}
              />
              {parseError && (
                <p className="mt-2 text-xs text-red-500">JSON Error: {parseError}</p>
              )}
            </CardBody>
          </Card>

          {/* Architecture Rule Builder */}
          <Card>
            <CardHeader title="Architecture Rules" subtitle="Forbidden import patterns" />
            <CardBody>
              <div className="space-y-3">
                {[
                  {
                    source: 'services/**',
                    operator: 'cannot import',
                    target: 'ui/**',
                    enabled: true,
                  },
                  {
                    source: 'api/**',
                    operator: 'cannot import',
                    target: 'db/**',
                    enabled: true,
                  },
                  {
                    source: 'ui/**',
                    operator: 'cannot import',
                    target: 'services/**',
                    enabled: false,
                  },
                ].map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <span className="font-mono text-xs text-brand-700">{rule.source}</span>
                    <span className="text-xs text-gray-500">{rule.operator}</span>
                    <span className="font-mono text-xs text-red-600">{rule.target}</span>
                    <div className="ml-auto">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {rule.enabled ? 'active' : 'inactive'}
                      </span>
                    </div>
                  </div>
                ))}

                <button className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600">
                  + Add Rule
                </button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Approval Workflows */}
        <Card>
          <CardHeader title="Approval Workflows" subtitle="Who approves each risk tier" />
          <CardBody>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  tier: 'HIGH',
                  color: 'red',
                  required: ['architecture-team'],
                  sla: '24 hours',
                  action: 'Architecture review required',
                },
                {
                  tier: 'MEDIUM',
                  color: 'yellow',
                  required: ['team-lead'],
                  sla: '4 hours',
                  action: 'Team lead review required',
                },
                {
                  tier: 'LOW',
                  color: 'green',
                  required: [],
                  sla: 'Immediate',
                  action: 'Auto-merge',
                },
              ].map((wf) => (
                <div
                  key={wf.tier}
                  className={`rounded-xl border p-4 ${
                    wf.color === 'red'
                      ? 'border-red-200 bg-red-50'
                      : wf.color === 'yellow'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                      wf.color === 'red'
                        ? 'bg-red-100 text-red-700'
                        : wf.color === 'yellow'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {wf.tier}
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-900">{wf.action}</p>
                  {wf.required.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Reviewers:</p>
                      {wf.required.map((r) => (
                        <span
                          key={r}
                          className="mt-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs text-gray-700"
                        >
                          @{r}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">SLA: {wf.sla}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
