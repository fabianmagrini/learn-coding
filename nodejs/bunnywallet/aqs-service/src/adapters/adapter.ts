import { AccountAdapter, AdapterResult, AccountType } from '../types';

export { AccountAdapter, AdapterResult };

// Adapter registry
export class AdapterRegistry {
  private adapters = new Map<AccountType, AccountAdapter>();

  register(adapter: AccountAdapter): void {
    this.adapters.set(adapter.accountType, adapter);
  }

  getAdapter(accountType: AccountType): AccountAdapter | undefined {
    return this.adapters.get(accountType);
  }

  getAllAdapters(): AccountAdapter[] {
    return Array.from(this.adapters.values());
  }

  hasAdapter(accountType: AccountType): boolean {
    return this.adapters.has(accountType);
  }
}

// Singleton registry
let registryInstance: AdapterRegistry | null = null;

export function getRegistry(): AdapterRegistry {
  if (!registryInstance) {
    registryInstance = new AdapterRegistry();
  }
  return registryInstance;
}

// Helper function to determine account type from accountId
// In a real system, this might query a database or use a more sophisticated routing mechanism
export function routeToAccountType(accountId: string): AccountType {
  // Simple prefix-based routing for demo
  if (accountId.startsWith('bank-')) return 'bank';
  if (accountId.startsWith('credit-')) return 'creditcard';
  if (accountId.startsWith('loan-')) return 'loan';
  if (accountId.startsWith('invest-')) return 'investment';
  if (accountId.startsWith('legacy-')) return 'legacy';
  if (accountId.startsWith('crypto-')) return 'crypto';

  // Legacy prefixes (keeping for backward compatibility)
  if (accountId.startsWith('BNK-')) return 'bank';
  if (accountId.startsWith('CC-')) return 'creditcard';
  if (accountId.startsWith('LOAN-')) return 'loan';
  if (accountId.startsWith('INV-')) return 'investment';
  if (accountId.startsWith('LEG-')) return 'legacy';
  if (accountId.startsWith('CRY-')) return 'crypto';

  // Default to bank for unknown prefixes
  return 'bank';
}
