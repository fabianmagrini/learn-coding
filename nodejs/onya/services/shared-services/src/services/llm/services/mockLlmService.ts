import { v4 as uuidv4 } from 'uuid';
import { LLMRequest, LLMResponse } from '../../../shared/types/common.types';
import { logger } from '../../../shared/utils/logger';

export class MockLlmService {
  private escalationKeywords = [
    'speak to manager',
    'cancel my account',
    'this is ridiculous',
    'terrible service',
    'human agent',
    'supervisor',
    'complaint',
    'refund',
    'angry',
    'frustrated'
  ];

  private responses = [
    "I understand you're looking for help. Let me assist you with that.",
    "Thank you for contacting us. I'm here to help resolve your issue.",
    "I can help you with that. Let me gather some information first.",
    "I see what you're asking about. Here's what I can tell you...",
    "That's a great question. Let me provide you with the information you need.",
    "I'm happy to help you with this request.",
    "Let me look into that for you right away.",
    "I understand your concern. Here's how we can address this..."
  ];

  async processMessage(request: LLMRequest): Promise<LLMResponse> {
    logger.info('Processing message with mock LLM', { 
      sessionId: request.sessionId,
      customerId: request.customerId 
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const messageContent = request.message.toLowerCase();
    
    // Check for escalation triggers
    const escalationRequired = this.shouldEscalate(messageContent);
    const escalationReason = escalationRequired ? this.getEscalationReason(messageContent) : undefined;

    // Generate response
    const response = this.generateResponse(messageContent, escalationRequired);

    return {
      content: response,
      escalationRequired,
      escalationReason,
      confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
      metadata: {
        processingTime: Date.now(),
        model: 'mock-llm-v1',
        tokens: Math.floor(Math.random() * 100) + 50
      }
    };
  }

  private shouldEscalate(message: string): boolean {
    // Check for explicit escalation keywords
    const hasEscalationKeyword = this.escalationKeywords.some(keyword => 
      message.includes(keyword)
    );

    // Simulate sentiment analysis - escalate if message seems negative
    const negativeWords = ['bad', 'awful', 'hate', 'worst', 'terrible', 'horrible'];
    const negativeScore = negativeWords.filter(word => message.includes(word)).length;

    // Escalate if multiple negative words or explicit keywords
    return hasEscalationKeyword || negativeScore >= 2;
  }

  private getEscalationReason(message: string): string {
    if (this.escalationKeywords.some(keyword => message.includes(keyword))) {
      return 'Customer requested human agent';
    }
    
    const negativeWords = ['bad', 'awful', 'hate', 'worst', 'terrible', 'horrible'];
    if (negativeWords.some(word => message.includes(word))) {
      return 'Negative sentiment detected';
    }

    return 'Complex issue requiring human assistance';
  }

  private generateResponse(message: string, escalationRequired: boolean): string {
    if (escalationRequired) {
      return "I understand this is important to you. Let me connect you with one of our human agents who can provide more personalized assistance. Please hold on while I transfer you to the next available agent.";
    }

    // Simple keyword-based responses
    if (message.includes('billing') || message.includes('payment')) {
      return "I can help you with billing questions. Your account information shows your current billing cycle and payment methods. Would you like me to explain any specific charges?";
    }

    if (message.includes('password') || message.includes('login')) {
      return "I can help you with login issues. For security reasons, I can guide you through the password reset process. Would you like me to send a reset link to your registered email?";
    }

    if (message.includes('order') || message.includes('shipping')) {
      return "I can help you track your order. Please provide your order number and I'll give you the latest shipping information.";
    }

    if (message.includes('return') || message.includes('exchange')) {
      return "I can help you with returns and exchanges. Our return policy allows returns within 30 days of purchase. Would you like me to start the return process for you?";
    }

    // Default response
    return this.responses[Math.floor(Math.random() * this.responses.length)];
  }
}