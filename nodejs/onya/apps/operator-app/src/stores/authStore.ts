import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from '@/types/operator.types';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { toast } from 'react-hot-toast';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.login(email, password);
          
          if (response.success && response.data) {
            const { user, accessToken } = response.data;
            
            set({
              user,
              token: accessToken,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem('onya_operator_token', accessToken);
            localStorage.setItem('onya_operator_user', JSON.stringify(user));
            
            toast.success(`Welcome back, ${user.email}!`);
            return true;
          } else {
            set({ isLoading: false });
            toast.error('Login failed. Please check your credentials.');
            return false;
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Login failed. Please try again.';
          toast.error(message);
          return false;
        }
      },

      logout: async (): Promise<void> => {
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Always clear local state regardless of API call result
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });

          localStorage.removeItem('onya_operator_token');
          localStorage.removeItem('onya_operator_user');
          localStorage.removeItem('onya_notifications');
          
          socketService.disconnect();
          toast.success('Logged out successfully');
        }
      },

      verifyToken: async (): Promise<boolean> => {
        const token = localStorage.getItem('onya_operator_token');
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return false;
        }

        set({ isLoading: true });

        try {
          const response = await apiClient.verifyToken();
          
          if (response.success && response.data) {
            const user = response.data.user;
            
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem('onya_operator_user', JSON.stringify(user));
            return true;
          } else {
            get().clearAuth();
            return false;
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          get().clearAuth();
          return false;
        }
      },

      setUser: (user: User) => {
        set({ user });
        localStorage.setItem('onya_operator_user', JSON.stringify(user));
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
        localStorage.setItem('onya_operator_token', token);
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        localStorage.removeItem('onya_operator_token');
        localStorage.removeItem('onya_operator_user');
        socketService.disconnect();
      },
    }),
    {
      name: 'onya-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);