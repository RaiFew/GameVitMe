import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export default function LoginPage() {
  const { isAuthenticated, login, devLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromLocation = (location.state as any)?.from;
  const redirectTarget = fromLocation
    ? `${fromLocation.pathname || ''}${fromLocation.search || ''}`
    : '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await devLogin(name.trim() || undefined);
      navigate(redirectTarget);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center p-4">
      <Card className="w-full max-w-md p-8 border border-zinc-300 dark:border-zinc-800 text-center">
        <div className="w-10 h-10 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-mono font-bold text-sm mx-auto mb-6 rounded-xs">
          PG
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white mb-2">
          Sign In
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-8">
          Enter a nickname to play as guest or sign in with Google.
        </p>

        <form onSubmit={handleGuestLogin} className="space-y-4 text-left">
          <Input
            label="Player Nickname"
            placeholder="e.g. Maverick"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-center font-mono"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Entering Room...' : 'Play As Guest'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
            <span className="px-2 bg-white dark:bg-zinc-950 text-zinc-400">Or Continue With</span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={login}
          type="button"
          className="w-full flex items-center justify-center gap-2 text-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Google Account
        </Button>
      </Card>
    </div>
  );
}
export { LoginPage };
