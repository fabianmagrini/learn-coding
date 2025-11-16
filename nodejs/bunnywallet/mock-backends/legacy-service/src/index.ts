import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

app.use(cors());
app.use(express.json());

// Legacy service defaults to slow/flaky mode
let simulationMode: 'healthy' | 'slow' | 'error' | 'flaky' = 'slow';
let simulationLatency = 2000;

const mockAccounts: Record<string, any> = {
  'LEG-001': {
    accountId: 'LEG-001',
    accountType: 'legacy',
    name: 'Legacy Account 1',
    status: 'a', // active
    balance: 12500.50,
    currency: 'USD',
  },
  'LEG-002': {
    accountId: 'LEG-002',
    accountType: 'legacy',
    name: 'Legacy Account 2',
    status: 'a',
    balance: 8750.00,
    currency: 'USD',
  },
};

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (req.path === '/health' || req.path === '/simulate') {
    return next();
  }
  if (!apiKey || apiKey !== process.env.LEGACY_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});

async function simulateBehavior(): Promise<void> {
  if (simulationMode === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, simulationLatency));
  } else if (simulationMode === 'error') {
    throw new Error('Simulated legacy system error');
  } else if (simulationMode === 'flaky') {
    if (Math.random() < 0.5) {
      throw new Error('Simulated legacy flaky error');
    }
    await new Promise((resolve) => setTimeout(resolve, Math.random() * simulationLatency));
  } else {
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
  }
}

app.get('/account/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    await simulateBehavior();

    const account = mockAccounts[accountId];
    if (!account) {
      return res.status(404).send('accountId,accountType,name,status,balance,currency\n');
    }

    // Return CSV format
    const csv = `accountId,accountType,name,status,balance,currency
${account.accountId},${account.accountType},${account.name},${account.status},${account.balance},${account.currency}`;

    res.header('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.post('/simulate', (req, res) => {
  const { mode, latencyMs } = req.body;
  if (mode) simulationMode = mode;
  if (latencyMs !== undefined) simulationLatency = latencyMs;
  res.json({ mode: simulationMode, latencyMs: simulationLatency });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'legacy-service' });
});

app.listen(PORT, () => {
  console.log(`Legacy service running on port ${PORT} (slow/flaky by default)`);
});
