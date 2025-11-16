import type { AccountSummary } from '../types/index.js';

interface CryptoAsset {
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
}

interface CryptoWalletResponse {
  walletId: string;
  walletAddress: string;
  assets: CryptoAsset[];
  owner?: {
    name?: string;
    customerId?: string;
  };
  network: string;
  createdAt: string;
  status: string;
}

export function mapCryptoToCanonical(raw: CryptoWalletResponse): AccountSummary {
  // Calculate total portfolio value
  const totalValueUsd = raw.assets.reduce((sum, asset) => sum + asset.valueUsd, 0);

  // Map crypto assets to balances (showing total USD value)
  const balances = [
    {
      currency: 'USD',
      available: totalValueUsd,
      ledger: totalValueUsd
    }
  ];

  return {
    accountId: raw.walletId,
    accountType: 'crypto',
    owner: raw.owner,
    displayName: `Crypto Wallet ${raw.walletAddress.substring(0, 10)}...`,
    balances,
    status: raw.status === 'active' ? 'active' : 'unknown',
    backendSource: 'crypto-service-v1',
    lastUpdated: new Date().toISOString(),
    metadata: {
      walletAddress: raw.walletAddress,
      network: raw.network,
      assets: raw.assets,
      createdAt: raw.createdAt
    }
  };
}
