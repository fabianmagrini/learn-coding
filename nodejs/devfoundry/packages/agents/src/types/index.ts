/**
 * Core types for the DevFoundry agent library.
 */

export type AgentType =
  | 'feature'
  | 'test'
  | 'refactor'
  | 'security'
  | 'dependency'
  | 'pr-reviewer';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

export type RiskTier = 'high' | 'medium' | 'low';

/** Input provided to every agent run */
export interface AgentInput {
  /** The task description / intent from the developer */
  task: string;
  /** Target repository name or path */
  repo: string;
  /** Optional additional context (file contents, diffs, etc.) */
  context?: string;
  /** Extra metadata passed through to the agent */
  metadata?: Record<string, unknown>;
}

/** A single file change produced by an agent */
export interface FileChange {
  path: string;
  content: string;
  operation: 'create' | 'update' | 'delete';
}

/** Structured output returned by every agent */
export interface AgentOutput {
  agentType: AgentType;
  task: string;
  repo: string;
  /** Human-readable summary of what was done */
  summary: string;
  /** Files created / modified / deleted */
  files: FileChange[];
  /** Unified diff string */
  diff: string;
  /** All file paths that were touched */
  paths: string[];
  /** Tests produced (if any) */
  tests?: string[];
  /** Warnings or notes from the agent */
  notes?: string[];
  /** Raw model response text */
  rawResponse?: string;
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** Unified response envelope from an agent run */
export interface AgentResult {
  success: boolean;
  output?: AgentOutput;
  error?: string;
  durationMs: number;
}

/** Configuration passed to the base agent */
export interface AgentConfig {
  /** Anthropic model to use */
  model?: string;
  /** Max tokens for the response */
  maxTokens?: number;
  /** Temperature (0–1) */
  temperature?: number;
  /** Whether to fall back to mock when API key is absent */
  allowMock?: boolean;
}

/** Parameters for PR review */
export interface PRReviewInput extends AgentInput {
  diff: string;
  prTitle: string;
  prDescription?: string;
  changedFiles: string[];
}

/** Output of a PR review */
export interface PRReviewOutput extends AgentOutput {
  approved: boolean;
  comments: PRComment[];
  riskTier: RiskTier;
  policyViolations: string[];
}

export interface PRComment {
  file?: string;
  line?: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
}
