import type { AccountSummary, MultiAccountResponse, SimulateBackendRequest } from '@/types';

const API_BASE_URL = '/v1';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAccount(accountId: string, noCache = false): Promise<AccountSummary> {
    const headers: HeadersInit = {};
    if (noCache) {
      headers['Cache-Control'] = 'no-cache';
    }
    return this.request<AccountSummary>(`/accounts/${accountId}`, { headers });
  }

  async getAccounts(accountIds: string[], noCache = false): Promise<MultiAccountResponse> {
    const ids = accountIds.join(',');
    const headers: HeadersInit = {};
    if (noCache) {
      headers['Cache-Control'] = 'no-cache';
    }
    return this.request<MultiAccountResponse>(`/accounts?ids=${ids}`, { headers });
  }

  async simulateBackend(backendName: string, config: SimulateBackendRequest): Promise<void> {
    return this.request(`/admin/backends/${backendName}/simulate`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async invalidateCache(accountId: string): Promise<void> {
    return this.request(`/admin/cache/invalidate/${accountId}`, {
      method: 'POST',
    });
  }

  async invalidateAllCache(): Promise<void> {
    return this.request('/admin/cache/invalidate-all', {
      method: 'POST',
    });
  }

  async getHealth(): Promise<any> {
    return this.request('/admin/health');
  }
}

export const apiService = new ApiService();
