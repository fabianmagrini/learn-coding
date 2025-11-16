import { AccountSummary } from '../types';

// Loan backend response shape
interface LoanAccountResponse {
  loanId: string;
  borrowerName: string;
  loanType: string;
  status: string;
  principalAmount: number;
  outstandingBalance: number;
  currency: string;
}

export function mapLoanToCanonical(raw: LoanAccountResponse): AccountSummary {
  return {
    accountId: raw.loanId,
    accountType: 'loan',
    displayName: `${raw.loanType} Loan`,
    owner: {
      name: raw.borrowerName,
    },
    balances: [
      {
        currency: raw.currency,
        available: 0, // Loans don't have available balance
        ledger: -raw.outstandingBalance, // Negative for debt
      },
    ],
    status: mapLoanStatus(raw.status),
    backendSource: 'loan-service-v1',
    metadata: {
      principalAmount: raw.principalAmount,
      outstandingBalance: raw.outstandingBalance,
      originalData: raw,
    },
  };
}

function mapLoanStatus(status: string): 'active' | 'suspended' | 'closed' | 'unknown' {
  const normalized = status.toLowerCase();
  if (normalized === 'current' || normalized === 'active') return 'active';
  if (normalized === 'delinquent' || normalized === 'suspended') return 'suspended';
  if (normalized === 'paid_off' || normalized === 'closed') return 'closed';
  return 'unknown';
}
