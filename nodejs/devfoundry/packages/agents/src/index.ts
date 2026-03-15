/**
 * @devfoundry/agents — public API
 *
 * Re-exports all agent classes, types, and utilities.
 */

// Agents
export { BaseAgent } from './agents/base-agent.js';
export { FeatureAgent } from './agents/feature-agent.js';
export { TestAgent } from './agents/test-agent.js';
export { RefactorAgent } from './agents/refactor-agent.js';
export { SecurityAgent } from './agents/security-agent.js';
export { DependencyAgent } from './agents/dependency-agent.js';
export { PRReviewerAgent } from './agents/pr-reviewer-agent.js';

// Types
export type {
  AgentType,
  AgentStatus,
  RiskTier,
  AgentInput,
  AgentOutput,
  AgentResult,
  AgentConfig,
  FileChange,
  PRReviewInput,
  PRReviewOutput,
  PRComment,
} from './types/index.js';

// Utilities (for advanced usage)
export { buildMockOutput } from './utils/mock-responses.js';
export { parseAgentResponse, ResponseParseError } from './utils/response-parser.js';
