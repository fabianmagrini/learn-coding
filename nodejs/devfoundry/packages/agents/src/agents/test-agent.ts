/**
 * TestAgent — generates comprehensive test suites for existing code.
 *
 * Used to increase coverage, fix broken tests, or retrofit tests onto
 * legacy code that was written without them.
 */

import { AgentConfig, AgentInput } from '../types/index.js';
import { buildSystemPrompt, buildTestPrompt } from '../utils/prompt-builder.js';
import { BaseAgent } from './base-agent.js';

export class TestAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('test', config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt('TestAgent, a specialist in software testing and quality assurance', [
      'Generate comprehensive Vitest unit and integration tests',
      'Cover happy paths, edge cases, and error conditions',
      'Use proper mocking strategies for external dependencies',
      'Follow the Arrange-Act-Assert pattern',
      'Write descriptive test names that document expected behaviour',
      'Aim for high business-logic coverage, not just line coverage',
    ]);
  }

  protected buildPrompt(input: AgentInput): string {
    return buildTestPrompt(input);
  }
}
