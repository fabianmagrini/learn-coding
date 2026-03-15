/**
 * Unit tests for prompt-builder utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildFeaturePrompt,
  buildTestPrompt,
  buildRefactorPrompt,
  buildSecurityPrompt,
  buildDependencyPrompt,
  buildPRReviewPrompt,
} from '../src/utils/prompt-builder.js';
import type { AgentInput, PRReviewInput } from '../src/types/index.js';

const baseInput: AgentInput = { task: 'add rate limiting', repo: 'myapp' };
const inputWithContext: AgentInput = { ...baseInput, context: 'existing code here' };

describe('buildSystemPrompt', () => {
  it('includes the role', () => {
    const prompt = buildSystemPrompt('FeatureAgent', ['implement features']);
    expect(prompt).toContain('FeatureAgent');
  });

  it('lists all capabilities', () => {
    const caps = ['implement features', 'write tests', 'add types'];
    const prompt = buildSystemPrompt('Agent', caps);
    for (const cap of caps) {
      expect(prompt).toContain(cap);
    }
  });

  it('includes JSON schema instruction', () => {
    const prompt = buildSystemPrompt('Agent', ['cap']);
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"files"');
    expect(prompt).toContain('"diff"');
    expect(prompt).toContain('"paths"');
  });
});

describe('buildFeaturePrompt', () => {
  it('includes repo and task', () => {
    const prompt = buildFeaturePrompt(baseInput);
    expect(prompt).toContain(baseInput.repo);
    expect(prompt).toContain(baseInput.task);
  });

  it('includes context when provided', () => {
    const prompt = buildFeaturePrompt(inputWithContext);
    expect(prompt).toContain('existing code here');
  });

  it('omits context section when absent', () => {
    const prompt = buildFeaturePrompt(baseInput);
    expect(prompt).not.toContain('Context:');
  });
});

describe('buildTestPrompt', () => {
  it('includes repo and task', () => {
    const prompt = buildTestPrompt(baseInput);
    expect(prompt).toContain(baseInput.repo);
    expect(prompt).toContain(baseInput.task);
  });

  it('mentions Vitest', () => {
    const prompt = buildTestPrompt(baseInput);
    expect(prompt).toContain('Vitest');
  });

  it('includes existing code when context provided', () => {
    const prompt = buildTestPrompt(inputWithContext);
    expect(prompt).toContain('existing code here');
  });
});

describe('buildRefactorPrompt', () => {
  it('includes repo and task', () => {
    const prompt = buildRefactorPrompt(baseInput);
    expect(prompt).toContain(baseInput.repo);
    expect(prompt).toContain(baseInput.task);
  });

  it('mentions preserving existing behaviour', () => {
    const prompt = buildRefactorPrompt(baseInput);
    expect(prompt.toLowerCase()).toContain('existing behaviour');
  });
});

describe('buildSecurityPrompt', () => {
  it('includes repo and task', () => {
    const prompt = buildSecurityPrompt(baseInput);
    expect(prompt).toContain(baseInput.repo);
    expect(prompt).toContain(baseInput.task);
  });

  it('mentions OWASP', () => {
    const prompt = buildSecurityPrompt(baseInput);
    expect(prompt).toContain('OWASP');
  });
});

describe('buildDependencyPrompt', () => {
  it('includes repo and task', () => {
    const prompt = buildDependencyPrompt(baseInput);
    expect(prompt).toContain(baseInput.repo);
    expect(prompt).toContain(baseInput.task);
  });

  it('mentions CVEs', () => {
    const prompt = buildDependencyPrompt(baseInput);
    expect(prompt).toContain('CVE');
  });

  it('shows package.json context when provided', () => {
    const withCtx: AgentInput = { ...baseInput, context: '{"dependencies":{}}' };
    const prompt = buildDependencyPrompt(withCtx);
    expect(prompt).toContain('{"dependencies":{}}');
  });
});

describe('buildPRReviewPrompt', () => {
  const prInput: PRReviewInput = {
    task: 'review PR #42',
    repo: 'myapp',
    prTitle: 'Add rate limiting',
    prDescription: 'Token bucket impl',
    changedFiles: ['payments/rate-limiter.ts'],
    diff: '--- a/file\n+++ b/file\n@@ -1 +1 @@\n+code',
  };

  it('includes repo and PR title', () => {
    const prompt = buildPRReviewPrompt(prInput);
    expect(prompt).toContain(prInput.repo);
    expect(prompt).toContain(prInput.prTitle);
  });

  it('includes changed files', () => {
    const prompt = buildPRReviewPrompt(prInput);
    expect(prompt).toContain('payments/rate-limiter.ts');
  });

  it('includes the diff', () => {
    const prompt = buildPRReviewPrompt(prInput);
    expect(prompt).toContain(prInput.diff);
  });

  it('includes risk tier guidance', () => {
    const prompt = buildPRReviewPrompt(prInput);
    expect(prompt).toContain('riskTier');
  });

  it('omits description when not provided', () => {
    const input: PRReviewInput = { ...prInput, prDescription: undefined };
    const prompt = buildPRReviewPrompt(input);
    expect(prompt).not.toContain('PR Description:');
  });
});
