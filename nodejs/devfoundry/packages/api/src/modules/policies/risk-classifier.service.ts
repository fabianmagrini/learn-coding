/**
 * RiskClassifierService — classifies file paths into risk tiers.
 *
 * Uses glob-style pattern matching against configurable rules.
 * Default rules match the DevFoundry reference configuration.
 */

import { Injectable } from '@nestjs/common';
import type { RiskTier } from '@devfoundry/agents';

export interface RiskTierConfig {
  high: string[];
  medium: string[];
  low: string[];
}

export interface RiskClassification {
  tier: RiskTier;
  matchedPaths: string[];
  matchedRules: string[];
}

/** Default risk tier rules (matches the spec from plan.md) */
export const DEFAULT_RISK_CONFIG: RiskTierConfig = {
  high: ['db/schema/**', 'auth/**', 'payments/**'],
  medium: ['services/**', 'api/**'],
  low: ['ui/**', 'docs/**'],
};

@Injectable()
export class RiskClassifierService {
  /**
   * Classifies a set of file paths against the given risk config.
   * Returns the highest risk tier found.
   */
  classify(paths: string[], config: RiskTierConfig = DEFAULT_RISK_CONFIG): RiskClassification {
    const matchedPaths: string[] = [];
    const matchedRules: string[] = [];

    // Check high risk first
    for (const path of paths) {
      for (const pattern of config.high) {
        if (this.matchesPattern(path, pattern)) {
          matchedPaths.push(path);
          matchedRules.push(pattern);
          return { tier: 'high', matchedPaths, matchedRules };
        }
      }
    }

    // Check medium risk
    for (const path of paths) {
      for (const pattern of config.medium) {
        if (this.matchesPattern(path, pattern)) {
          matchedPaths.push(path);
          matchedRules.push(pattern);
          return { tier: 'medium', matchedPaths, matchedRules };
        }
      }
    }

    // Default to low
    return { tier: 'low', matchedPaths: paths, matchedRules: config.low };
  }

  /**
   * Matches a file path against a glob-style pattern.
   * Supports * (single segment) and ** (multi-segment) wildcards.
   */
  matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*\*/g, '__DOUBLE_STAR__') // Temporarily replace **
      .replace(/\*/g, '[^/]*') // * matches within a segment
      .replace(/__DOUBLE_STAR__\//g, '(?:[^/]+/)*') // **/ matches 0+ path segments
      .replace(/__DOUBLE_STAR__/g, '.*'); // ** at end matches everything

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }
}
