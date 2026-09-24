import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string;
  username?: string;
  email?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: any, token?: string | null) => void;
  clearUser: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      setUser: (user, token) => {
        const currentToken = token !== undefined ? token : get().token;
        set({
          user: user
            ? {
                id: user.id,
                displayName: user.displayName || user.name || 'Player',
                avatarUrl: user.avatarUrl || user.image,
                username: user.username,
                email: user.email,
                isGuest: user.isGuest,
              }
            : null,
          token: currentToken,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },
      clearUser: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'party-auth-storage',
    }
  )
);
