export type Currency = string;

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
  lastUpdated?: string;
  stale?: boolean;
  metadata?: Record<string, any>;
  traceId?: string;
}

export interface AccountResult {
  accountId: string;
  status: 'ok' | 'not_found' | 'unavailable' | 'partial';
  data?: AccountSummary;
  error?: { code: string; message?: string };
  latencyMs?: number;
}

export interface MultiAccountResponse {
  requestId: string;
  overallStatus: 'ok' | 'partial' | 'error';
  results: AccountResult[];
  traceId?: string;
}

export interface SimulateBackendRequest {
  mode: 'healthy' | 'slow' | 'error' | 'flaky';
  latencyMs?: number;
}
