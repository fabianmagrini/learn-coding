import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  isOnboarded: boolean;
  favoriteTeams?: string[];
  favoriteLeagues?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  setAuth: (user: User, token: string) => void;
  setOnboarded: (teams: string[], leagues: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isOnboarded: false,
      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token);
        set({
          user,
          token,
          isAuthenticated: true,
          isOnboarded: user.isOnboarded,
        });
      },
      setOnboarded: (teams, leagues) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, isOnboarded: true, favoriteTeams: teams, favoriteLeagues: leagues }
            : null,
          isOnboarded: true,
        })),
      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isOnboarded: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
