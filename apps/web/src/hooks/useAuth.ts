import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

/**
 * Where to send the user once they are authenticated. Survives the Google
 * redirect, which is a full page load through the API domain.
 */
export const PENDING_REDIRECT_KEY = 'auth:next';

/** Reads and clears the pending destination. One-shot by design. */
export function takePendingRedirect(): string | null {
  const next = sessionStorage.getItem(PENDING_REDIRECT_KEY);
  if (!next) return null;
  sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  return next;
}

/** Same-origin absolute paths only -- never let a redirect leave the app. */
function safeNextPath(next: string | undefined | null): string | null {
  if (!next || !next.startsWith('/')) return null;
  if (next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/**
 * Redeems the one-time code left in the URL by the API domain after Google login.
 * Must be mounted at the app root: it depends on `?code=` surviving the redirect,
 * and pages like HomePage never call useAuth, so a page-level hook would miss it.
 */
export function useAuthHandoff() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;

    // The destination survived the OAuth round trip as `next`; stash it so the
    // app can send the freshly-authenticated visitor where they were headed.
    const next = url.searchParams.get('next');
    if (next) sessionStorage.setItem(PENDING_REDIRECT_KEY, next);

    url.searchParams.delete('code');
    url.searchParams.delete('next');
    window.history.replaceState({}, '', url.toString());

    api.post<{ user: any; token: string }>('/api/auth/handoff', { code })
      .then((res) => {
        if (res?.user) setUser(res.user, res.token);
      })
      .catch((err) => console.error('Auth handoff failed:', err));
  }, [setUser]);
}

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, clearUser } = useAuthStore();
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      // Read live store state, not the mount-time closure: the root-level handoff
      // may have landed a session while this request was in flight, and clobbering
      // it here would log the user straight back out.
      const hasUser = () => !!useAuthStore.getState().user;
      try {
        const response = await api.get<any>('/api/auth/get-session');
        const sessionUser = response?.user;
        if (mounted) {
          if (sessionUser) {
            setUser(sessionUser);
          } else if (!hasUser()) {
            clearUser();
          }
        }
      } catch (err) {
        if (mounted && !hasUser()) {
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

  const login = async (redirectTo?: string) => {
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      if (!apiBase && window.location.hostname !== 'localhost') {
        alert('ยังไม่ได้เชื่อมต่อกับ Backend: ไม่พบค่า VITE_API_URL ในระบบ\nกรุณาเพิ่ม VITE_API_URL ใน Vercel แล้วกด Redeploy 1 ครั้งครับ');
        return;
      }
      const next = safeNextPath(redirectTo);
      if (next) sessionStorage.setItem(PENDING_REDIRECT_KEY, next);

      const res = await api.post<{ url?: string }>('/api/auth/sign-in/social', {
        provider: 'google',
        // Lands on the API domain on purpose: the session cookie is only readable
        // there. It hands back a code we exchange for the token, and `next` is
        // echoed back so an invite link is not lost across the redirect.
        callbackURL: next
          ? `${apiBase || window.location.origin}/auth/finish?next=${encodeURIComponent(next)}`
          : `${apiBase || window.location.origin}/auth/finish`,
      });
      const redirectUrl = res?.url;
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
      const res = await api.post<{ user: any; token: string }>('/api/auth/dev-login', { displayName });
      if (res?.user) {
        setUser(res.user, res.token);
        return res.user;
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
