/**
 * Unit tests for HarnessController.
 */

import { describe, it, expect, vi } from 'vitest';
import type { AgentOutput } from '@devfoundry/agents';

function makeAgentOutput(overrides: Partial<AgentOutput> = {}): AgentOutput {
  return {
    agentType: 'feature',
    task: 'add feature',
    repo: 'myapp',
    summary: 'Done',
    files: [{ path: 'ui/feature.tsx', content: 'export function F() {}', operation: 'create' }],
    diff: '+export function F() {}',
    paths: ['ui/feature.tsx'],
    tests: ['ui/feature.test.tsx'],
    ...overrides,
  };
}

describe('HarnessController', () => {
  async function makeController() {
    const { HarnessController } = await import('../src/modules/harness/harness.controller.js');
    const svc = { run: vi.fn() };
    return { ctrl: new HarnessController(svc as never), svc };
  }

  it('run delegates to HarnessService with agentOutput from dto', async () => {
    const { ctrl, svc } = await makeController();
    const agentOutput = makeAgentOutput();
    const harnessResult = {
      runId: 'harness-1',
      passed: true,
      action: 'auto-merge',
      steps: [],
      risk: { tier: 'low' },
      totalDurationMs: 500,
    };
    svc.run.mockResolvedValue(harnessResult);

    const result = await ctrl.run({ agentOutput });

    expect(svc.run).toHaveBeenCalledWith(agentOutput);
    expect(result).toEqual(harnessResult);
  });

  it('passes high-risk output to the harness correctly', async () => {
    const { ctrl, svc } = await makeController();
    const agentOutput = makeAgentOutput({
      paths: ['auth/login.ts'],
      files: [{ path: 'auth/login.ts', content: 'export {}', operation: 'update' }],
    });
    svc.run.mockResolvedValue({ action: 'architecture-review', passed: false });

    await ctrl.run({ agentOutput });

    expect(svc.run).toHaveBeenCalledWith(agentOutput);
  });
});
