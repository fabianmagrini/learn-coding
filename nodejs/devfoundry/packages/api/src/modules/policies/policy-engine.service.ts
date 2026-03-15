/**
 * PolicyEngineService — in-process OPA-style rule evaluation.
 *
 * Evaluates architecture rules and approval workflows against agent outputs.
 * Rules are loaded from the database and evaluated in JavaScript without
 * requiring an external OPA server.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity.js';
import { RiskClassifierService } from './risk-classifier.service.js';
import type { AgentOutput, RiskTier } from '@devfoundry/agents';

export interface PolicyViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
}

export interface PolicyEvaluation {
  passed: boolean;
  violations: PolicyViolation[];
  tier: RiskTier;
  action: 'auto-merge' | 'team-lead-review' | 'architecture-review';
}

/** Built-in architecture rules (OPA Rego-inspired) */
const ARCHITECTURE_RULES: Array<{
  name: string;
  description: string;
  check: (output: AgentOutput) => PolicyViolation[];
}> = [
  {
    name: 'no-service-to-ui-import',
    description: 'Service modules cannot import UI modules',
    check: (output) => {
      const violations: PolicyViolation[] = [];
      for (const file of output.files) {
        if (file.path.startsWith('services/') && file.content.includes('from "ui/')) {
          violations.push({
            rule: 'no-service-to-ui-import',
            message: `Service module cannot import UI module: ${file.path}`,
            severity: 'error',
            file: file.path,
          });
        }
      }
      return violations;
    },
  },
  {
    name: 'no-direct-db-access-from-api',
    description: 'API layer should not directly access database models',
    check: (output) => {
      const violations: PolicyViolation[] = [];
      for (const file of output.files) {
        if (
          file.path.startsWith('api/') &&
          (file.content.includes('typeorm') || file.content.includes('Repository'))
        ) {
          violations.push({
            rule: 'no-direct-db-access-from-api',
            message: `API controller should not directly use TypeORM repositories: ${file.path}`,
            severity: 'warning',
            file: file.path,
          });
        }
      }
      return violations;
    },
  },
  {
    name: 'tests-required-for-high-risk',
    description: 'High-risk code changes must include tests',
    check: (output) => {
      const violations: PolicyViolation[] = [];
      const hasHighRiskFiles = output.paths.some(
        (p) =>
          p.startsWith('auth/') || p.startsWith('payments/') || p.startsWith('db/schema/'),
      );
      const hasTests = output.tests && output.tests.length > 0;

      if (hasHighRiskFiles && !hasTests) {
        violations.push({
          rule: 'tests-required-for-high-risk',
          message: 'High-risk code changes (auth/payments/db) must include test files',
          severity: 'error',
        });
      }
      return violations;
    },
  },
];

@Injectable()
export class PolicyEngineService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    private readonly riskClassifier: RiskClassifierService,
  ) {}

  /**
   * Evaluates all active policies against an agent output.
   */
  async evaluate(output: AgentOutput): Promise<PolicyEvaluation> {
    const riskResult = this.riskClassifier.classify(output.paths);
    const violations: PolicyViolation[] = [];

    // Run built-in architecture rules
    for (const rule of ARCHITECTURE_RULES) {
      const ruleViolations = rule.check(output);
      violations.push(...ruleViolations);
    }

    // Load and evaluate database policies
    const dbPolicies = await this.policyRepository.find({ where: { isEnabled: true } });
    for (const policy of dbPolicies) {
      const policyViolations = this.evaluatePolicy(policy, output, riskResult.tier);
      violations.push(...policyViolations);
    }

    const hasErrors = violations.some((v) => v.severity === 'error');
    const passed = !hasErrors;

    const action = this.determineAction(riskResult.tier, passed);

    return {
      passed,
      violations,
      tier: riskResult.tier,
      action,
    };
  }

  /**
   * Evaluates a single database-stored policy against the output.
   */
  private evaluatePolicy(
    policy: Policy,
    output: AgentOutput,
    tier: RiskTier,
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Architecture policy: check forbidden import patterns
    if (policy.type === 'architecture') {
      const rules = policy.rules as {
        forbiddenImports?: Array<{ source: string; target: string }>;
      };
      if (rules.forbiddenImports) {
        for (const forbidden of rules.forbiddenImports) {
          for (const file of output.files) {
            if (file.path.startsWith(forbidden.source)) {
              const importRegex = new RegExp(`from ['"]${forbidden.target}`);
              if (importRegex.test(file.content)) {
                violations.push({
                  rule: `forbidden-import:${forbidden.source}->${forbidden.target}`,
                  message: `${forbidden.source} module cannot import from ${forbidden.target}`,
                  severity: 'error',
                  file: file.path,
                });
              }
            }
          }
        }
      }
    }

    // Approval workflow policy: flag missing approvals for high-risk
    if (policy.type === 'approval-workflow') {
      const workflows = policy.rules as {
        high?: { required: string[] };
        medium?: { required: string[] };
      };
      if (tier === 'high' && workflows.high) {
        // In a real system this would check approval status from GitHub/PR system
        // For now, just record that the workflow was evaluated
        violations.push({
          rule: `approval-required:${tier}`,
          message: `Change requires approval from: ${workflows.high.required.join(', ')}`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Determines the action to take based on risk tier and policy result.
   */
  private determineAction(
    tier: RiskTier,
    passed: boolean,
  ): 'auto-merge' | 'team-lead-review' | 'architecture-review' {
    if (!passed) return 'architecture-review';

    switch (tier) {
      case 'low':
        return 'auto-merge';
      case 'medium':
        return 'team-lead-review';
      case 'high':
        return 'architecture-review';
    }
  }

  /**
   * Evaluates architecture compliance for a PR diff string.
   */
  checkArchitecture(diff: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check for service → ui import in diff
    const serviceToUIRegex = /^\+.*from ['"]ui\//m;
    const inServiceContext = diff.includes('services/');

    if (inServiceContext && serviceToUIRegex.test(diff)) {
      violations.push({
        rule: 'no-service-to-ui-import',
        message: 'Diff introduces a service-to-UI import which violates architecture rules',
        severity: 'error',
      });
    }

    return violations;
  }
}
