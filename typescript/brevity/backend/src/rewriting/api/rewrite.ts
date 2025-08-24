import { Router } from 'express';
import { streamText } from 'ai';
import { model } from '../../lib/ai';
import { RewriteRequest } from '../types';

export const rewriteRouter = Router();

const getToneInstruction = (tone: string) => {
  switch (tone) {
    case 'professional':
      return 'Rewrite the text in a professional, formal tone suitable for business communications. Use clear, concise language and maintain a respectful, authoritative voice.';
    case 'casual':
      return 'Rewrite the text in a casual, friendly tone suitable for informal communications. Use conversational language and a relaxed, approachable voice.';
    case 'confident':
      return 'Rewrite the text in a confident, assertive tone. Use strong, decisive language that conveys authority and certainty.';
    default:
      return 'Rewrite the text in a professional, formal tone suitable for business communications.';
  }
};

rewriteRouter.post('/rewrite', async (req, res) => {
  try {
    const { text, tone = 'professional' }: RewriteRequest = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const toneInstruction = getToneInstruction(tone);
    
    const result = await streamText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert content rewriter. ${toneInstruction} Preserve the original meaning and key information while improving clarity, flow, and readability. Maintain the approximate length of the original text.`
        },
        {
          role: 'user',
          content: `Please rewrite the following text:\n\n${text}`
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
    console.error('Error in rewrite endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});