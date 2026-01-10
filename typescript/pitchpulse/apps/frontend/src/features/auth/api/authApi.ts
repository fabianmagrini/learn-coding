import { api } from '@/lib/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    isOnboarded: boolean;
  };
  token: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', credentials);
    return response.data;
  },

  me: async (): Promise<AuthResponse['user']> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};
