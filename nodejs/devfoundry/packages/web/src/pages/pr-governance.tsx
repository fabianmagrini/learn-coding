/**
 * PR Governance screen — list of PRs with risk tier badges and policy status.
 */

import { Header } from '../components/layout/header.js';
import { Card, CardHeader } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { mockPullRequests } from '../mocks/fixtures.js';
import type { PullRequest, RiskTier } from '../types/index.js';
import { formatRelativeTime } from '../lib/utils.js';

function riskVariant(tier: RiskTier): 'error' | 'warning' | 'success' {
  switch (tier) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'success';
  }
}

function approvalVariant(status: string): 'success' | 'error' | 'warning' {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'warning';
  }
}

function PRRow({ pr }: { pr: PullRequest }): React.ReactElement {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">#{pr.prNumber}</span>
          <span className="font-medium text-gray-900">{pr.title}</span>
          {pr.isAiGenerated && (
            <Badge variant="info">AI</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{pr.repo}</p>
      </td>
      <td className="px-6 py-4">
        <Badge variant={riskVariant(pr.riskTier)}>
          {pr.riskTier.toUpperCase()}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          {pr.policyPassed ? (
            <span className="text-green-600 text-sm">✓</span>
          ) : (
            <span className="text-red-500 text-sm">✗</span>
          )}
          <span className={`text-xs ${pr.policyPassed ? 'text-green-600' : 'text-red-500'}`}>
            {pr.policyPassed ? 'Passed' : 'Failed'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant={approvalVariant(pr.approvalStatus)}>
          {pr.approvalStatus}
        </Badge>
      </td>
      <td className="px-6 py-4 text-xs text-gray-500">{formatRelativeTime(pr.createdAt)}</td>
    </tr>
  );
}

/** PR governance table with risk tiers and policy check results. */
export function PRGovernancePage(): React.ReactElement {
  const prs = mockPullRequests;

  return (
    <div className="flex flex-col">
      <Header title="PR Governance" subtitle="Risk classification and policy compliance for all pull requests" />
      <div className="p-8">
        <Card>
          <CardHeader
            title="Pull Requests"
            subtitle={`${prs.length} total · ${prs.filter((p) => p.status === 'open').length} open`}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Pull Request</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Risk Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Policy</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Approval</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr) => (
                  <PRRow key={pr.id} pr={pr} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
