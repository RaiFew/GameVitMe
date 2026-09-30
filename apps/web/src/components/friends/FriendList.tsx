import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { useT } from '../../stores/langStore';

interface Friend {
  id: string;
  friendshipId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export function FriendList({ onInvite }: { onInvite?: (id: string) => void }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [removing, setRemoving] = useState('');
  const [error, setError] = useState('');
  const t = useT();

  useEffect(() => {
    api.get<Friend[]>('/api/friends')
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  const removeFriend = async (f: Friend) => {
    if (!window.confirm(t('friends.removeConfirm', { name: f.displayName ?? '' }))) return;
    setRemoving(f.id);
    setError('');
    try {
      await api.delete(`/api/friends/${f.friendshipId}`);
      setFriends((prev) => prev.filter((x) => x.id !== f.id));
    } catch {
      setError(t('friends.removeFailed', { name: f.displayName ?? '' }));
    } finally {
      setRemoving('');
    }
  };

  if (friends.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-body font-semibold text-ink">{t('friends.emptyTitle')}</p>
        <p className="mt-1 text-body text-ink-muted">
          {t('friends.emptyBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-rule">
      {error && <p className="px-4 py-3 text-label text-danger">{error}</p>}
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between p-4 hover:bg-canvas-sunk transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar fallback={f.displayName ?? '?'} src={f.avatarUrl ?? undefined} size="sm" />
            <div>
              <span className="font-bold text-sm text-ink flex items-center gap-2">
                {f.displayName}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${f.isOnline ? 'bg-success' : 'bg-rule'}`}
                  title={f.isOnline ? t('friends.online') : t('friends.offline')}
                />
              </span>
              <span className="text-[10px] font-mono text-ink-faint uppercase">
                @{f.username || f.displayName} · {f.isOnline ? t('friends.online') : t('friends.offline')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onInvite && (
              <button
                type="button"
                onClick={() => onInvite(f.id)}
                className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 border border-rule rounded-xs hover:border-rule-strong transition-colors"
              >
                {t('friends.invite')}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeFriend(f)}
              disabled={removing === f.id}
              aria-label={t('friends.removeAria', { name: f.displayName ?? '' })}
              className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 border border-transparent text-ink-faint hover:text-danger hover:border-danger/40 rounded-xs transition-colors disabled:opacity-40"
            >
              {removing === f.id ? '…' : t('friends.remove')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
