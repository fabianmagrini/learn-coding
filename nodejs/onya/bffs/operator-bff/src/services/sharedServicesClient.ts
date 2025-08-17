import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

export interface SharedServicesConfig {
  baseURL: string;
  serviceToken: string;
  timeout: number;
}

export interface ChatSessionResponse {
  success: boolean;
  data: {
    session: any;
    messages?: any[];
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    user: any;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}

export interface MetricsResponse {
  success: boolean;
  data: any;
}

export class SharedServicesClient {
  private client: AxiosInstance;
  private config: SharedServicesConfig;

  constructor(config: SharedServicesConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'X-Service-Token': config.serviceToken,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Shared Services API Request', {
          method: config.method,
          url: config.url,
          data: config.data ? 'present' : 'none',
        });
        return config;
      },
      (error) => {
        logger.error('Shared Services API Request Error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Shared Services API Response', {
          status: response.status,
          url: response.config.url,
          success: response.data?.success,
        });
        return response;
      },
      (error) => {
        logger.error('Shared Services API Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async verifyToken(token: string): Promise<UserResponse> {
    const response = await this.client.post('/api/auth/verify-token', { token });
    return response.data;
  }

  async getUserProfile(token: string): Promise<UserResponse> {
    const response = await this.client.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // Chat session methods
  async getChatSessions(params: {
    status?: string;
    operatorId?: string;
    customerId?: string;
    priority?: string;
    skip?: number;
    take?: number;
  } = {}): Promise<any> {
    const response = await this.client.get('/api/chat/sessions', { params });
    return response.data;
  }

  async getChatSession(sessionId: string): Promise<ChatSessionResponse> {
    const response = await this.client.get(`/api/chat/sessions/${sessionId}`);
    return response.data;
  }

  async getChatMessages(sessionId: string, limit?: number): Promise<any> {
    const params = limit ? { limit } : {};
    const response = await this.client.get(`/api/chat/sessions/${sessionId}/messages`, { params });
    return response.data;
  }

  async updateChatSession(sessionId: string, updates: {
    status?: string;
    operatorId?: string;
    metadata?: Record<string, any>;
  }): Promise<ChatSessionResponse> {
    const response = await this.client.patch(`/api/chat/sessions/${sessionId}`, updates);
    return response.data;
  }

  async addChatMessage(sessionId: string, message: {
    content: string;
    type: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await this.client.post(`/api/chat/sessions/${sessionId}/messages`, message);
    return response.data;
  }

  async assignOperatorToSession(sessionId: string, operatorId: string): Promise<ChatSessionResponse> {
    return this.updateChatSession(sessionId, { 
      operatorId, 
      status: 'ESCALATED',
      metadata: { assignedAt: new Date().toISOString() }
    });
  }

  async escalateSession(sessionId: string, data: {
    operatorId: string;
    reason: string;
    priority?: string;
  }): Promise<ChatSessionResponse> {
    return this.updateChatSession(sessionId, {
      operatorId: data.operatorId,
      status: 'ESCALATED',
      metadata: {
        escalationReason: data.reason,
        escalatedAt: new Date().toISOString(),
        priority: data.priority,
      }
    });
  }

  async resolveSession(sessionId: string, data: {
    operatorId: string;
    resolution: string;
    customerSatisfaction?: number;
    tags?: string[];
  }): Promise<ChatSessionResponse> {
    return this.updateChatSession(sessionId, {
      status: 'RESOLVED',
      metadata: {
        resolvedAt: new Date().toISOString(),
        resolvedBy: data.operatorId,
        resolution: data.resolution,
        customerSatisfaction: data.customerSatisfaction,
        tags: data.tags,
      }
    });
  }

  async closeSession(sessionId: string, operatorId: string): Promise<ChatSessionResponse> {
    return this.updateChatSession(sessionId, {
      status: 'CLOSED',
      metadata: {
        closedAt: new Date().toISOString(),
        closedBy: operatorId,
      }
    });
  }

  // User management methods
  async getUsers(params: {
    role?: string;
    status?: string;
    skip?: number;
    take?: number;
  } = {}): Promise<any> {
    const response = await this.client.get('/api/users', { params });
    return response.data;
  }

  async getOperators(): Promise<any> {
    return this.getUsers({ role: 'OPERATOR' });
  }

  async getOperatorProfile(operatorId: string): Promise<any> {
    const response = await this.client.get(`/api/users/operators/${operatorId}`);
    return response.data;
  }

  async updateOperatorStatus(operatorId: string, status: string): Promise<any> {
    const response = await this.client.put(`/api/users/operators/${operatorId}/status`, { status });
    return response.data;
  }

  // Metrics and analytics methods
  async getMetrics(): Promise<MetricsResponse> {
    const response = await this.client.get('/metrics/custom');
    return response.data;
  }

  async getChatMetrics(timeRange: string = '24h'): Promise<any> {
    const response = await this.client.get('/api/analytics/chat', { 
      params: { timeRange } 
    });
    return response.data;
  }

  async getOperatorMetrics(operatorId: string, timeRange: string = '24h'): Promise<any> {
    const response = await this.client.get(`/api/analytics/operators/${operatorId}`, {
      params: { timeRange }
    });
    return response.data;
  }

  async getTeamMetrics(timeRange: string = '24h'): Promise<any> {
    const response = await this.client.get('/api/analytics/team', {
      params: { timeRange }
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Error handling helper
  public isServiceError(error: any): boolean {
    return error.response?.status >= 500;
  }

  public isClientError(error: any): boolean {
    return error.response?.status >= 400 && error.response?.status < 500;
  }

  public getErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    return error.message || 'Unknown error occurred';
  }

  // Batch operations
  async batchUpdateSessions(updates: Array<{
    sessionId: string;
    data: Record<string, any>;
  }>): Promise<any> {
    const promises = updates.map(update => 
      this.updateChatSession(update.sessionId, update.data)
    );
    return Promise.allSettled(promises);
  }

  async batchAssignSessions(assignments: Array<{
    sessionId: string;
    operatorId: string;
  }>): Promise<any> {
    const promises = assignments.map(assignment =>
      this.assignOperatorToSession(assignment.sessionId, assignment.operatorId)
    );
    return Promise.allSettled(promises);
  }

  // WebSocket connection info
  async getWebSocketEndpoint(): Promise<string> {
    return `${this.config.baseURL.replace('http', 'ws')}/ws`;
  }
}

// Factory function
export function createSharedServicesClient(): SharedServicesClient {
  const config: SharedServicesConfig = {
    baseURL: process.env.SHARED_SERVICES_URL || 'http://localhost:3000',
    serviceToken: process.env.SERVICE_TOKEN || 'shared-service-secret-token',
    timeout: 30000, // 30 seconds
  };

  return new SharedServicesClient(config);
}