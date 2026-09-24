import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, clearUser } = useAuthStore();
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const response = await api.get('/api/auth/get-session');
        const sessionUser = response?.data?.user || response?.user;
        if (mounted) {
          if (sessionUser) {
            setUser(sessionUser);
          } else if (!user) {
            clearUser();
          }
        }
      } catch (err) {
        if (mounted && !user) {
          clearUser();
        }
      } finally {
        if (mounted) setLocalLoading(false);
      }
    };

    fetchSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = () => {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const callback = encodeURIComponent(window.location.origin);
    window.location.href = `${apiBase}/api/auth/sign-in/social?provider=google&callbackURL=${callback}`;
  };

  const devLogin = async (displayName?: string) => {
    try {
      const res = await api.post('/api/auth/dev-login', { displayName });
      const loggedUser = res?.data?.user || res?.user;
      const token = res?.token || res?.data?.token;
      if (loggedUser) {
        setUser(loggedUser, token);
        return loggedUser;
      }
    } catch (err) {
      console.error('Dev login failed, using offline fallback', err);
      const fallback = {
        id: 'dev-' + Math.random().toString(36).substring(2, 9),
        displayName: displayName || 'Player ' + Math.floor(1000 + Math.random() * 9000),
      };
      setUser(fallback);
      return fallback;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/sign-out', {}).catch(() => {});
    } finally {
      clearUser();
      window.location.href = '/';
    }
  };

  return {
    user,
    isLoading: isLoading || localLoading,
    isAuthenticated,
    login,
    devLogin,
    logout,
  };
}
