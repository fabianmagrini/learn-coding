import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import { 
  OperatorProfile, 
  ChatSession, 
  QueuedChat, 
  DashboardMetrics, 
  TeamMetrics,
  ApiResponse,
  ChatMessage,
  OperatorStatus 
} from '@/types/operator.types';

export class OperatorApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: (import.meta.env?.VITE_OPERATOR_BFF_URL as string) || 'http://localhost:3002',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('onya_operator_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('onya_operator_token');
          localStorage.removeItem('onya_operator_user');
          window.location.href = '/login';
        } else if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        } else if (error.response?.data?.error) {
          toast.error(error.response.data.error);
        } else if (error.message) {
          toast.error(error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; accessToken: string }>> {
    const response = await this.client.post('/api/auth/login', { email, password });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('onya_operator_token');
      localStorage.removeItem('onya_operator_user');
    }
  }

  async verifyToken(): Promise<ApiResponse<{ user: any }>> {
    const response = await this.client.get('/api/status');
    return response.data;
  }

  // Operator Profile
  async getMyProfile(): Promise<ApiResponse<{ profile: OperatorProfile; user: any }>> {
    const response = await this.client.get('/api/operators/me');
    return response.data;
  }

  async updateMyStatus(status: OperatorStatus): Promise<ApiResponse> {
    const response = await this.client.put('/api/operators/me/status', { status });
    return response.data;
  }

  async getMyMetrics(timeRange: string = '24h'): Promise<ApiResponse<{ metrics: any }>> {
    const response = await this.client.get('/api/operators/me/metrics', {
      params: { timeRange }
    });
    return response.data;
  }

  async getMySessions(): Promise<ApiResponse<{ sessions: ChatSession[] }>> {
    const response = await this.client.get('/api/operators/me/sessions');
    return response.data;
  }

  // Chat Management
  async getChatQueue(params: {
    priority?: string;
    skill?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<{ sessions: QueuedChat[]; total: number; hasMore: boolean }>> {
    const response = await this.client.get('/api/chat/queue', { params });
    return response.data;
  }

  async getActiveSessions(): Promise<ApiResponse<{ sessions: ChatSession[] }>> {
    const response = await this.client.get('/api/chat/active');
    return response.data;
  }

  async getChatSession(sessionId: string): Promise<ApiResponse<{ session: ChatSession; messages: ChatMessage[] }>> {
    const response = await this.client.get(`/api/chat/${sessionId}`);
    return response.data;
  }

  async assignChat(sessionId: string, operatorId: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/chat/assign', { sessionId, operatorId });
    return response.data;
  }

  async acceptChat(sessionId: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/chat/assign', { 
      sessionId, 
      operatorId: this.getCurrentOperatorId() 
    });
    return response.data;
  }

  async sendMessage(sessionId: string, content: string, type: string = 'operator'): Promise<ApiResponse> {
    const response = await this.client.post(`/api/chat/${sessionId}/messages`, { content, type });
    return response.data;
  }

  async escalateChat(sessionId: string, data: {
    operatorId: string;
    reason: string;
    priority?: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post(`/api/chat/${sessionId}/escalate`, data);
    return response.data;
  }

  async transferChat(sessionId: string, data: {
    toOperatorId: string;
    reason: string;
    notes: string;
    customerConsent?: boolean;
  }): Promise<ApiResponse> {
    const response = await this.client.post(`/api/chat/${sessionId}/transfer`, data);
    return response.data;
  }

  async resolveChat(sessionId: string, data: {
    resolution: string;
    customerSatisfaction?: number;
    tags?: string[];
  }): Promise<ApiResponse> {
    const response = await this.client.post(`/api/chat/${sessionId}/resolve`, data);
    return response.data;
  }

  async closeChat(sessionId: string): Promise<ApiResponse> {
    const response = await this.client.post(`/api/chat/${sessionId}/close`);
    return response.data;
  }

  // Analytics
  async getDashboardMetrics(timeRange: string = '24h'): Promise<ApiResponse<DashboardMetrics>> {
    const response = await this.client.get('/api/analytics/dashboard', {
      params: { timeRange }
    });
    return response.data;
  }

  async getTeamMetrics(timeRange: string = '24h'): Promise<ApiResponse<{ metrics: TeamMetrics }>> {
    const response = await this.client.get('/api/analytics/team', {
      params: { timeRange }
    });
    return response.data;
  }

  async getRealtimeMetrics(): Promise<ApiResponse<{
    queuedChats: number;
    activeChats: number;
    onlineOperators: number;
    timestamp: string;
  }>> {
    const response = await this.client.get('/api/analytics/realtime');
    return response.data;
  }

  async getPerformanceMetrics(): Promise<ApiResponse<{
    team: TeamMetrics;
    chat: any;
    operators: any[];
    timeRange: string;
  }>> {
    const response = await this.client.get('/api/analytics/performance');
    return response.data;
  }

  // Utility methods
  private getCurrentOperatorId(): string {
    const user = JSON.parse(localStorage.getItem('onya_operator_user') || '{}');
    return user.operatorId || '';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const apiClient = new OperatorApiClient();