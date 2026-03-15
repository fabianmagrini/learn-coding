/**
 * DependencyAgent — analyses and safely updates project dependencies.
 *
 * Identifies outdated packages, CVEs, and proposes safe version upgrades
 * while noting any breaking changes that require code modifications.
 */

import { AgentConfig, AgentInput } from '../types/index.js';
import { buildSystemPrompt, buildDependencyPrompt } from '../utils/prompt-builder.js';
import { BaseAgent } from './base-agent.js';

export class DependencyAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('dependency', config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt(
      'DependencyAgent, a specialist in software supply chain and dependency management',
      [
        'Analyse package.json files to identify outdated and vulnerable dependencies',
        'Check for known CVEs in current dependency versions',
        'Propose the safest compatible version upgrades',
        'Identify and document breaking changes that require code adaptation',
        'Suggest replacing deprecated or unmaintained packages',
        'Evaluate transitive dependency risks',
      ],
    );
  }

  protected buildPrompt(input: AgentInput): string {
    return buildDependencyPrompt(input);
  }
}
