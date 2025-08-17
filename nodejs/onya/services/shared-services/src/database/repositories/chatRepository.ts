import { ChatSession, Message, MessageType, SessionStatus, Priority, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { logger } from '../../shared/utils/logger';

export class ChatRepository {
  async createSession(data: {
    customerId: string;
    subject?: string;
    priority?: Priority;
    metadata?: Record<string, any>;
  }): Promise<ChatSession> {
    try {
      const session = await prisma.chatSession.create({
        data: {
          customerId: data.customerId,
          subject: data.subject,
          priority: data.priority || 'MEDIUM',
          metadata: data.metadata || {},
        },
        include: {
          customer: true,
          messages: true,
        },
      });

      logger.info('Chat session created', {
        sessionId: session.id,
        customerId: session.customerId,
        priority: session.priority,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create chat session', { error, customerId: data.customerId });
      throw error;
    }
  }

  async findSessionById(id: string): Promise<ChatSession | null> {
    try {
      return await prisma.chatSession.findUnique({
        where: { id },
        include: {
          customer: {
            select: { id: true, name: true, email: true, tier: true },
          },
          operator: {
            select: { id: true, name: true, email: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          escalation: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find session by ID', { error, sessionId: id });
      throw error;
    }
  }

  async updateSession(id: string, data: Prisma.ChatSessionUpdateInput): Promise<ChatSession> {
    try {
      const session = await prisma.chatSession.update({
        where: { id },
        data,
        include: {
          customer: true,
          operator: true,
        },
      });

      logger.info('Chat session updated', {
        sessionId: session.id,
        status: session.status,
      });

      return session;
    } catch (error) {
      logger.error('Failed to update session', { error, sessionId: id });
      throw error;
    }
  }

  async addMessage(data: {
    sessionId: string;
    userId?: string;
    content: string;
    type: MessageType;
    metadata?: Record<string, any>;
  }): Promise<Message> {
    try {
      const message = await prisma.message.create({
        data: {
          sessionId: data.sessionId,
          userId: data.userId,
          content: data.content,
          type: data.type,
          metadata: data.metadata || {},
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      // Update session's updatedAt timestamp
      await prisma.chatSession.update({
        where: { id: data.sessionId },
        data: { updatedAt: new Date() },
      });

      logger.debug('Message added to session', {
        messageId: message.id,
        sessionId: data.sessionId,
        type: data.type,
        userId: data.userId,
      });

      return message;
    } catch (error) {
      logger.error('Failed to add message', { error, sessionId: data.sessionId });
      throw error;
    }
  }

  async getSessionMessages(
    sessionId: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'asc' | 'desc';
    } = {}
  ): Promise<Message[]> {
    try {
      const { limit = 100, offset = 0, orderBy = 'asc' } = options;

      return await prisma.message.findMany({
        where: { sessionId },
        skip: offset,
        take: limit,
        orderBy: { createdAt: orderBy },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get session messages', { error, sessionId });
      throw error;
    }
  }

  async listSessions(options: {
    customerId?: string;
    operatorId?: string;
    status?: SessionStatus;
    priority?: Priority;
    skip?: number;
    take?: number;
  } = {}): Promise<ChatSession[]> {
    try {
      const { customerId, operatorId, status, priority, skip = 0, take = 50 } = options;

      return await prisma.chatSession.findMany({
        where: {
          ...(customerId && { customerId }),
          ...(operatorId && { operatorId }),
          ...(status && { status }),
          ...(priority && { priority }),
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true, tier: true },
          },
          operator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to list sessions', { error, options });
      throw error;
    }
  }

  async assignOperator(sessionId: string, operatorId: string): Promise<ChatSession> {
    try {
      const session = await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          operatorId,
          status: 'ESCALATED',
        },
        include: {
          customer: true,
          operator: true,
        },
      });

      logger.info('Operator assigned to session', {
        sessionId,
        operatorId,
      });

      return session;
    } catch (error) {
      logger.error('Failed to assign operator', { error, sessionId, operatorId });
      throw error;
    }
  }

  async closeSession(sessionId: string, closedBy?: string): Promise<ChatSession> {
    try {
      const session = await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          metadata: {
            closedBy,
            closedAt: new Date().toISOString(),
          },
        },
      });

      logger.info('Session closed', {
        sessionId,
        closedBy,
      });

      return session;
    } catch (error) {
      logger.error('Failed to close session', { error, sessionId });
      throw error;
    }
  }

  async getSessionStats(): Promise<{
    total: number;
    active: number;
    escalated: number;
    resolved: number;
    closed: number;
    averageMessagesPerSession: number;
  }> {
    try {
      const [
        total,
        active,
        escalated,
        resolved,
        closed,
        messageStats,
      ] = await Promise.all([
        prisma.chatSession.count(),
        prisma.chatSession.count({ where: { status: 'ACTIVE' } }),
        prisma.chatSession.count({ where: { status: 'ESCALATED' } }),
        prisma.chatSession.count({ where: { status: 'RESOLVED' } }),
        prisma.chatSession.count({ where: { status: 'CLOSED' } }),
        prisma.message.aggregate({
          _count: { id: true },
        }),
      ]);

      const averageMessagesPerSession = total > 0 ? messageStats._count.id / total : 0;

      return {
        total,
        active,
        escalated,
        resolved,
        closed,
        averageMessagesPerSession: Math.round(averageMessagesPerSession * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to get session stats', { error });
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await prisma.chatSession.delete({
        where: { id: sessionId },
      });

      logger.info('Session deleted', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session', { error, sessionId });
      throw error;
    }
  }

  async findActiveSessions(): Promise<ChatSession[]> {
    return this.listSessions({ status: 'ACTIVE' });
  }

  async findSessionsByCustomer(customerId: string): Promise<ChatSession[]> {
    return this.listSessions({ customerId });
  }
}