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

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  tier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'supervisor' | 'admin';
  skills: string[];
  status: 'online' | 'busy' | 'offline';
  maxConcurrentChats: number;
  activeChatCount: number;
  createdAt: Date;
}

export interface EscalationTrigger {
  type: 'keyword' | 'sentiment' | 'complexity' | 'manual' | 'timeout';
  value?: string;
  threshold?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Escalation {
  id: string;
  sessionId: string;
  customerId: string;
  trigger: EscalationTrigger;
  status: 'pending' | 'assigned' | 'resolved';
  operatorId?: string;
  queuePosition?: number;
  createdAt: Date;
  assignedAt?: Date;
  resolvedAt?: Date;
}

export interface LLMRequest {
  message: string;
  sessionId: string;
  customerId: string;
  context?: any[];
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  escalationRequired: boolean;
  escalationReason?: string;
  confidence: number;
  metadata?: Record<string, any>;
}