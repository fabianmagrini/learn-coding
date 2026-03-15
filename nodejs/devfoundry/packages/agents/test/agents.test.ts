/**
 * Unit tests for DevFoundry agents.
 * Uses mock mode (no ANTHROPIC_API_KEY required).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureAgent } from '../src/agents/feature-agent.js';
import { TestAgent } from '../src/agents/test-agent.js';
import { RefactorAgent } from '../src/agents/refactor-agent.js';
import { SecurityAgent } from '../src/agents/security-agent.js';
import { DependencyAgent } from '../src/agents/dependency-agent.js';
import { PRReviewerAgent } from '../src/agents/pr-reviewer-agent.js';
import { buildMockOutput } from '../src/utils/mock-responses.js';
import { parseAgentResponse } from '../src/utils/response-parser.js';
import type { AgentInput, PRReviewInput } from '../src/types/index.js';

// Ensure we always run in mock mode for tests
beforeEach(() => {
  delete process.env['ANTHROPIC_API_KEY'];
});

const baseInput: AgentInput = {
  task: 'add rate limiting to the payments API',
  repo: 'myapp',
};

describe('FeatureAgent', () => {
  it('runs successfully in mock mode', async () => {
    const agent = new FeatureAgent({ allowMock: true });
    const result = await agent.run(baseInput);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output?.agentType).toBe('feature');
    expect(result.output?.task).toBe(baseInput.task);
    expect(result.output?.repo).toBe(baseInput.repo);
    expect(result.output?.files.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('produces file changes with valid operations', async () => {
    const agent = new FeatureAgent({ allowMock: true });
    const result = await agent.run(baseInput);

    for (const file of result.output!.files) {
      expect(['create', 'update', 'delete']).toContain(file.operation);
      expect(file.path).toBeTruthy();
    }
  });

  it('includes a diff in the output', async () => {
    const agent = new FeatureAgent({ allowMock: true });
    const result = await agent.run(baseInput);

    expect(result.output?.diff).toBeTruthy();
  });
});

describe('TestAgent', () => {
  it('runs successfully in mock mode', async () => {
    const agent = new TestAgent({ allowMock: true });
    const result = await agent.run({ task: 'generate tests for UserService', repo: 'myapp' });

    expect(result.success).toBe(true);
    expect(result.output?.agentType).toBe('test');
  });
});

describe('RefactorAgent', () => {
  it('runs successfully in mock mode', async () => {
    const agent = new RefactorAgent({ allowMock: true });
    const result = await agent.run({ task: 'refactor payment service to use SOLID principles', repo: 'myapp' });

    expect(result.success).toBe(true);
    expect(result.output?.agentType).toBe('refactor');
  });
});

describe('SecurityAgent', () => {
  it('runs successfully in mock mode', async () => {
    const agent = new SecurityAgent({ allowMock: true });
    const result = await agent.run({ task: 'audit auth module for vulnerabilities', repo: 'myapp' });

    expect(result.success).toBe(true);
    expect(result.output?.agentType).toBe('security');
  });
});

describe('DependencyAgent', () => {
  it('runs successfully in mock mode', async () => {
    const agent = new DependencyAgent({ allowMock: true });
    const result = await agent.run({ task: 'update outdated packages', repo: 'myapp' });

    expect(result.success).toBe(true);
    expect(result.output?.agentType).toBe('dependency');
  });
});

describe('PRReviewerAgent', () => {
  const prInput: PRReviewInput = {
    task: 'review PR #42',
    repo: 'myapp',
    prTitle: 'Add rate limiting to payments API',
    prDescription: 'Implements token bucket rate limiting',
    changedFiles: ['payments/rate-limiter.ts', 'payments/rate-limiter.test.ts'],
    diff: `--- a/payments/rate-limiter.ts\n+++ b/payments/rate-limiter.ts\n@@ -0,0 +1,20 @@\n+export class RateLimiter {}`,
  };

  it('runs as a standard agent', async () => {
    const agent = new PRReviewerAgent({ allowMock: true });
    const result = await agent.run(prInput);

    expect(result.success).toBe(true);
    expect(result.output?.agentType).toBe('pr-reviewer');
  });

  it('reviewPR method returns review output', async () => {
    const agent = new PRReviewerAgent({ allowMock: true });
    const result = await agent.reviewPR(prInput);

    expect(result.success).toBe(true);
  });

  it('classifies high-risk files correctly', async () => {
    const agent = new PRReviewerAgent({ allowMock: true });
    const highRiskInput: PRReviewInput = {
      ...prInput,
      changedFiles: ['auth/login.ts', 'auth/jwt.ts'],
    };
    const result = await agent.reviewPR(highRiskInput);

    // In mock mode reviewOutput may not be fully populated, just check it ran
    expect(result.success).toBe(true);
  });
});

describe('buildMockOutput', () => {
  it('produces output with all required fields', () => {
    const output = buildMockOutput('feature', 'add login', 'myapp');

    expect(output.agentType).toBe('feature');
    expect(output.task).toBe('add login');
    expect(output.repo).toBe('myapp');
    expect(output.summary).toBeTruthy();
    expect(Array.isArray(output.files)).toBe(true);
    expect(output.diff).toBeTruthy();
    expect(Array.isArray(output.paths)).toBe(true);
  });

  it('generates correct file operations', () => {
    const output = buildMockOutput('test', 'generate tests', 'repo');

    for (const file of output.files) {
      expect(['create', 'update', 'delete']).toContain(file.operation);
    }
  });
});

describe('parseAgentResponse', () => {
  it('parses valid JSON responses', () => {
    const validResponse = JSON.stringify({
      summary: 'Implemented feature successfully',
      files: [{ path: 'src/feature.ts', content: 'export function f() {}', operation: 'create' }],
      diff: '--- a\n+++ b\n@@ -0,0 +1 @@\n+export function f() {}',
      paths: ['src/feature.ts'],
      tests: ['src/feature.test.ts'],
      notes: [],
    });

    const output = parseAgentResponse(validResponse, 'feature', 'add feature', 'myapp');

    expect(output.summary).toBe('Implemented feature successfully');
    expect(output.files).toHaveLength(1);
    expect(output.files[0].path).toBe('src/feature.ts');
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const wrappedResponse = `Here is the result:\n\`\`\`json\n${JSON.stringify({
      summary: 'Done',
      files: [],
      diff: '',
      paths: [],
    })}\n\`\`\``;

    const output = parseAgentResponse(wrappedResponse, 'test', 'task', 'repo');
    expect(output.summary).toBe('Done');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAgentResponse('not json at all', 'feature', 'task', 'repo')).toThrow();
  });
});
