import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { summarizeRouter } from './summarization/api/summarize';
import { rewriteRouter } from './rewriting/api/rewrite';
import { uploadRouter } from './api/upload-pdf';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', summarizeRouter);
app.use('/api', rewriteRouter);
app.use('/api', uploadRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Brevity API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});