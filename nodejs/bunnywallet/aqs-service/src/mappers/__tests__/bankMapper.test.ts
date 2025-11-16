import { mapBankToCanonical } from '../bankMapper';

describe('bankMapper', () => {
  it('should map bank response to canonical format', () => {
    const bankResponse = {
      account_id: 'BNK-001',
      account_name: 'Test Checking',
      account_status: 'active',
      customer: {
        id: 'CUST-123',
        name: 'Test User',
      },
      balances: [
        {
          currency: 'USD',
          available_balance: 1000.0,
          ledger_balance: 1100.0,
        },
      ],
    };

    const result = mapBankToCanonical(bankResponse);

    expect(result.accountId).toBe('BNK-001');
    expect(result.accountType).toBe('bank');
    expect(result.displayName).toBe('Test Checking');
    expect(result.status).toBe('active');
    expect(result.owner?.customerId).toBe('CUST-123');
    expect(result.owner?.name).toBe('Test User');
    expect(result.balances).toHaveLength(1);
    expect(result.balances?.[0].available).toBe(1000.0);
    expect(result.balances?.[0].ledger).toBe(1100.0);
    expect(result.backendSource).toBe('bank-service-v1');
  });

  it('should handle different status values', () => {
    const bankResponse = {
      account_id: 'BNK-002',
      account_name: 'Suspended Account',
      account_status: 'frozen',
      customer: { id: 'CUST-456', name: 'Another User' },
      balances: [],
    };

    const result = mapBankToCanonical(bankResponse);
    expect(result.status).toBe('suspended');
  });

  it('should handle unknown status', () => {
    const bankResponse = {
      account_id: 'BNK-003',
      account_name: 'Unknown Status',
      account_status: 'weird-status',
      customer: { id: 'CUST-789', name: 'User' },
      balances: [],
    };

    const result = mapBankToCanonical(bankResponse);
    expect(result.status).toBe('unknown');
  });
});
