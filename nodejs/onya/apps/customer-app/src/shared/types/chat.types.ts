export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot' | 'operator' | 'system';
  timestamp: Date;
  sessionId: string;
  userId?: string;
  operatorId?: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  customerId: string;
  operatorId?: string;
  status: 'active' | 'escalated' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface EscalationStatus {
  escalated: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number;
  operatorId?: string;
  operatorName?: string;
  reason?: string;
}

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  tier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  metadata?: Record<string, any>;
}