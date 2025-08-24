import { Router } from 'express';
import { streamText } from 'ai';
import { model } from '../../lib/ai';
import { SummarizeRequest } from '../types';

export const summarizeRouter = Router();

const getLengthInstruction = (length: string) => {
  switch (length) {
    case 'short':
      return 'Provide a very brief summary in 2-3 sentences.';
    case 'medium':
      return 'Provide a comprehensive summary in 1-2 paragraphs.';
    case 'detailed':
      return 'Provide a detailed summary covering all key points in 3-4 paragraphs.';
    default:
      return 'Provide a comprehensive summary in 1-2 paragraphs.';
  }
};

summarizeRouter.post('/summarize', async (req, res) => {
  try {
    const { text, length = 'medium' }: SummarizeRequest = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const lengthInstruction = getLengthInstruction(length);
    
    const result = await streamText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert content summarizer. ${lengthInstruction} Focus on capturing the main ideas, key points, and essential information while maintaining clarity and coherence.`
        },
        {
          role: 'user',
          content: `Please summarize the following text:\n\n${text}`
        }
      ],
    });

    // Set headers for streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });

    // Stream the response
    result.pipeTextStreamToResponse(res);
  } catch (error) {
    console.error('Error in summarize endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});