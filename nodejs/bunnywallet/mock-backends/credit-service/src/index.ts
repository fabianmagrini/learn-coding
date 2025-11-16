import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3002', 10);

app.use(cors());
app.use(express.json());

let simulationMode: 'healthy' | 'slow' | 'error' | 'flaky' = 'healthy';
let simulationLatency = 100;

const mockCards: Record<string, any> = {
  'CC-001': {
    cardAccount: {
      id: 'CC-001',
      cardholderName: 'John Doe',
      productName: 'Platinum Rewards Card',
      accountState: 'active',
      balanceInfo: {
        currentBalance: {
          amount: 1250.75,
          currency: 'USD',
        },
        availableCredit: {
          amount: 8749.25,
          currency: 'USD',
        },
      },
    },
  },
  'CC-002': {
    cardAccount: {
      id: 'CC-002',
      cardholderName: 'John Doe',
      productName: 'Business Cash Back Card',
      accountState: 'active',
      balanceInfo: {
        currentBalance: {
          amount: 3500.00,
          currency: 'USD',
        },
        availableCredit: {
          amount: 16500.00,
          currency: 'USD',
        },
      },
    },
  },
};

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (req.path === '/health' || req.path === '/simulate') {
    return next();
  }
  if (!apiKey || apiKey !== process.env.CREDIT_API_KEY) {
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

app.get('/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;

  try {
    await simulateBehavior();

    const card = mockCards[cardId];
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(card);
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
  res.json({ status: 'ok', service: 'credit-service' });
});

app.listen(PORT, () => {
  console.log(`Credit service running on port ${PORT}`);
});
