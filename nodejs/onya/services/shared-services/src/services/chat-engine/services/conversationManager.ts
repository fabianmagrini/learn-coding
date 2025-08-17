import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession, Customer } from '../../../shared/types/common.types';
import { logger } from '../../../shared/utils/logger';

export class ConversationManager {
  private sessions = new Map<string, ChatSession>();
  private messages = new Map<string, Message[]>();
  private customers = new Map<string, Customer>();

  async createSession(customerId: string): Promise<ChatSession> {
    const sessionId = uuidv4();
    const session: ChatSession = {
      id: sessionId,
      customerId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);

    logger.info('Created chat session', { sessionId, customerId });
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, updatedSession);
    logger.info('Updated chat session', { sessionId, status: updatedSession.status });
    
    return updatedSession;
  }

  async addMessage(sessionId: string, content: string, type: Message['type'], userId?: string, operatorId?: string): Promise<Message> {
    const messageId = uuidv4();
    const message: Message = {
      id: messageId,
      content,
      type,
      timestamp: new Date(),
      sessionId,
      userId,
      operatorId,
    };

    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);

    // Update session timestamp
    await this.updateSession(sessionId, { updatedAt: new Date() });

    logger.info('Added message to session', { 
      sessionId, 
      messageId, 
      type,
      contentLength: content.length 
    });

    return message;
  }

  async getMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const messages = this.messages.get(sessionId) || [];
    
    if (limit) {
      return messages.slice(-limit);
    }
    
    return messages;
  }

  async getRecentMessages(sessionId: string, count: number = 10): Promise<Message[]> {
    const messages = this.messages.get(sessionId) || [];
    return messages.slice(-count);
  }

  async createOrGetCustomer(customerId: string, customerData?: Partial<Customer>): Promise<Customer> {
    let customer = this.customers.get(customerId);
    
    if (!customer) {
      customer = {
        id: customerId,
        name: customerData?.name,
        email: customerData?.email,
        phone: customerData?.phone,
        tier: customerData?.tier || 'basic',
        createdAt: new Date(),
        metadata: customerData?.metadata,
      };
      
      this.customers.set(customerId, customer);
      logger.info('Created customer record', { customerId, tier: customer.tier });
    }

    return customer;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) || null;
  }

  async getActiveSessions(): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).filter(session => 
      session.status === 'active' || session.status === 'escalated'
    );
  }

  async getSessionsByCustomer(customerId: string): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).filter(session => 
      session.customerId === customerId
    );
  }

  async getSessionContext(sessionId: string): Promise<{ session: ChatSession | null; customer: Customer | null; recentMessages: Message[] }> {
    const session = await this.getSession(sessionId);
    const customer = session ? await this.getCustomer(session.customerId) : null;
    const recentMessages = await this.getRecentMessages(sessionId, 5);

    return {
      session,
      customer,
      recentMessages,
    };
  }

  // Mock data methods for development
  seedMockData() {
    // Create mock customers
    const mockCustomers: Customer[] = [
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        tier: 'premium',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
      {
        id: 'customer-2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        tier: 'basic',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        id: 'customer-3',
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        tier: 'enterprise',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      },
    ];

    mockCustomers.forEach(customer => {
      this.customers.set(customer.id, customer);
    });

    logger.info('Seeded mock customer data', { count: mockCustomers.length });
  }
}