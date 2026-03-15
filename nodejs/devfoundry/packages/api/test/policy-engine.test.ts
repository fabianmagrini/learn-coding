/**
 * Unit tests for the PolicyEngineService.
 *
 * We test the service's logic directly by mocking the TypeORM repository
 * and avoiding decorator-dependent entity imports.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskClassifierService } from '../src/modules/policies/risk-classifier.service.js';

// We test the parts of the policy engine that don't require TypeORM decorators.
// The full PolicyEngineService is integration-tested via the harness.
describe('PolicyEngineService — architecture check', () => {
  // Import the service dynamically to avoid decorator issues in test env
  it('checkArchitecture detects service-to-ui imports', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const riskClassifier = new RiskClassifierService();
    const mockRepo = { find: vi.fn().mockResolvedValue([]) };
    const service = new PolicyEngineService(mockRepo as never, riskClassifier);

    const diff = `--- a/services/user.ts\n+++ b/services/user.ts\n+import { Button } from 'ui/components';\n`;
    const violations = service.checkArchitecture(diff);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].rule).toBe('no-service-to-ui-import');
  });

  it('checkArchitecture passes on clean diffs', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const riskClassifier = new RiskClassifierService();
    const mockRepo = { find: vi.fn().mockResolvedValue([]) };
    const service = new PolicyEngineService(mockRepo as never, riskClassifier);

    const diff = `--- a/services/user.ts\n+++ b/services/user.ts\n+export function getUser() {}\n`;
    const violations = service.checkArchitecture(diff);
    expect(violations).toHaveLength(0);
  });
});

describe('PolicyEngineService — evaluate', () => {
  it('passes for clean low-risk output', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const riskClassifier = new RiskClassifierService();
    const mockRepo = { find: vi.fn().mockResolvedValue([]) };
    const service = new PolicyEngineService(mockRepo as never, riskClassifier);

    const output = {
      agentType: 'feature' as const,
      task: 'add feature',
      repo: 'myapp',
      summary: 'Added feature',
      files: [],
      diff: '',
      paths: ['ui/button.tsx'],
      tests: ['ui/button.test.tsx'],
    };

    const result = await service.evaluate(output);
    expect(result.passed).toBe(true);
    expect(result.tier).toBe('low');
    expect(result.action).toBe('auto-merge');
  });

  it('flags missing tests for high-risk paths', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const riskClassifier = new RiskClassifierService();
    const mockRepo = { find: vi.fn().mockResolvedValue([]) };
    const service = new PolicyEngineService(mockRepo as never, riskClassifier);

    const output = {
      agentType: 'feature' as const,
      task: 'add auth feature',
      repo: 'myapp',
      summary: 'Added auth feature',
      files: [],
      diff: '',
      paths: ['auth/login.ts'],
      tests: [],
    };

    const result = await service.evaluate(output);
    const violation = result.violations.find((v) => v.rule === 'tests-required-for-high-risk');
    expect(violation).toBeDefined();
    expect(result.passed).toBe(false);
  });

  it('flags service-to-ui import violations', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const riskClassifier = new RiskClassifierService();
    const mockRepo = { find: vi.fn().mockResolvedValue([]) };
    const service = new PolicyEngineService(mockRepo as never, riskClassifier);

    const output = {
      agentType: 'feature' as const,
      task: 'add service',
      repo: 'myapp',
      summary: 'Added service',
      files: [
        {
          path: 'services/user.service.ts',
          content: `import { Button } from "ui/components/Button";`,
          operation: 'create' as const,
        },
      ],
      diff: '',
      paths: ['services/user.service.ts'],
      tests: ['services/user.service.test.ts'],
    };

    const result = await service.evaluate(output);
    const violation = result.violations.find((v) => v.rule === 'no-service-to-ui-import');
    expect(violation).toBeDefined();
  });

  it('assigns team-lead-review for medium-risk passing output', async () => {
    const { PolicyEngineService } = await import(
      '../src/modules/policies/policy-engine.service.js'
    );
    const riskClassifier = new RiskClassifierService();
    const mockRepo = { find: vi.fn().mockResolvedValue([]) };
    const service = new PolicyEngineService(mockRepo as never, riskClassifier);

    const output = {
      agentType: 'feature' as const,
      task: 'add service',
      repo: 'myapp',
      summary: 'Added service',
      files: [
        {
          path: 'services/user.service.ts',
          content: 'export class UserService {}',
          operation: 'create' as const,
        },
      ],
      diff: '',
      paths: ['services/user.service.ts'],
      tests: ['services/user.service.test.ts'],
    };

    const result = await service.evaluate(output);
    expect(result.tier).toBe('medium');
    expect(result.action).toBe('team-lead-review');
  });
});
