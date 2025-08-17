import axios, { AxiosInstance } from 'axios';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export interface LLMProcessRequest {
  message: string;
  sessionId: string;
  customerId: string;
  context?: any[];
  metadata?: Record<string, any>;
}

export interface ChatSessionCreateRequest {
  customerId: string;
  customerData?: {
    name?: string;
    email?: string;
    phone?: string;
    tier?: 'basic' | 'premium' | 'enterprise';
    metadata?: Record<string, any>;
  };
}

export interface MessageAddRequest {
  content: string;
  type: 'user' | 'bot' | 'operator' | 'system';
  userId?: string;
  operatorId?: string;
}

export class SharedServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.SHARED_SERVICES_URL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${config.SERVICE_TOKEN}`,
        'X-Service': 'customer-bff',
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Outgoing request to shared services', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Response from shared services', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('Response interceptor error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  // LLM Service methods
  async processMessage(data: LLMProcessRequest) {
    try {
      const response = await this.client.post('/api/llm/process', data);
      return response.data;
    } catch (error) {
      logger.error('Failed to process message with LLM', { error, data });
      throw new Error('LLM processing failed');
    }
  }

  async getLlmStatus() {
    try {
      const response = await this.client.get('/api/llm/status');
      return response.data;
    } catch (error) {
      logger.error('Failed to get LLM status', { error });
      throw new Error('Failed to get LLM status');
    }
  }

  // Chat Session methods
  async createChatSession(data: ChatSessionCreateRequest) {
    try {
      const response = await this.client.post('/api/chat/sessions', data);
      return response.data;
    } catch (error) {
      logger.error('Failed to create chat session', { error, data });
      throw new Error('Failed to create chat session');
    }
  }

  async getChatSession(sessionId: string) {
    try {
      const response = await this.client.get(`/api/chat/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get chat session', { error, sessionId });
      throw new Error('Failed to get chat session');
    }
  }

  async updateChatSession(sessionId: string, updates: {
    status?: 'active' | 'escalated' | 'resolved' | 'closed';
    operatorId?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await this.client.patch(`/api/chat/sessions/${sessionId}`, updates);
      return response.data;
    } catch (error) {
      logger.error('Failed to update chat session', { error, sessionId, updates });
      throw new Error('Failed to update chat session');
    }
  }

  async getChatMessages(sessionId: string, limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.client.get(`/api/chat/sessions/${sessionId}/messages`, { params });
      return response.data;
    } catch (error) {
      logger.error('Failed to get chat messages', { error, sessionId });
      throw new Error('Failed to get chat messages');
    }
  }

  async addChatMessage(sessionId: string, data: MessageAddRequest) {
    try {
      const response = await this.client.post(`/api/chat/sessions/${sessionId}/messages`, data);
      return response.data;
    } catch (error) {
      logger.error('Failed to add chat message', { error, sessionId, data });
      throw new Error('Failed to add chat message');
    }
  }

  async getCustomerSessions(customerId: string) {
    try {
      const response = await this.client.get(`/api/chat/customers/${customerId}/sessions`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get customer sessions', { error, customerId });
      throw new Error('Failed to get customer sessions');
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Shared services health check failed', { error });
      throw new Error('Shared services unavailable');
    }
  }
}

export const sharedServiceClient = new SharedServiceClient();