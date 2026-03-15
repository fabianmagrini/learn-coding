/**
 * Mock data fixtures for development and testing.
 * Used when the API is not available or for Storybook.
 */

import type {
  DashboardMetrics,
  AgentRun,
  PullRequest,
  PolicyViolation,
  PRChartDataPoint,
  ArchitectureViolation,
} from '../types/index.js';

export const mockDashboardMetrics: DashboardMetrics = {
  aiPrAcceptanceRate: 82,
  deployFrequency: 4.2,
  leadTimeHours: 6.5,
  activeAgents: 6,
  architectureViolations: 3,
  totalAgentRuns: 147,
};

export const mockAgentRuns: AgentRun[] = [
  {
    id: 'run-001',
    agentType: 'feature',
    task: 'Implement rate limiting on payments API',
    repo: 'acme/payments-service',
    status: 'completed',
    durationMs: 12400,
    summary: 'Added token bucket rate limiter with Redis backing. Created 3 files, 2 tests.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'run-002',
    agentType: 'security',
    task: 'Audit auth module for SQL injection vulnerabilities',
    repo: 'acme/auth-service',
    status: 'completed',
    durationMs: 8900,
    summary: 'Found 1 potential injection risk. Generated patched version and security tests.',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'run-003',
    agentType: 'test',
    task: 'Generate tests for UserService',
    repo: 'acme/user-service',
    status: 'running',
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: 'run-004',
    agentType: 'refactor',
    task: 'Refactor payment processing to use SOLID principles',
    repo: 'acme/payments-service',
    status: 'failed',
    error: 'Context window exceeded — try with a smaller code section',
    durationMs: 5200,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'run-005',
    agentType: 'dependency',
    task: 'Update outdated npm packages',
    repo: 'acme/api-gateway',
    status: 'completed',
    durationMs: 6100,
    summary: 'Bumped 12 packages. 2 have breaking changes documented in notes.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'run-006',
    agentType: 'pr-reviewer',
    task: 'Review PR #88: Add webhook support',
    repo: 'acme/notifications-service',
    status: 'completed',
    durationMs: 4300,
    summary: 'Approved with 2 minor suggestions. Risk tier: LOW. Policy: PASSED.',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

export const mockPullRequests: PullRequest[] = [
  {
    id: 'pr-001',
    prNumber: 142,
    title: 'feat: Add rate limiting to payments API',
    description: 'Implements token bucket rate limiting with Redis. Requires architecture review.',
    repo: 'acme/payments-service',
    status: 'open',
    riskTier: 'high',
    approvalStatus: 'pending',
    policyPassed: false,
    isAiGenerated: true,
    agentRunId: 'run-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'pr-002',
    prNumber: 141,
    title: 'fix: Patch SQL injection in user lookup',
    repo: 'acme/auth-service',
    status: 'open',
    riskTier: 'high',
    approvalStatus: 'pending',
    policyPassed: true,
    isAiGenerated: true,
    agentRunId: 'run-002',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'pr-003',
    prNumber: 140,
    title: 'chore: Update npm dependencies',
    repo: 'acme/api-gateway',
    status: 'merged',
    riskTier: 'low',
    approvalStatus: 'approved',
    policyPassed: true,
    isAiGenerated: true,
    agentRunId: 'run-005',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'pr-004',
    prNumber: 139,
    title: 'feat: Add webhook support for notifications',
    repo: 'acme/notifications-service',
    status: 'open',
    riskTier: 'medium',
    approvalStatus: 'approved',
    policyPassed: true,
    isAiGenerated: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

export const mockPolicyViolations: PolicyViolation[] = [
  {
    id: 'viol-001',
    rule: 'no-service-to-ui-import',
    message: 'Service module cannot import UI components: payments/rate-limiter.ts',
    severity: 'error',
    file: 'payments/rate-limiter.ts',
    agentRunId: 'run-001',
    repo: 'acme/payments-service',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'viol-002',
    rule: 'tests-required-for-high-risk',
    message: 'High-risk auth changes must include test files',
    severity: 'error',
    agentRunId: 'run-002',
    repo: 'acme/auth-service',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'viol-003',
    rule: 'no-direct-db-access-from-api',
    message: 'API controller should not directly use TypeORM repositories',
    severity: 'warning',
    file: 'api/controllers/user.controller.ts',
    repo: 'acme/user-service',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

export const mockPRChartData: PRChartDataPoint[] = [
  { date: '2026-03-09', aiPRs: 3, humanPRs: 8 },
  { date: '2026-03-10', aiPRs: 5, humanPRs: 7 },
  { date: '2026-03-11', aiPRs: 7, humanPRs: 6 },
  { date: '2026-03-12', aiPRs: 9, humanPRs: 5 },
  { date: '2026-03-13', aiPRs: 11, humanPRs: 6 },
  { date: '2026-03-14', aiPRs: 13, humanPRs: 4 },
  { date: '2026-03-15', aiPRs: 15, humanPRs: 5 },
];

export const mockArchitectureViolations: ArchitectureViolation[] = [
  {
    id: 'arch-001',
    rule: 'no-service-to-ui-import',
    source: 'services/user.ts',
    target: 'ui/components/Avatar',
    file: 'services/user.ts',
    severity: 'error',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'arch-002',
    rule: 'no-direct-db-access-from-api',
    source: 'api/controllers/orders.ts',
    target: 'typeorm/Repository',
    file: 'api/controllers/orders.ts',
    severity: 'warning',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'arch-003',
    rule: 'no-service-to-ui-import',
    source: 'services/notification.ts',
    target: 'ui/components/Toast',
    file: 'services/notification.ts',
    severity: 'error',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];
