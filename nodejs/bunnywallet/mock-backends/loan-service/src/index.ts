import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3003', 10);

app.use(cors());
app.use(express.json());

let simulationMode: 'healthy' | 'slow' | 'error' | 'flaky' = 'healthy';
let simulationLatency = 100;

const mockLoans: Record<string, any> = {
  'LOAN-001': {
    loanId: 'LOAN-001',
    borrowerName: 'John Doe',
    loanType: 'Mortgage',
    status: 'current',
    principalAmount: 350000.00,
    outstandingBalance: 285000.00,
    currency: 'USD',
  },
  'LOAN-002': {
    loanId: 'LOAN-002',
    borrowerName: 'John Doe',
    loanType: 'Auto',
    status: 'current',
    principalAmount: 25000.00,
    outstandingBalance: 18500.00,
    currency: 'USD',
  },
};

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (req.path === '/health' || req.path === '/simulate') {
    return next();
  }
  if (!apiKey || apiKey !== process.env.LOAN_API_KEY) {
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

app.get('/loans/:loanId', async (req, res) => {
  const { loanId } = req.params;

  try {
    await simulateBehavior();

    const loan = mockLoans[loanId];
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json(loan);
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
  res.json({ status: 'ok', service: 'loan-service' });
});

app.listen(PORT, () => {
  console.log(`Loan service running on port ${PORT}`);
});
