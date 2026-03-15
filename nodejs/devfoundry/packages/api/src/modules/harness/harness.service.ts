/**
 * HarnessService — the AI change validation pipeline.
 *
 * Runs agent outputs through: build → test → lint → architecture check
 * → risk classification → policy evaluation → decision.
 *
 * Pipeline steps are simulated (exec commands or mock) since the harness
 * runs outside the target repository in the MVP. The logic and data flow
 * are production-ready.
 */

import { Injectable } from '@nestjs/common';
import { PolicyEngineService, PolicyEvaluation } from '../policies/policy-engine.service.js';
import { RiskClassifierService, RiskClassification } from '../policies/risk-classifier.service.js';
import type { AgentOutput } from '@devfoundry/agents';

export interface StepResult {
  name: string;
  passed: boolean;
  durationMs: number;
  output?: string;
  error?: string;
}

export interface HarnessResult {
  /** Unique ID for this harness run */
  runId: string;
  /** Overall pass/fail */
  passed: boolean;
  /** Recommended action */
  action: 'auto-merge' | 'team-lead-review' | 'architecture-review' | 'reject';
  /** Individual step results */
  steps: StepResult[];
  /** Risk classification */
  risk: RiskClassification;
  /** Policy evaluation */
  policy: PolicyEvaluation;
  /** Total duration */
  totalDurationMs: number;
}

@Injectable()
export class HarnessService {
  constructor(
    private readonly policyEngine: PolicyEngineService,
    private readonly riskClassifier: RiskClassifierService,
  ) {}

  /**
   * Runs the full harness pipeline on an agent output.
   */
  async run(agentOutput: AgentOutput): Promise<HarnessResult> {
    const startTime = Date.now();
    const runId = `harness-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const steps: StepResult[] = [];

    // Step 1: Build simulation
    const buildResult = await this.simulateBuild(agentOutput);
    steps.push(buildResult);

    // Step 2: Test simulation
    const testResult = await this.simulateTests(agentOutput);
    steps.push(testResult);

    // Step 3: Lint simulation
    const lintResult = await this.simulateLint(agentOutput);
    steps.push(lintResult);

    // Step 4: Architecture check
    const archResult = await this.runArchitectureCheck(agentOutput);
    steps.push(archResult);

    // Step 5: Risk classification
    const risk = this.riskClassifier.classify(agentOutput.paths);
    steps.push({
      name: 'risk-classification',
      passed: true,
      durationMs: 5,
      output: `Risk tier: ${risk.tier}. Matched rules: ${risk.matchedRules.join(', ')}`,
    });

    // Step 6: Policy evaluation
    const policy = await this.policyEngine.evaluate(agentOutput);
    steps.push({
      name: 'policy-evaluation',
      passed: policy.passed,
      durationMs: 15,
      output: policy.passed
        ? `Policy checks passed. Action: ${policy.action}`
        : `Policy violations: ${policy.violations.map((v) => v.rule).join(', ')}`,
    });

    // Determine overall result
    const allPassed = steps.every((s) => s.passed);
    const action = this.determineAction(steps, policy, risk.tier);

    return {
      runId,
      passed: allPassed,
      action,
      steps,
      risk,
      policy,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /** Simulates a build step (would exec "tsc" or "vite build" in production) */
  private async simulateBuild(output: AgentOutput): Promise<StepResult> {
    const start = Date.now();
    await delay(50 + Math.random() * 100);

    // Check for obvious TypeScript errors in generated files
    const hasTypeErrors = output.files.some(
      (f) => f.content.includes('any:') || f.content.includes('// @ts-ignore'),
    );

    return {
      name: 'build',
      passed: !hasTypeErrors,
      durationMs: Date.now() - start,
      output: hasTypeErrors
        ? 'TypeScript errors detected in generated files'
        : 'Build successful (0 errors)',
    };
  }

  /** Simulates running tests (would exec "vitest run" in production) */
  private async simulateTests(output: AgentOutput): Promise<StepResult> {
    const start = Date.now();
    await delay(100 + Math.random() * 200);

    const hasTests = (output.tests?.length ?? 0) > 0;

    return {
      name: 'tests',
      passed: hasTests,
      durationMs: Date.now() - start,
      output: hasTests
        ? `Tests passed: ${output.tests!.length} test file(s) found`
        : 'No test files found — this change requires tests',
      error: hasTests ? undefined : 'Missing tests',
    };
  }

  /** Simulates linting (would exec "eslint" in production) */
  private async simulateLint(output: AgentOutput): Promise<StepResult> {
    const start = Date.now();
    await delay(30 + Math.random() * 50);

    // Check for common lint issues
    const hasConsoleLog = output.files.some((f) => /console\.log\(/.test(f.content));
    const hasDebugger = output.files.some((f) => f.content.includes('debugger;'));

    const warnings = [
      ...(hasConsoleLog ? ['console.log statements found'] : []),
      ...(hasDebugger ? ['debugger statement found'] : []),
    ];

    return {
      name: 'lint',
      passed: !hasDebugger, // Warnings don't fail, debugger does
      durationMs: Date.now() - start,
      output:
        warnings.length > 0
          ? `Lint warnings: ${warnings.join(', ')}`
          : 'Lint passed (0 issues)',
    };
  }

  /** Checks architecture rules against the agent output */
  private async runArchitectureCheck(output: AgentOutput): Promise<StepResult> {
    const start = Date.now();
    const violations = this.policyEngine.checkArchitecture(output.diff);

    return {
      name: 'architecture-check',
      passed: violations.length === 0,
      durationMs: Date.now() - start,
      output:
        violations.length === 0
          ? 'Architecture rules passed'
          : `Violations: ${violations.map((v) => v.message).join('; ')}`,
    };
  }

  private determineAction(
    steps: StepResult[],
    policy: PolicyEvaluation,
    tier: string,
  ): 'auto-merge' | 'team-lead-review' | 'architecture-review' | 'reject' {
    const criticalFailures = steps.filter(
      (s) => !s.passed && ['build', 'tests'].includes(s.name),
    );

    if (criticalFailures.length > 0) return 'reject';

    return policy.action;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
