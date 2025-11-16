import { AccountSummary } from '../types';

// Bank backend response shape
interface BankAccountResponse {
  account_id: string;
  account_name: string;
  account_status: string;
  customer: {
    id: string;
    name: string;
  };
  balances: {
    currency: string;
    available_balance: number;
    ledger_balance: number;
  }[];
}

export function mapBankToCanonical(raw: BankAccountResponse): AccountSummary {
  return {
    accountId: raw.account_id,
    accountType: 'bank',
    displayName: raw.account_name,
    owner: {
      customerId: raw.customer.id,
      name: raw.customer.name,
    },
    balances: raw.balances.map((b) => ({
      currency: b.currency,
      available: b.available_balance,
      ledger: b.ledger_balance,
    })),
    status: mapBankStatus(raw.account_status),
    backendSource: 'bank-service-v1',
    metadata: { originalData: raw },
  };
}

function mapBankStatus(status: string): 'active' | 'suspended' | 'closed' | 'unknown' {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'suspended' || normalized === 'frozen') return 'suspended';
  if (normalized === 'closed') return 'closed';
  return 'unknown';
}
