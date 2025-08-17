import { v4 as uuidv4 } from 'uuid';
import { Operator } from '../../../shared/types/common.types';
import { logger } from '../../../shared/utils/logger';

export class OperatorService {
  private operators = new Map<string, Operator>();
  private operatorSessions = new Map<string, { lastSeen: Date; sessionId: string }>();

  constructor() {
    this.seedMockOperators();
  }

  async createOperator(operatorData: Omit<Operator, 'id' | 'createdAt' | 'activeChatCount'>): Promise<Operator> {
    const operator: Operator = {
      id: uuidv4(),
      ...operatorData,
      activeChatCount: 0,
      createdAt: new Date(),
    };

    this.operators.set(operator.id, operator);
    logger.info('Created operator', { operatorId: operator.id, name: operator.name });

    return operator;
  }

  async getOperator(operatorId: string): Promise<Operator | null> {
    return this.operators.get(operatorId) || null;
  }

  async updateOperator(operatorId: string, updates: Partial<Operator>): Promise<Operator | null> {
    const operator = this.operators.get(operatorId);
    if (!operator) {
      return null;
    }

    const updatedOperator = { ...operator, ...updates };
    this.operators.set(operatorId, updatedOperator);

    logger.info('Updated operator', { operatorId, updates: Object.keys(updates) });
    return updatedOperator;
  }

  async updateOperatorStatus(operatorId: string, status: Operator['status']): Promise<Operator | null> {
    return this.updateOperator(operatorId, { status });
  }

  async incrementActiveChatCount(operatorId: string): Promise<Operator | null> {
    const operator = this.operators.get(operatorId);
    if (!operator) {
      return null;
    }

    return this.updateOperator(operatorId, { 
      activeChatCount: operator.activeChatCount + 1 
    });
  }

  async decrementActiveChatCount(operatorId: string): Promise<Operator | null> {
    const operator = this.operators.get(operatorId);
    if (!operator) {
      return null;
    }

    return this.updateOperator(operatorId, { 
      activeChatCount: Math.max(0, operator.activeChatCount - 1)
    });
  }

  async getAvailableOperators(): Promise<Operator[]> {
    const operators = Array.from(this.operators.values());
    return operators.filter(operator => 
      operator.status === 'online' && 
      operator.activeChatCount < operator.maxConcurrentChats
    );
  }

  async findBestOperator(skills?: string[], priority?: 'low' | 'medium' | 'high' | 'urgent'): Promise<Operator | null> {
    const availableOperators = await this.getAvailableOperators();
    
    if (availableOperators.length === 0) {
      return null;
    }

    // Filter by skills if specified
    let candidates = availableOperators;
    if (skills && skills.length > 0) {
      candidates = availableOperators.filter(operator =>
        skills.some(skill => operator.skills.includes(skill))
      );
    }

    // If no skill match, fall back to all available operators
    if (candidates.length === 0) {
      candidates = availableOperators;
    }

    // Sort by workload (least busy first)
    candidates.sort((a, b) => {
      // First by workload percentage
      const aWorkload = a.activeChatCount / a.maxConcurrentChats;
      const bWorkload = b.activeChatCount / b.maxConcurrentChats;
      
      if (aWorkload !== bWorkload) {
        return aWorkload - bWorkload;
      }

      // Then by role priority (admin > supervisor > agent)
      const rolePriority = { admin: 3, supervisor: 2, agent: 1 };
      return rolePriority[b.role] - rolePriority[a.role];
    });

    return candidates[0];
  }

  async getOnlineOperators(): Promise<Operator[]> {
    const operators = Array.from(this.operators.values());
    return operators.filter(operator => operator.status === 'online');
  }

  async getAllOperators(): Promise<Operator[]> {
    return Array.from(this.operators.values());
  }

  async getOperatorStats(operatorId: string): Promise<{
    operator: Operator | null;
    workloadPercentage: number;
    isAvailable: boolean;
  }> {
    const operator = await this.getOperator(operatorId);
    
    if (!operator) {
      return {
        operator: null,
        workloadPercentage: 0,
        isAvailable: false,
      };
    }

    const workloadPercentage = (operator.activeChatCount / operator.maxConcurrentChats) * 100;
    const isAvailable = operator.status === 'online' && operator.activeChatCount < operator.maxConcurrentChats;

    return {
      operator,
      workloadPercentage,
      isAvailable,
    };
  }

  private seedMockOperators() {
    const mockOperators: Omit<Operator, 'id' | 'createdAt'>[] = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@onya.com',
        role: 'agent',
        skills: ['billing', 'technical-support', 'general'],
        status: 'online',
        maxConcurrentChats: 3,
        activeChatCount: 0,
      },
      {
        name: 'Bob Smith',
        email: 'bob.smith@onya.com',
        role: 'agent',
        skills: ['technical-support', 'product-support'],
        status: 'online',
        maxConcurrentChats: 4,
        activeChatCount: 1,
      },
      {
        name: 'Carol Davis',
        email: 'carol.davis@onya.com',
        role: 'supervisor',
        skills: ['escalations', 'billing', 'general', 'complaints'],
        status: 'online',
        maxConcurrentChats: 2,
        activeChatCount: 0,
      },
      {
        name: 'David Wilson',
        email: 'david.wilson@onya.com',
        role: 'agent',
        skills: ['billing', 'account-management'],
        status: 'busy',
        maxConcurrentChats: 3,
        activeChatCount: 3,
      },
      {
        name: 'Eva Martinez',
        email: 'eva.martinez@onya.com',
        role: 'admin',
        skills: ['all'],
        status: 'offline',
        maxConcurrentChats: 5,
        activeChatCount: 0,
      },
    ];

    mockOperators.forEach(operatorData => {
      const operator: Operator = {
        id: uuidv4(),
        ...operatorData,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within last 90 days
      };
      this.operators.set(operator.id, operator);
    });

    logger.info('Seeded mock operator data', { count: mockOperators.length });
  }
}