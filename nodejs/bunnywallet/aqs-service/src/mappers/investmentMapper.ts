import { AccountSummary } from '../types';

// Investment backend response shape
interface InvestmentAccountResponse {
  portfolioId: string;
  accountHolder: string;
  portfolioName: string;
  totalValue: {
    value: number;
    currency: string;
  };
  cashBalance: {
    value: number;
    currency: string;
  };
  accountStatus: string;
}

export function mapInvestmentToCanonical(raw: InvestmentAccountResponse): AccountSummary {
  return {
    accountId: raw.portfolioId,
    accountType: 'investment',
    displayName: raw.portfolioName,
    owner: {
      name: raw.accountHolder,
    },
    balances: [
      {
        currency: raw.totalValue.currency,
        available: raw.cashBalance.value,
        ledger: raw.totalValue.value,
      },
    ],
    status: mapInvestmentStatus(raw.accountStatus),
    backendSource: 'investment-service-v1',
    metadata: { originalData: raw },
  };
}

function mapInvestmentStatus(status: string): 'active' | 'suspended' | 'closed' | 'unknown' {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'suspended' || normalized === 'restricted') return 'suspended';
  if (normalized === 'closed') return 'closed';
  return 'unknown';
}
