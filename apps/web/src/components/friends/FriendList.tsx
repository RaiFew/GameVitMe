import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';

interface Friend {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export function FriendList({ onInvite }: { onInvite?: (id: string) => void }) {
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    api.get<Friend[]>('/api/friends')
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

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
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar fallback={f.displayName ?? '?'} src={f.avatarUrl ?? undefined} size="sm" />
            <div>
              <span className="font-bold text-sm text-ink flex items-center gap-2">
                {f.displayName}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${f.isOnline ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  title={f.isOnline ? 'Online' : 'Offline'}
                />
              </span>
              <span className="text-[10px] font-mono text-ink-faint uppercase">
                @{f.username || f.displayName} · {f.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {onInvite && (
            <button
              type="button"
              onClick={() => onInvite(f.id)}
              className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 border border-rule rounded-xs hover:border-rule-strong transition-colors"
            >
              Invite
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
