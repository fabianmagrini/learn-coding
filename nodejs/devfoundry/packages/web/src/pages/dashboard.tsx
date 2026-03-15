/**
 * Engineering Dashboard — home screen.
 *
 * Shows KPI cards, AI vs human PR chart, agent activity feed,
 * and policy violations table.
 */

import { Header } from '../components/layout/header.js';
import { KpiCard } from '../components/ui/kpi-card.js';
import { Card, CardHeader, CardBody } from '../components/ui/card.js';
import { PRVolumeChart } from '../components/dashboard/pr-chart.js';
import { AgentActivityFeed } from '../components/dashboard/agent-feed.js';
import { ViolationsTable } from '../components/dashboard/violations-table.js';
import {
  mockDashboardMetrics,
  mockAgentRuns,
  mockPolicyViolations,
  mockPRChartData,
} from '../mocks/fixtures.js';

/** Engineering dashboard with KPIs, charts, and live activity feed. */
export function DashboardPage(): React.ReactElement {
  const metrics = mockDashboardMetrics;

  return (
    <div className="flex flex-col">
      <Header
        title="Engineering Dashboard"
        subtitle="AI-native engineering intelligence at a glance"
      />

      <div className="p-8">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            title="AI PR Acceptance Rate"
            value={`${metrics.aiPrAcceptanceRate}%`}
            trend={4.2}
            trendLabel="vs last week"
          />
          <KpiCard
            title="Deploy Frequency"
            value={metrics.deployFrequency}
            unit="/day"
            trend={0.8}
            trendLabel="vs last week"
          />
          <KpiCard
            title="Lead Time"
            value={metrics.leadTimeHours}
            unit="hours"
            trend={-0.5}
            trendLabel="improving"
          />
          <KpiCard
            title="Active Agents"
            value={metrics.activeAgents}
          />
        </div>

        {/* Charts + Feed Row */}
        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardHeader
                title="AI vs Human PR Volume"
                subtitle="Pull requests over the past 7 days"
              />
              <CardBody>
                <PRVolumeChart data={mockPRChartData} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Agent Activity Feed" subtitle="Live agent runs" />
            <CardBody className="overflow-y-auto max-h-80">
              <AgentActivityFeed runs={mockAgentRuns} />
            </CardBody>
          </Card>
        </div>

        {/* Violations Table */}
        <div className="mt-6">
          <Card>
            <CardHeader
              title="Policy Violations"
              subtitle={`${mockPolicyViolations.length} recent violations`}
            />
            <CardBody>
              <ViolationsTable violations={mockPolicyViolations} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
