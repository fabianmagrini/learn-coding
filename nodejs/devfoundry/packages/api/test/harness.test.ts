/**
 * Unit tests for HarnessService.
 * Uses dynamic imports to avoid TypeORM decorator issues in test env.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskClassifierService } from '../src/modules/policies/risk-classifier.service.js';
import type { AgentOutput } from '@devfoundry/agents';

function buildTestOutput(overrides: Partial<AgentOutput> = {}): AgentOutput {
  return {
    agentType: 'feature',
    task: 'add feature',
    repo: 'myapp',
    summary: 'Added feature',
    files: [
      {
        path: 'ui/components/NewFeature.tsx',
        content: 'export function NewFeature() { return null; }',
        operation: 'create',
      },
    ],
    diff: '+export function NewFeature() { return null; }',
    paths: ['ui/components/NewFeature.tsx'],
    tests: ['ui/components/NewFeature.test.tsx'],
    ...overrides,
  };
}

describe('HarnessService', () => {
  it('returns a structured harness result', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const { HarnessService } = await import('../src/modules/harness/harness.service.js');

    const riskClassifier = new RiskClassifierService();
    const mockPolicyRepo = { find: vi.fn().mockResolvedValue([]) };
    const policyEngine = new PolicyEngineService(mockPolicyRepo as never, riskClassifier);
    const service = new HarnessService(policyEngine, riskClassifier);

    const output = buildTestOutput();
    const result = await service.run(output);

    expect(result.runId).toBeTruthy();
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps.length).toBeGreaterThanOrEqual(5);
    expect(result.risk).toBeDefined();
    expect(result.policy).toBeDefined();
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('includes all expected pipeline steps', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const { HarnessService } = await import('../src/modules/harness/harness.service.js');

    const riskClassifier = new RiskClassifierService();
    const mockPolicyRepo = { find: vi.fn().mockResolvedValue([]) };
    const policyEngine = new PolicyEngineService(mockPolicyRepo as never, riskClassifier);
    const service = new HarnessService(policyEngine, riskClassifier);

    const result = await service.run(buildTestOutput());

    const stepNames = result.steps.map((s) => s.name);
    expect(stepNames).toContain('build');
    expect(stepNames).toContain('tests');
    expect(stepNames).toContain('lint');
    expect(stepNames).toContain('architecture-check');
    expect(stepNames).toContain('risk-classification');
    expect(stepNames).toContain('policy-evaluation');
  });

  it('recommends auto-merge for clean low-risk output with tests', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const { HarnessService } = await import('../src/modules/harness/harness.service.js');

    const riskClassifier = new RiskClassifierService();
    const mockPolicyRepo = { find: vi.fn().mockResolvedValue([]) };
    const policyEngine = new PolicyEngineService(mockPolicyRepo as never, riskClassifier);
    const service = new HarnessService(policyEngine, riskClassifier);

    const result = await service.run(buildTestOutput());
    expect(result.action).toBe('auto-merge');
  });

  it('fails tests step when no tests are provided', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const { HarnessService } = await import('../src/modules/harness/harness.service.js');

    const riskClassifier = new RiskClassifierService();
    const mockPolicyRepo = { find: vi.fn().mockResolvedValue([]) };
    const policyEngine = new PolicyEngineService(mockPolicyRepo as never, riskClassifier);
    const service = new HarnessService(policyEngine, riskClassifier);

    const result = await service.run(buildTestOutput({ tests: [] }));
    const testStep = result.steps.find((s) => s.name === 'tests');
    expect(testStep?.passed).toBe(false);
  });

  it('rejects when build fails (debugger present)', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const { HarnessService } = await import('../src/modules/harness/harness.service.js');

    const riskClassifier = new RiskClassifierService();
    const mockPolicyRepo = { find: vi.fn().mockResolvedValue([]) };
    const policyEngine = new PolicyEngineService(mockPolicyRepo as never, riskClassifier);
    const service = new HarnessService(policyEngine, riskClassifier);

    const output = buildTestOutput({
      files: [
        {
          path: 'ui/test.tsx',
          content: 'debugger;\nexport function Test() {}',
          operation: 'create',
        },
      ],
    });

    const result = await service.run(output);
    const lintStep = result.steps.find((s) => s.name === 'lint');
    expect(lintStep?.passed).toBe(false);
  });
});
