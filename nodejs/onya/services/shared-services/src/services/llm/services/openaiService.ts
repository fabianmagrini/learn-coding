import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../../../shared/types/common.types';
import { logger } from '../../../shared/utils/logger';
import { config } from '../../../shared/utils/config';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for OpenAI service');
    }

    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  async processMessage(request: LLMRequest): Promise<LLMResponse> {
    logger.info('Processing message with OpenAI', { 
      sessionId: request.sessionId,
      customerId: request.customerId 
    });

    try {
      const systemPrompt = this.getSystemPrompt();
      const userMessage = this.formatUserMessage(request);

      const completion = await this.client.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.getContextMessages(request.context || []),
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || 'I apologize, but I was unable to process your request. Please try again.';
      
      // Analyze response for escalation needs
      const escalationAnalysis = this.analyzeForEscalation(request.message, content);

      return {
        content,
        escalationRequired: escalationAnalysis.required,
        escalationReason: escalationAnalysis.reason,
        confidence: this.calculateConfidence(completion),
        metadata: {
          model: completion.model,
          tokens: completion.usage?.total_tokens,
          finishReason: completion.choices[0]?.finish_reason,
        }
      };

    } catch (error) {
      logger.error('OpenAI API error', { error, sessionId: request.sessionId });
      
      // Fallback response
      return {
        content: 'I apologize, but I\'m experiencing technical difficulties. Please hold on while I connect you with a human agent.',
        escalationRequired: true,
        escalationReason: 'Technical error with AI system',
        confidence: 0,
        metadata: { error: 'openai_api_error' }
      };
    }
  }

  private getSystemPrompt(): string {
    return `You are a helpful customer service assistant for Onya, a company that provides excellent customer support. 

Your role is to:
- Provide helpful, accurate, and friendly responses
- Resolve customer issues when possible
- Know when to escalate to a human agent

Guidelines:
- Be empathetic and understanding
- Keep responses concise but informative
- If you cannot resolve an issue, suggest escalation
- Always maintain a professional tone
- If a customer seems frustrated or angry, be extra empathetic

If you encounter any of these situations, recommend escalation to a human agent:
- Complex technical issues beyond basic troubleshooting
- Billing disputes or refund requests
- Account security concerns
- Customer explicitly requests human agent
- Customer expresses significant frustration or anger
- Issues requiring manager approval`;
  }

  private formatUserMessage(request: LLMRequest): string {
    let message = request.message;
    
    // Add context if available
    if (request.metadata?.customerTier) {
      message += `\n[Customer tier: ${request.metadata.customerTier}]`;
    }

    return message;
  }

  private getContextMessages(context: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return context
      .slice(-10) // Keep only last 10 messages for context
      .map(msg => ({
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
  }

  private analyzeForEscalation(userMessage: string, aiResponse: string): { required: boolean; reason?: string } {
    const escalationKeywords = [
      'speak to manager',
      'human agent',
      'supervisor',
      'escalate',
      'cancel my account',
      'terrible service',
      'refund',
      'billing dispute'
    ];

    const message = userMessage.toLowerCase();
    const response = aiResponse.toLowerCase();

    // Check if user explicitly requested escalation
    const userRequestsEscalation = escalationKeywords.some(keyword => 
      message.includes(keyword)
    );

    // Check if AI response suggests escalation
    const aiSuggestsEscalation = response.includes('human agent') || 
                                response.includes('connect you') ||
                                response.includes('transfer');

    if (userRequestsEscalation) {
      return { required: true, reason: 'Customer requested human agent' };
    }

    if (aiSuggestsEscalation) {
      return { required: true, reason: 'AI determined human assistance needed' };
    }

    return { required: false };
  }

  private calculateConfidence(completion: OpenAI.Chat.Completions.ChatCompletion): number {
    // Simple confidence calculation based on finish reason and response length
    const choice = completion.choices[0];
    
    if (choice?.finish_reason === 'stop') {
      return 0.8 + Math.random() * 0.2; // 0.8 - 1.0
    } else if (choice?.finish_reason === 'length') {
      return 0.6 + Math.random() * 0.2; // 0.6 - 0.8
    } else {
      return 0.3 + Math.random() * 0.3; // 0.3 - 0.6
    }
  }
}