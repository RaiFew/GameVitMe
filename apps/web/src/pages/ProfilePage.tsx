import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { useUserSettingsStore } from '../stores/userSettingsStore';
import { CodenamesLibraryCard } from '../components/profile/CodenamesLibraryCard';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { streamerMode, toggleStreamerMode } = useUserSettingsStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await api.put('/api/users/me', { displayName });
      setIsEditing(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl space-y-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
          Account Settings
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
          Profile
        </h1>
      </div>

      <Card className="flex flex-col items-center text-center p-8 border border-zinc-300 dark:border-zinc-800">
        <Avatar
          src={user.avatarUrl}
          fallback={user.displayName}
          size="lg"
          className="h-24 w-24 text-2xl mb-6"
        />

        {isEditing ? (
          <div className="flex flex-col gap-2 w-full max-w-xs mb-6">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-center font-mono"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} isLoading={isLoading} className="flex-1 text-xs">
                Save
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex-1 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
              {user.displayName}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-xs py-1 px-3">
              Edit
            </Button>
          </div>
        )}

        <div className="w-full text-left space-y-3 p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-xs">
          <div>
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider block">Username</span>
            <p className="text-black dark:text-white text-sm font-mono font-bold">@{(user as any).username || user.displayName}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider block">Email</span>
            <p className="text-black dark:text-white text-sm font-mono">{(user as any).email || 'Guest Player (No Email)'}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider block">Account Created</span>
            <p className="text-black dark:text-white text-sm font-mono">{new Date((user as any).createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Streamer Mode Privacy Setting */}
        <div className="w-full text-left p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-xs mt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
                Privacy & Broadcast
              </span>
              <h3 className="text-sm font-black uppercase tracking-tight text-black dark:text-white mt-0.5">
                Streamer Mode
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-1 max-w-sm">
                Always hides room join codes and QR codes across the site by default to prevent stream sniping.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleStreamerMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                streamerMode ? 'bg-black dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
              role="switch"
              aria-checked={streamerMode}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                  streamerMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-2 text-[10px] font-mono font-bold uppercase">
            Status:{' '}
            <span className={streamerMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}>
              {streamerMode ? 'ACTIVE (Codes & QR Hidden)' : 'OFF (Normal Display)'}
            </span>
          </div>
        </div>

        {/* Codenames Word Library Management */}
        <CodenamesLibraryCard />

        <Button variant="danger" className="mt-8 w-full text-xs" onClick={logout}>
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
