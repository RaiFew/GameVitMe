import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, clearUser } = useAuthStore();
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    // OAuth handoff: the API domain minted a single-use code and redirected us here.
    // Redeem it for a session token — the browser will not send the cross-site
    // session cookie, so this is the only way the token reaches the client.
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
      api.post('/api/auth/handoff', { code })
        .then((res) => {
          if (!mounted) return;
          const handoffUser = res?.user || res?.data?.user;
          if (handoffUser) setUser(handoffUser, res?.token || res?.data?.token);
        })
        .catch((err) => console.error('Auth handoff failed:', err))
        .finally(() => {
          if (mounted) setLocalLoading(false);
        });
      return;
    }

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

  const login = async () => {
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      if (!apiBase && window.location.hostname !== 'localhost') {
        alert('ยังไม่ได้เชื่อมต่อกับ Backend: ไม่พบค่า VITE_API_URL ในระบบ\nกรุณาเพิ่ม VITE_API_URL ใน Vercel แล้วกด Redeploy 1 ครั้งครับ');
        return;
      }
      const res = await api.post('/api/auth/sign-in/social', {
        provider: 'google',
        // Lands on the API domain on purpose: the session cookie is only readable
        // there. It hands back a code we exchange for the token.
        callbackURL: `${apiBase || window.location.origin}/auth/finish`,
      });
      const redirectUrl = res?.data?.url || res?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        console.error('No redirect URL returned by auth server', res);
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      const detail = err?.message || 'Network Error';
      alert(`ไม่สามารถเชื่อมต่อ Google Login ได้: ${detail}\nกรุณาตรวจสอบว่าเซิร์ฟเวอร์บน Railway รันอยู่และตั้งค่าตัวแปรถูกต้อง`);
    }
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
