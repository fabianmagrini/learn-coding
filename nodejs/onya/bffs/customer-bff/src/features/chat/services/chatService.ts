import { v4 as uuidv4 } from 'uuid';
import { sharedServiceClient } from '../../../shared/services/sharedServiceClient';
import { logger } from '../../../shared/utils/logger';
import { Message, EscalationStatus } from '../../../shared/types/common.types';

export class ChatService {
  async processMessage(
    message: string,
    sessionId: string,
    customerId: string,
    customerData?: any
  ): Promise<{
    botMessage: Message;
    escalationStatus: EscalationStatus;
  }> {
    try {
      // Get chat context for LLM
      const sessionData = await sharedServiceClient.getChatSession(sessionId);
      const recentMessages = await sharedServiceClient.getChatMessages(sessionId, 10);

      // Process message with LLM
      const llmResponse = await sharedServiceClient.processMessage({
        message,
        sessionId,
        customerId,
        context: recentMessages.data.messages,
        metadata: {
          customerTier: customerData?.tier,
          sessionStatus: sessionData.data.session?.status,
        },
      });

      // Create bot message
      const botMessage: Message = {
        id: uuidv4(),
        content: llmResponse.data.response.content,
        type: 'bot',
        timestamp: new Date(),
        sessionId,
        metadata: {
          confidence: llmResponse.data.response.confidence,
          llmMetadata: llmResponse.data.response.metadata,
        },
      };

      // Determine escalation status
      const escalationStatus: EscalationStatus = {
        escalated: llmResponse.data.response.escalationRequired,
        reason: llmResponse.data.response.escalationReason,
      };

      // If escalated, update session status and get queue position
      if (escalationStatus.escalated) {
        await sharedServiceClient.updateChatSession(sessionId, {
          status: 'escalated',
          metadata: {
            escalationReason: escalationStatus.reason,
            escalationTimestamp: new Date(),
          },
        });

        // Get estimated queue position (mock for now)
        escalationStatus.queuePosition = Math.floor(Math.random() * 5) + 1;
        escalationStatus.estimatedWaitTime = escalationStatus.queuePosition * 3; // 3 minutes per position
      }

      logger.info('Processed chat message', {
        sessionId,
        customerId,
        escalated: escalationStatus.escalated,
        confidence: llmResponse.data.response.confidence,
      });

      return {
        botMessage,
        escalationStatus,
      };

    } catch (error) {
      logger.error('Failed to process chat message', { error, sessionId, customerId });
      
      // Return fallback response
      const fallbackMessage: Message = {
        id: uuidv4(),
        content: "I apologize, but I'm experiencing technical difficulties. Let me connect you with a human agent who can help you.",
        type: 'bot',
        timestamp: new Date(),
        sessionId,
        metadata: { fallback: true },
      };

      const fallbackEscalation: EscalationStatus = {
        escalated: true,
        reason: 'Technical error - automatic escalation',
        queuePosition: 1,
        estimatedWaitTime: 2,
      };

      return {
        botMessage: fallbackMessage,
        escalationStatus: fallbackEscalation,
      };
    }
  }

  async createChatSession(customerId: string, customerData?: any) {
    try {
      const sessionResponse = await sharedServiceClient.createChatSession({
        customerId,
        customerData,
      });

      logger.info('Created chat session', {
        sessionId: sessionResponse.data.session.id,
        customerId,
      });

      return sessionResponse.data.session;

    } catch (error) {
      logger.error('Failed to create chat session', { error, customerId });
      throw new Error('Failed to create chat session');
    }
  }

  async getChatHistory(sessionId: string, limit?: number) {
    try {
      const response = await sharedServiceClient.getChatMessages(sessionId, limit);
      return response.data.messages;

    } catch (error) {
      logger.error('Failed to get chat history', { error, sessionId });
      throw new Error('Failed to get chat history');
    }
  }

  async getSessionDetails(sessionId: string) {
    try {
      const response = await sharedServiceClient.getChatSession(sessionId);
      return response.data;

    } catch (error) {
      logger.error('Failed to get session details', { error, sessionId });
      throw new Error('Failed to get session details');
    }
  }

  async getCustomerChatHistory(customerId: string) {
    try {
      const response = await sharedServiceClient.getCustomerSessions(customerId);
      return response.data.sessions;

    } catch (error) {
      logger.error('Failed to get customer chat history', { error, customerId });
      throw new Error('Failed to get customer chat history');
    }
  }

  async updateSessionStatus(sessionId: string, status: 'active' | 'escalated' | 'resolved' | 'closed') {
    try {
      const response = await sharedServiceClient.updateChatSession(sessionId, { status });
      return response.data.session;

    } catch (error) {
      logger.error('Failed to update session status', { error, sessionId, status });
      throw new Error('Failed to update session status');
    }
  }
}