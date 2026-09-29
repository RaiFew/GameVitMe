import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';

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

  useEffect(() => {
    api.get<Friend[]>('/api/friends')
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  const removeFriend = async (f: Friend) => {
    if (!window.confirm(`Remove ${f.displayName} from your friends?`)) return;
    setRemoving(f.id);
    setError('');
    try {
      await api.delete(`/api/friends/${f.friendshipId}`);
      setFriends((prev) => prev.filter((x) => x.id !== f.id));
    } catch {
      setError(`Could not remove ${f.displayName}. Try again.`);
    } finally {
      setRemoving('');
    }
  };

  if (friends.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-body font-semibold text-ink">No friends yet</p>
        <p className="mt-1 text-body text-ink-muted">
          Find a player by name on the Add Friend tab to connect.
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
                  title={f.isOnline ? 'Online' : 'Offline'}
                />
              </span>
              <span className="text-[10px] font-mono text-ink-faint uppercase">
                @{f.username || f.displayName} · {f.isOnline ? 'Online' : 'Offline'}
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
                Invite
              </button>
            )}
            <button
              type="button"
              onClick={() => removeFriend(f)}
              disabled={removing === f.id}
              aria-label={`Remove ${f.displayName} from friends`}
              className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 border border-transparent text-ink-faint hover:text-danger hover:border-danger/40 rounded-xs transition-colors disabled:opacity-40"
            >
              {removing === f.id ? '…' : 'Remove'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
