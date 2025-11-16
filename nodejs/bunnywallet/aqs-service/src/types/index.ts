// Canonical Data Models

export type Currency = string; // "USD", "AUD", etc.

export interface Money {
  currency: Currency;
  available: number;
  ledger?: number;
}

export interface Owner {
  name?: string;
  customerId?: string;
}

export type AccountType = 'bank' | 'creditcard' | 'loan' | 'investment' | 'legacy' | 'crypto';

export type AccountStatus = 'active' | 'suspended' | 'closed' | 'unknown';

export interface AccountSummary {
  accountId: string;
  accountType: AccountType;
  owner?: Owner;
  displayName?: string;
  balances?: Money[];
  status?: AccountStatus;
  backendSource: string;
  lastUpdated?: string; // ISO 8601
  stale?: boolean;
  metadata?: Record<string, any>;
}

// Multi-account API types

export type AccountResultStatus = 'ok' | 'not_found' | 'unavailable' | 'partial';

export interface AccountResult {
  accountId: string;
  status: AccountResultStatus;
  data?: AccountSummary;
  error?: {
    code: string;
    message?: string;
  };
  latencyMs?: number;
  traceId?: string;
}

export type OverallStatus = 'ok' | 'partial' | 'error';

export interface MultiAccountResponse {
  requestId: string;
  overallStatus: OverallStatus;
  results: AccountResult[];
  traceId?: string;
}

// Adapter types

export interface AdapterResult {
  success: boolean;
  accountId: string;
  raw?: any;
  error?: {
    code: string;
    message: string;
  };
  latencyMs?: number;
}

export interface AccountAdapter {
  accountType: AccountType;
  backendName: string;
  getSummary(
    accountId: string,
    opts?: { fields?: string[]; authToken?: string }
  ): Promise<AdapterResult>;
  health?(): Promise<{ healthy: boolean; info?: any }>;
}

// Resilience configuration

export interface ResilienceConfig {
  timeoutMs: number;
  maxRetries: number;
  circuitBreaker: {
    failureThreshold: number; // percentage
    cooldownMs: number;
  };
  concurrencyLimit: number;
}

// Cache configuration

export interface CacheConfig {
  ttlSeconds: number;
  staleWindowSeconds: number;
}

// Request context

export interface RequestContext {
  requestId: string;
  userId?: string;
  scopes?: string[];
  forceRefresh?: boolean;
}
