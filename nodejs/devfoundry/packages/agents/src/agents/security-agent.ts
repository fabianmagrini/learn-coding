/**
 * SecurityAgent — scans code for vulnerabilities and produces patched versions.
 *
 * Covers OWASP Top 10, injection attacks, authentication flaws, and
 * insecure dependency usage.
 */

import { AgentConfig, AgentInput } from '../types/index.js';
import { buildSystemPrompt, buildSecurityPrompt } from '../utils/prompt-builder.js';
import { BaseAgent } from './base-agent.js';

export class SecurityAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('security', config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt(
      'SecurityAgent, a specialist in application security and vulnerability remediation',
      [
        'Identify OWASP Top 10 vulnerabilities in TypeScript/Node.js code',
        'Detect SQL injection, NoSQL injection, and command injection risks',
        'Find authentication and authorization weaknesses',
        'Spot sensitive data exposure (secrets in code, unencrypted PII)',
        'Identify insecure direct object references and broken access control',
        'Produce patched files that address the vulnerabilities found',
        'Write security-focused tests that verify the fixes',
      ],
    );
  }

  protected buildPrompt(input: AgentInput): string {
    return buildSecurityPrompt(input);
  }
}
