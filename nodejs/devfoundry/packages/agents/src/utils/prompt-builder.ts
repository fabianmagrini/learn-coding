/**
 * Utility helpers for building structured prompts for each agent type.
 */

import { AgentInput, PRReviewInput } from '../types/index.js';

export function buildSystemPrompt(role: string, capabilities: string[]): string {
  return `You are ${role}, part of the DevFoundry AI-Native Engineering Platform.

Your capabilities:
${capabilities.map((c) => `- ${c}`).join('\n')}

Response format:
Always respond with a JSON object matching this schema:
{
  "summary": "<one paragraph describing what you did>",
  "files": [
    { "path": "<file path>", "content": "<full file content>", "operation": "create|update|delete" }
  ],
  "diff": "<unified diff string>",
  "paths": ["<list of all file paths touched>"],
  "tests": ["<test file paths if any>"],
  "notes": ["<any warnings or notes>"]
}

Rules:
- Always produce complete, working TypeScript code — no placeholders or TODOs
- Follow existing conventions in the repository
- Include comprehensive error handling
- Write meaningful tests that cover business logic
`;
}

export function buildFeaturePrompt(input: AgentInput): string {
  return `Repository: ${input.repo}
Task: ${input.task}
${input.context ? `\nContext:\n${input.context}` : ''}

Implement the requested feature. Produce complete, production-ready TypeScript code including:
1. The feature implementation
2. Unit tests
3. Any necessary type definitions
4. JSDoc comments on public APIs`;
}

export function buildTestPrompt(input: AgentInput): string {
  return `Repository: ${input.repo}
Task: ${input.task}
${input.context ? `\nExisting Code:\n${input.context}` : ''}

Generate comprehensive tests for the given code. Include:
1. Unit tests with Vitest
2. Edge cases and error paths
3. Mock strategies for external dependencies
4. Setup and teardown where needed`;
}

export function buildRefactorPrompt(input: AgentInput): string {
  return `Repository: ${input.repo}
Task: ${input.task}
${input.context ? `\nCode to Refactor:\n${input.context}` : ''}

Refactor the code to improve:
1. Readability and maintainability
2. Performance where applicable
3. TypeScript type safety
4. Adherence to SOLID principles
Preserve all existing behaviour and tests.`;
}

export function buildSecurityPrompt(input: AgentInput): string {
  return `Repository: ${input.repo}
Task: ${input.task}
${input.context ? `\nCode to Audit:\n${input.context}` : ''}

Perform a security audit. Check for:
1. OWASP Top 10 vulnerabilities
2. Injection attacks (SQL, NoSQL, command)
3. Authentication/authorization flaws
4. Sensitive data exposure
5. Insecure dependencies
Produce a security report and patched files.`;
}

export function buildDependencyPrompt(input: AgentInput): string {
  return `Repository: ${input.repo}
Task: ${input.task}
${input.context ? `\npackage.json:\n${input.context}` : ''}

Analyse and update dependencies:
1. Identify outdated packages
2. Check for security vulnerabilities (CVEs)
3. Propose safe version bumps
4. Note any breaking changes requiring code changes`;
}

export function buildPRReviewPrompt(input: PRReviewInput): string {
  return `Repository: ${input.repo}
PR Title: ${input.prTitle}
${input.prDescription ? `PR Description: ${input.prDescription}` : ''}
Changed Files: ${input.changedFiles.join(', ')}

Diff:
${input.diff}

Review this pull request. Evaluate:
1. Code quality and correctness
2. Test coverage
3. Architecture rule compliance (services should not import ui modules)
4. Security concerns
5. Risk tier (high/medium/low) based on paths: auth/**, payments/**, db/schema/** = high; services/**, api/** = medium; ui/**, docs/** = low

Return your review JSON with an additional "approved" boolean, "riskTier" string, "policyViolations" array, and "comments" array.`;
}
