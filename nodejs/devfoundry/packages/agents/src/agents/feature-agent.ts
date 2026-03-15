/**
 * FeatureAgent — implements new features from developer intent descriptions.
 *
 * Given a natural language task like "add rate limiting to the payments API",
 * this agent generates production-ready TypeScript code and tests.
 */

import { AgentConfig, AgentInput } from '../types/index.js';
import { buildSystemPrompt, buildFeaturePrompt } from '../utils/prompt-builder.js';
import { BaseAgent } from './base-agent.js';

export class FeatureAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('feature', config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt('FeatureAgent, a specialist in implementing new software features', [
      'Translate developer intent into production-ready TypeScript code',
      'Generate comprehensive unit and integration tests alongside the implementation',
      'Follow existing code conventions and architectural patterns',
      'Produce complete, self-contained file changes with no placeholders',
      'Consider edge cases, error handling, and performance',
    ]);
  }

  protected buildPrompt(input: AgentInput): string {
    return buildFeaturePrompt(input);
  }
}
