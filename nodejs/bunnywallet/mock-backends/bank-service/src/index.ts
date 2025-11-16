import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// Simulation state
let simulationMode: 'healthy' | 'slow' | 'error' | 'flaky' = 'healthy';
let simulationLatency = 100;

// Mock account data
const mockAccounts: Record<string, any> = {
  'BNK-001': {
    account_id: 'BNK-001',
    account_name: 'Primary Checking Account',
    account_status: 'active',
    customer: {
      id: 'CUST-12345',
      name: 'John Doe',
    },
    balances: [
      {
        currency: 'USD',
        available_balance: 5420.50,
        ledger_balance: 5620.50,
      },
    ],
  },
  'BNK-002': {
    account_id: 'BNK-002',
    account_name: 'Savings Account',
    account_status: 'active',
    customer: {
      id: 'CUST-12345',
      name: 'John Doe',
    },
    balances: [
      {
        currency: 'USD',
        available_balance: 25000.00,
        ledger_balance: 25000.00,
      },
    ],
  },
};

// Middleware to check API key
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (req.path === '/health' || req.path === '/simulate') {
    return next();
  }
  if (!apiKey || apiKey !== process.env.BANK_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});

// Apply simulation behavior
async function simulateBehavior(): Promise<void> {
  if (simulationMode === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, simulationLatency));
  } else if (simulationMode === 'error') {
    throw new Error('Simulated backend error');
  } else if (simulationMode === 'flaky') {
    if (Math.random() < 0.5) {
      throw new Error('Simulated flaky error');
    }
    await new Promise((resolve) => setTimeout(resolve, Math.random() * simulationLatency));
  } else {
    // healthy - small random delay
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
  }
}

// GET /accounts/:accountId
app.get('/accounts/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    await simulateBehavior();

    const account = mockAccounts[accountId];
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /simulate
app.post('/simulate', (req, res) => {
  const { mode, latencyMs } = req.body;

  if (mode) {
    simulationMode = mode;
  }
  if (latencyMs !== undefined) {
    simulationLatency = latencyMs;
  }

  res.json({
    mode: simulationMode,
    latencyMs: simulationLatency,
    message: 'Simulation mode updated',
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bank-service' });
});

app.listen(PORT, () => {
  console.log(`Bank service running on port ${PORT}`);
});
