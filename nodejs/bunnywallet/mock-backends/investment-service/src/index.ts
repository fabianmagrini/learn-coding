import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3004', 10);

app.use(cors());
app.use(express.json());

let simulationMode: 'healthy' | 'slow' | 'error' | 'flaky' = 'healthy';
let simulationLatency = 100;

const mockPortfolios: Record<string, any> = {
  'INV-001': {
    portfolioId: 'INV-001',
    accountHolder: 'John Doe',
    portfolioName: 'Growth Portfolio',
    totalValue: {
      value: 125000.00,
      currency: 'USD',
    },
    cashBalance: {
      value: 5000.00,
      currency: 'USD',
    },
    accountStatus: 'active',
  },
  'INV-002': {
    portfolioId: 'INV-002',
    accountHolder: 'John Doe',
    portfolioName: 'Retirement 401k',
    totalValue: {
      value: 485000.00,
      currency: 'USD',
    },
    cashBalance: {
      value: 12000.00,
      currency: 'USD',
    },
    accountStatus: 'active',
  },
};

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (req.path === '/health' || req.path === '/simulate') {
    return next();
  }
  if (!apiKey || apiKey !== process.env.INVESTMENT_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});

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
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
  }
}

app.get('/portfolios/:portfolioId', async (req, res) => {
  const { portfolioId } = req.params;

  try {
    await simulateBehavior();

    const portfolio = mockPortfolios[portfolioId];
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/simulate', (req, res) => {
  const { mode, latencyMs } = req.body;
  if (mode) simulationMode = mode;
  if (latencyMs !== undefined) simulationLatency = latencyMs;
  res.json({ mode: simulationMode, latencyMs: simulationLatency });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'investment-service' });
});

app.listen(PORT, () => {
  console.log(`Investment service running on port ${PORT}`);
});
