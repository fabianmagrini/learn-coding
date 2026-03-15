/**
 * Shared TypeScript types for the DevFoundry web dashboard.
 */

export type RiskTier = 'high' | 'medium' | 'low';
export type AgentStatus = 'running' | 'completed' | 'failed' | 'queued';
export type PRStatus = 'open' | 'merged' | 'closed' | 'draft';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface DashboardMetrics {
  aiPrAcceptanceRate: number;
  deployFrequency: number;
  leadTimeHours: number;
  activeAgents: number;
  architectureViolations: number;
  totalAgentRuns: number;
}

export interface AgentRun {
  id: string;
  agentType: string;
  task: string;
  repo: string;
  status: AgentStatus;
  durationMs?: number;
  summary?: string;
  error?: string;
  createdAt: string;
  output?: AgentOutput;
}

export interface AgentOutput {
  files: FileChange[];
  diff: string;
  paths: string[];
  tests?: string[];
  notes?: string[];
}

export interface FileChange {
  path: string;
  content: string;
  operation: 'create' | 'update' | 'delete';
}

export interface PullRequest {
  id: string;
  prNumber?: number;
  title: string;
  description?: string;
  repo: string;
  status: PRStatus;
  riskTier: RiskTier;
  approvalStatus: ApprovalStatus;
  policyPassed: boolean;
  isAiGenerated: boolean;
  agentRunId?: string;
  createdAt: string;
}

export interface PolicyViolation {
  id: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  agentRunId?: string;
  repo: string;
  createdAt: string;
}

export interface PRChartDataPoint {
  date: string;
  aiPRs: number;
  humanPRs: number;
}

export interface ArchitectureViolation {
  id: string;
  rule: string;
  source: string;
  target: string;
  file: string;
  severity: 'error' | 'warning';
  createdAt: string;
}
