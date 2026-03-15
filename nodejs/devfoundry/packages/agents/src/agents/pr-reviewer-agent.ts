/**
 * PRReviewerAgent — reviews pull requests for quality, architecture compliance,
 * security issues, and risk classification.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentConfig,
  AgentInput,
  AgentResult,
  PRReviewInput,
  PRReviewOutput,
  RiskTier,
} from '../types/index.js';
import { buildSystemPrompt, buildPRReviewPrompt } from '../utils/prompt-builder.js';
import { parseAgentResponse } from '../utils/response-parser.js';
import { BaseAgent } from './base-agent.js';

export class PRReviewerAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('pr-reviewer', config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt(
      'PRReviewerAgent, a specialist in code review, architecture governance, and risk assessment',
      [
        'Evaluate code quality, correctness, and test coverage',
        'Check compliance with architecture rules (no service-to-ui imports, etc.)',
        'Classify PR risk tier: high (auth/**, payments/**, db/schema/**), medium (services/**, api/**), low (ui/**, docs/**)',
        'Identify security vulnerabilities in the diff',
        'Produce structured review comments with severity levels',
        'Make a clear approve/request-changes decision',
      ],
    );
  }

  protected buildPrompt(input: AgentInput): string {
    // Cast is safe — callers of reviewPR pass PRReviewInput
    return buildPRReviewPrompt(input as PRReviewInput);
  }

  /**
   * Specialised method for PR reviews that returns a richer PRReviewOutput.
   */
  async reviewPR(input: PRReviewInput): Promise<AgentResult & { reviewOutput?: PRReviewOutput }> {
    const result = await this.run(input);

    if (!result.success || !result.output) {
      return result;
    }

    // Augment base output with PR-specific fields
    const rawOutput = result.output;
    const reviewOutput: PRReviewOutput = {
      ...rawOutput,
      approved: this.extractApproved(rawOutput.rawResponse ?? ''),
      comments: [],
      riskTier: this.classifyRisk(input.changedFiles),
      policyViolations: this.extractPolicyViolations(rawOutput.rawResponse ?? ''),
    };

    return { ...result, reviewOutput };
  }

  private extractApproved(rawResponse: string): boolean {
    try {
      const json = JSON.parse(this.extractJSON(rawResponse));
      return Boolean(json['approved']);
    } catch {
      // Default to not approved if we can't parse
      return false;
    }
  }

  private extractPolicyViolations(rawResponse: string): string[] {
    try {
      const json = JSON.parse(this.extractJSON(rawResponse));
      return Array.isArray(json['policyViolations']) ? (json['policyViolations'] as string[]) : [];
    } catch {
      return [];
    }
  }

  private extractJSON(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : text.trim();
  }

  /**
   * Classifies risk tier based on which files were changed.
   * Mirrors the policy engine logic on the API side.
   */
  private classifyRisk(changedFiles: string[]): RiskTier {
    const highPatterns = [/^auth\//, /^payments\//, /^db\/schema\//];
    const mediumPatterns = [/^services\//, /^api\//];

    for (const file of changedFiles) {
      if (highPatterns.some((p) => p.test(file))) return 'high';
    }
    for (const file of changedFiles) {
      if (mediumPatterns.some((p) => p.test(file))) return 'medium';
    }
    return 'low';
  }
}
