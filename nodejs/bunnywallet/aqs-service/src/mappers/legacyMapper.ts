import { AccountSummary } from '../types';

// Legacy backend returns CSV-like text that we parse
export function mapLegacyToCanonical(csvData: string): AccountSummary {
  // Parse CSV: accountId,accountType,name,status,balance,currency
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Invalid legacy CSV format');
  }

  const dataLine = lines[1]; // Skip header
  const fields = dataLine.split(',');

  return {
    accountId: fields[0],
    accountType: 'legacy',
    displayName: `Legacy Account - ${fields[2]}`,
    owner: {
      name: fields[2],
    },
    balances: [
      {
        currency: fields[5] || 'USD',
        available: parseFloat(fields[4]),
        ledger: parseFloat(fields[4]),
      },
    ],
    status: mapLegacyStatus(fields[3]),
    backendSource: 'legacy-service-v1',
    metadata: { originalData: csvData },
  };
}

function mapLegacyStatus(status: string): 'active' | 'suspended' | 'closed' | 'unknown' {
  const normalized = status.toLowerCase();
  if (normalized === 'a' || normalized === 'active') return 'active';
  if (normalized === 's' || normalized === 'suspended') return 'suspended';
  if (normalized === 'c' || normalized === 'closed') return 'closed';
  return 'unknown';
}
