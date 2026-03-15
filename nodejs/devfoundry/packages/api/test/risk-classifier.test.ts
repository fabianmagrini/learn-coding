/**
 * Unit tests for the RiskClassifierService.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RiskClassifierService, DEFAULT_RISK_CONFIG } from '../src/modules/policies/risk-classifier.service.js';

describe('RiskClassifierService', () => {
  let service: RiskClassifierService;

  beforeEach(() => {
    service = new RiskClassifierService();
  });

  describe('classify()', () => {
    it('classifies auth paths as high risk', () => {
      const result = service.classify(['auth/login.ts', 'auth/jwt.ts']);
      expect(result.tier).toBe('high');
    });

    it('classifies payments paths as high risk', () => {
      const result = service.classify(['payments/charge.ts']);
      expect(result.tier).toBe('high');
    });

    it('classifies db/schema paths as high risk', () => {
      const result = service.classify(['db/schema/users.sql']);
      expect(result.tier).toBe('high');
    });

    it('classifies services paths as medium risk', () => {
      const result = service.classify(['services/user.service.ts']);
      expect(result.tier).toBe('medium');
    });

    it('classifies api paths as medium risk', () => {
      const result = service.classify(['api/controllers/user.controller.ts']);
      expect(result.tier).toBe('medium');
    });

    it('classifies ui paths as low risk', () => {
      const result = service.classify(['ui/components/Button.tsx']);
      expect(result.tier).toBe('low');
    });

    it('classifies docs paths as low risk', () => {
      const result = service.classify(['docs/api-reference.md']);
      expect(result.tier).toBe('low');
    });

    it('defaults to low risk for unknown paths', () => {
      const result = service.classify(['random/unknown/path.ts']);
      expect(result.tier).toBe('low');
    });

    it('returns high risk when mix contains a high-risk path', () => {
      const result = service.classify(['ui/button.tsx', 'auth/login.ts', 'docs/readme.md']);
      expect(result.tier).toBe('high');
    });

    it('returns matched rules', () => {
      const result = service.classify(['auth/login.ts']);
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });
  });

  describe('matchesPattern()', () => {
    it('matches exact path segment with *', () => {
      expect(service.matchesPattern('auth/login.ts', 'auth/**')).toBe(true);
    });

    it('matches nested paths with **', () => {
      expect(service.matchesPattern('db/schema/tables/users.sql', 'db/schema/**')).toBe(true);
    });

    it('does not match wrong prefix', () => {
      expect(service.matchesPattern('ui/button.tsx', 'auth/**')).toBe(false);
    });

    it('matches services prefix', () => {
      expect(service.matchesPattern('services/user.service.ts', 'services/**')).toBe(true);
    });

    it('matches api prefix', () => {
      expect(service.matchesPattern('api/v1/users.ts', 'api/**')).toBe(true);
    });
  });
});
