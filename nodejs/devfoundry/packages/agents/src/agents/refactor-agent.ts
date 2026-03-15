/**
 * RefactorAgent — improves code quality, structure, and maintainability
 * without changing observable behaviour.
 */

import { AgentConfig, AgentInput } from '../types/index.js';
import { buildSystemPrompt, buildRefactorPrompt } from '../utils/prompt-builder.js';
import { BaseAgent } from './base-agent.js';

export class RefactorAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('refactor', config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt(
      'RefactorAgent, a specialist in code quality and architecture improvement',
      [
        'Improve code readability, maintainability, and performance',
        'Apply SOLID principles and design patterns appropriately',
        'Strengthen TypeScript type safety (eliminate `any`, add proper generics)',
        'Reduce complexity (cyclomatic complexity, cognitive complexity)',
        'Preserve all existing behaviour — do not change public APIs without good reason',
        'Update tests to reflect any necessary API changes',
      ],
    );
  }

  protected buildPrompt(input: AgentInput): string {
    return buildRefactorPrompt(input);
  }
}
