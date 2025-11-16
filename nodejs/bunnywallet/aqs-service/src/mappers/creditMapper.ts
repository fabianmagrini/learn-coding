import { AccountSummary } from '../types';

// Credit card backend response shape (nested structure)
interface CreditCardResponse {
  cardAccount: {
    id: string;
    cardholderName: string;
    productName: string;
    accountState: string;
    balanceInfo: {
      currentBalance: {
        amount: number;
        currency: string;
      };
      availableCredit: {
        amount: number;
        currency: string;
      };
    };
  };
}

export function mapCreditToCanonical(raw: CreditCardResponse): AccountSummary {
  const card = raw.cardAccount;
  return {
    accountId: card.id,
    accountType: 'creditcard',
    displayName: card.productName,
    owner: {
      name: card.cardholderName,
    },
    balances: [
      {
        currency: card.balanceInfo.currentBalance.currency,
        available: card.balanceInfo.availableCredit.amount,
        ledger: card.balanceInfo.currentBalance.amount,
      },
    ],
    status: mapCreditStatus(card.accountState),
    backendSource: 'credit-service-v1',
    metadata: { originalData: raw },
  };
}

function mapCreditStatus(status: string): 'active' | 'suspended' | 'closed' | 'unknown' {
  const normalized = status.toLowerCase();
  if (normalized === 'open' || normalized === 'active') return 'active';
  if (normalized === 'suspended' || normalized === 'blocked') return 'suspended';
  if (normalized === 'closed' || normalized === 'cancelled') return 'closed';
  return 'unknown';
}
