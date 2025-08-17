import { ChatSession, Message, MessageType, SessionStatus, Priority, EscalationStatus } from '@prisma/client';
import { ChatRepository } from '../../database/repositories/chatRepository';
import { UserRepository } from '../../database/repositories/userRepository';
import { redis } from '../../database/redis';
import { logger } from '../../shared/utils/logger';

export interface ChatContext {
  sessionId: string;
  customerId: string;
  customerData: {
    name?: string;
    email?: string;
    tier: string;
  };
  conversationHistory: Message[];
  metadata?: Record<string, any>;
}

export interface ProcessMessageResponse {
  botMessage: Message;
  escalationStatus: {
    escalated: boolean;
    queuePosition?: number;
    estimatedWaitTime?: number;
    reason?: string;
  };
}

export interface CreateSessionResponse {
  session: ChatSession;
}

export class EnhancedChatService {
  private chatRepository: ChatRepository;
  private userRepository: UserRepository;
  private llmService: any; // Will be injected

  constructor(llmService?: any) {
    this.chatRepository = new ChatRepository();
    this.userRepository = new UserRepository();
    this.llmService = llmService;
  }

  async createChatSession(
    customerId: string,
    customerData: {
      name?: string;
      email?: string;
      tier?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<CreateSessionResponse> {
    try {
      // Verify customer exists
      const customer = await this.userRepository.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Create session in database
      const session = await this.chatRepository.createSession({
        customerId,
        subject: 'General inquiry',
        priority: this.determinePriority(customer.tier as any),
        metadata: {
          ...customerData.metadata,
          customerTier: customer.tier,
          source: 'chat_widget',
          createdAt: new Date().toISOString(),
        },
      });

      // Cache session data in Redis for quick access
      await redis.setSession(session.id, {
        customerId: session.customerId,
        status: session.status,
        priority: session.priority,
        metadata: session.metadata,
        lastActivity: new Date().toISOString(),
      }, 3600); // 1 hour TTL

      // Initialize conversation context cache
      await redis.cacheSet(
        `conversation:${session.id}`,
        {
          sessionId: session.id,
          customerId,
          messages: [],
          escalationChecked: false,
        },
        1800 // 30 minutes TTL
      );

      logger.info('Enhanced chat session created', {
        sessionId: session.id,
        customerId,
        priority: session.priority,
        tier: customer.tier,
      });

      return { session };
    } catch (error) {
      logger.error('Failed to create enhanced chat session', { error, customerId });
      throw error;
    }
  }

  async processMessage(
    message: string,
    sessionId: string,
    customerId: string,
    customerData: any
  ): Promise<ProcessMessageResponse> {
    try {
      // Get session from cache or database
      let sessionData = await redis.getSession(sessionId);
      if (!sessionData) {
        const dbSession = await this.chatRepository.findSessionById(sessionId);
        if (!dbSession) {
          throw new Error('Session not found');
        }
        sessionData = {
          customerId: dbSession.customerId,
          status: dbSession.status,
          priority: dbSession.priority,
          metadata: dbSession.metadata,
          lastActivity: new Date().toISOString(),
        };
        await redis.setSession(sessionId, sessionData, 3600);
      }

      // Validate customer access
      if (sessionData.customerId !== customerId) {
        throw new Error('Unauthorized access to session');
      }

      // Add customer message to database
      const customerMessage = await this.chatRepository.addMessage({
        sessionId,
        userId: customerId,
        content: message,
        type: 'USER',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'chat_widget',
        },
      });

      // Update session activity
      sessionData.lastActivity = new Date().toISOString();
      await redis.setSession(sessionId, sessionData, 3600);

      // Get conversation context for LLM
      const context = await this.buildChatContext(sessionId, customerId, customerData);

      // Process with LLM (if available)
      let llmResponse;
      if (this.llmService) {
        const llmRequest = {
          message,
          sessionId,
          customerId,
          context: context.conversationHistory,
          metadata: customerData,
        };
        llmResponse = await this.llmService.processMessage(llmRequest);
      } else {
        // Fallback mock response
        const escalationAnalysis = this.analyzeForEscalation(message, context);
        llmResponse = {
          content: this.generateMockResponse(message, context),
          escalationRequired: escalationAnalysis.shouldEscalate,
          escalationReason: escalationAnalysis.reasons?.join(', '),
          confidence: 0.85,
          metadata: { provider: 'mock', processingTime: 100 },
        };
      }

      // Create bot response message
      const botMessage = await this.chatRepository.addMessage({
        sessionId,
        content: llmResponse.content,
        type: 'ASSISTANT',
        metadata: {
          llmProvider: llmResponse.metadata?.provider || 'mock',
          confidence: llmResponse.confidence,
          processingTime: llmResponse.metadata?.processingTime || 100,
          escalationRequired: llmResponse.escalationRequired,
          escalationReason: llmResponse.escalationReason,
        },
      });

      // Check for escalation
      const escalationStatus = await this.handleEscalation(
        sessionId,
        {
          shouldEscalate: llmResponse.escalationRequired,
          reasons: llmResponse.escalationReason ? [llmResponse.escalationReason] : [],
        },
        context
      );

      // Update conversation cache
      await this.updateConversationCache(sessionId, [customerMessage, botMessage]);

      // Publish real-time updates
      await this.publishMessageUpdate(sessionId, botMessage);
      if (escalationStatus.escalated) {
        await this.publishEscalationUpdate(sessionId, escalationStatus);
      }

      logger.info('Message processed successfully', {
        sessionId,
        customerId,
        messageLength: message.length,
        responseLength: llmResponse.content.length,
        escalated: escalationStatus.escalated,
      });

      return {
        botMessage,
        escalationStatus,
      };
    } catch (error) {
      logger.error('Failed to process message', { error, sessionId, customerId });
      throw error;
    }
  }

  async getChatHistory(sessionId: string, limit?: number): Promise<Message[]> {
    try {
      // Try to get from cache first
      const cacheKey = `history:${sessionId}`;
      let messages = await redis.cacheGet<Message[]>(cacheKey);

      if (!messages) {
        // Get from database
        messages = await this.chatRepository.getSessionMessages(sessionId, {
          limit: limit || 100,
          orderBy: 'asc',
        });

        // Cache for 10 minutes
        await redis.cacheSet(cacheKey, messages, 600);
      }

      logger.debug('Chat history retrieved', {
        sessionId,
        messageCount: messages.length,
        fromCache: !!messages,
      });

      return messages;
    } catch (error) {
      logger.error('Failed to get chat history', { error, sessionId });
      throw error;
    }
  }

  async getSessionDetails(sessionId: string): Promise<ChatSession | null> {
    try {
      // Try cache first
      const cacheKey = `session_details:${sessionId}`;
      let session = await redis.cacheGet<ChatSession>(cacheKey);

      if (!session) {
        session = await this.chatRepository.findSessionById(sessionId);
        if (session) {
          // Cache for 5 minutes
          await redis.cacheSet(cacheKey, session, 300);
        }
      }

      return session;
    } catch (error) {
      logger.error('Failed to get session details', { error, sessionId });
      throw error;
    }
  }

  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<ChatSession> {
    try {
      const session = await this.chatRepository.updateSession(sessionId, { status });

      // Update cache
      const sessionData = await redis.getSession(sessionId);
      if (sessionData) {
        sessionData.status = status;
        await redis.setSession(sessionId, sessionData, 3600);
      }

      // Clear related caches
      await redis.del(`session_details:${sessionId}`);

      logger.info('Session status updated', { sessionId, status });

      return session;
    } catch (error) {
      logger.error('Failed to update session status', { error, sessionId, status });
      throw error;
    }
  }

  private async buildChatContext(
    sessionId: string,
    customerId: string,
    customerData: any
  ): Promise<ChatContext> {
    // Get recent conversation history
    const messages = await this.getChatHistory(sessionId, 20);

    return {
      sessionId,
      customerId,
      customerData,
      conversationHistory: messages,
      metadata: {
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
      },
    };
  }

  private async handleEscalation(
    sessionId: string,
    escalationTriggers: any,
    context: ChatContext
  ): Promise<{
    escalated: boolean;
    queuePosition?: number;
    estimatedWaitTime?: number;
    reason?: string;
  }> {
    if (!escalationTriggers.shouldEscalate) {
      return { escalated: false };
    }

    try {
      // Update session status to escalated
      await this.updateSessionStatus(sessionId, 'ESCALATED');

      // Create escalation record (this would be in a separate escalation service)
      const queuePosition = await this.getEscalationQueuePosition();
      const estimatedWaitTime = this.calculateEstimatedWaitTime(queuePosition, context.customerData.tier);

      // Cache escalation status
      const escalationData = {
        escalated: true,
        queuePosition,
        estimatedWaitTime,
        reason: escalationTriggers.reasons?.join(', ') || 'Automatic escalation',
        escalatedAt: new Date().toISOString(),
      };

      await redis.cacheSet(`escalation:${sessionId}`, escalationData, 1800);

      logger.info('Session escalated', {
        sessionId,
        reason: escalationData.reason,
        queuePosition,
        estimatedWaitTime,
      });

      return escalationData;
    } catch (error) {
      logger.error('Failed to handle escalation', { error, sessionId });
      return { escalated: false };
    }
  }

  private async updateConversationCache(sessionId: string, messages: Message[]): Promise<void> {
    try {
      const cacheKey = `conversation:${sessionId}`;
      const cachedConversation = await redis.cacheGet(cacheKey);
      const conversation: any = cachedConversation || {
        sessionId,
        messages: [],
        lastUpdated: new Date().toISOString(),
      };

      conversation.messages.push(...messages);
      conversation.lastUpdated = new Date().toISOString();

      // Keep only last 50 messages in cache
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }

      await redis.cacheSet(cacheKey, conversation, 1800);
    } catch (error) {
      logger.error('Failed to update conversation cache', { error, sessionId });
    }
  }

  private async publishMessageUpdate(sessionId: string, message: Message): Promise<void> {
    try {
      await redis.publish(`session:${sessionId}:messages`, {
        type: 'new_message',
        sessionId,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to publish message update', { error, sessionId });
    }
  }

  private async publishEscalationUpdate(sessionId: string, escalationStatus: any): Promise<void> {
    try {
      await redis.publish(`session:${sessionId}:escalation`, {
        type: 'escalation_status_change',
        sessionId,
        escalationStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to publish escalation update', { error, sessionId });
    }
  }

  private determinePriority(tier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'): Priority {
    switch (tier) {
      case 'ENTERPRISE':
        return 'HIGH';
      case 'PREMIUM':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private async getEscalationQueuePosition(): Promise<number> {
    // This would get the actual queue position from the escalation service
    return Math.floor(Math.random() * 5) + 1;
  }

  private calculateEstimatedWaitTime(queuePosition: number, tier: string): number {
    const baseTimes = {
      'ENTERPRISE': 2, // 2 minutes per position
      'PREMIUM': 3,    // 3 minutes per position
      'BASIC': 5,      // 5 minutes per position
    };
    
    const baseTime = baseTimes[tier as keyof typeof baseTimes] || 5;
    return queuePosition * baseTime;
  }

  private generateMockResponse(message: string, context: ChatContext): string {
    const responses = [
      "I understand your concern. Let me help you with that.",
      "Thank you for reaching out. I'm here to assist you.",
      "I can help you resolve this issue. Let me gather some information.",
      "I appreciate your patience. Let me look into this for you.",
      "That's a great question. Here's what I can tell you...",
    ];

    // Simple keyword-based responses
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('billing') || lowerMessage.includes('charge')) {
      return "I understand you have a billing concern. Let me connect you with our billing specialist who can review your account in detail.";
    }
    if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
      return "I can help you with cancellation or refund requests. Let me escalate this to our customer service team for immediate assistance.";
    }
    if (lowerMessage.includes('technical') || lowerMessage.includes('bug')) {
      return "I see you're experiencing a technical issue. Let me gather some details and connect you with our technical support team.";
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private analyzeForEscalation(message: string, context: ChatContext): any {
    const lowerMessage = message.toLowerCase();
    const escalationKeywords = [
      'billing', 'charge', 'refund', 'cancel', 'manager', 'supervisor',
      'unacceptable', 'terrible', 'awful', 'complaint', 'lawsuit'
    ];

    const foundKeywords = escalationKeywords.filter(keyword => 
      lowerMessage.includes(keyword)
    );

    const shouldEscalate = foundKeywords.length > 0 || 
      context.conversationHistory.length > 10; // Escalate long conversations

    return {
      sentiment: foundKeywords.length > 0 ? 'negative' : 'neutral',
      keywords: foundKeywords,
      shouldEscalate,
      confidence: foundKeywords.length > 0 ? 0.9 : 0.1,
      reasons: foundKeywords.length > 0 ? 
        [`Keywords detected: ${foundKeywords.join(', ')}`] : [],
    };
  }
}