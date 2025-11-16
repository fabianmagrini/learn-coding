import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Simulation state
let simulationMode: 'healthy' | 'slow' | 'error' | 'flaky' = 'healthy';
let latencyMs = 80;

// Mock crypto wallet data
const cryptoWallets: Record<string, any> = {
  'crypto-001': {
    walletId: 'crypto-001',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    assets: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: 2.45678,
        priceUsd: 43250.00,
        valueUsd: 106342.85
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 15.789,
        priceUsd: 2280.50,
        valueUsd: 36011.77
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        balance: 5000.00,
        priceUsd: 1.00,
        valueUsd: 5000.00
      }
    ],
    owner: {
      name: 'Crypto Enthusiast',
      customerId: 'CUST-CRYPTO-001'
    },
    network: 'ethereum-mainnet',
    createdAt: '2021-03-15T10:30:00Z',
    status: 'active'
  },
  'crypto-002': {
    walletId: 'crypto-002',
    walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    assets: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: 0.05,
        priceUsd: 43250.00,
        valueUsd: 2162.50
      }
    ],
    owner: {
      name: 'Bitcoin Holder',
      customerId: 'CUST-CRYPTO-002'
    },
    network: 'bitcoin-mainnet',
    createdAt: '2020-11-20T14:15:00Z',
    status: 'active'
  }
};

// Helper to simulate behavior
const simulateBehavior = async () => {
  if (simulationMode === 'error') {
    throw new Error('Simulated backend error');
  }

  if (simulationMode === 'flaky' && Math.random() < 0.5) {
    throw new Error('Simulated flaky error');
  }

  const delay = simulationMode === 'slow' ? latencyMs : Math.random() * 100 + 20;
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Crypto wallet endpoint
app.get('/wallets/:walletId', async (req, res) => {
  try {
    await simulateBehavior();

    const { walletId } = req.params;
    const wallet = cryptoWallets[walletId];

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Simulation control
app.post('/simulate', (req, res) => {
  const { mode, latencyMs: customLatency } = req.body;

  if (mode && ['healthy', 'slow', 'error', 'flaky'].includes(mode)) {
    simulationMode = mode;
  }

  if (customLatency && typeof customLatency === 'number') {
    latencyMs = customLatency;
  }

  res.json({
    simulationMode,
    latencyMs,
    message: `Crypto service set to ${simulationMode} mode`,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'crypto-service',
    simulationMode,
    latencyMs,
  });
});

app.listen(PORT, () => {
  console.log(`Crypto service running on port ${PORT}`);
  console.log(`Simulation mode: ${simulationMode}`);
});
