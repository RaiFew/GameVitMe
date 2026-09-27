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
      <div className="text-zinc-500 font-mono text-xs text-center py-12">
        No friends added yet. Search by username to connect.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar fallback={f.displayName ?? '?'} src={f.avatarUrl ?? undefined} size="sm" />
            <div>
              <span className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                {f.displayName}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${f.isOnline ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  title={f.isOnline ? 'Online' : 'Offline'}
                />
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                @{f.username || f.displayName} · {f.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {onInvite && (
            <button
              type="button"
              onClick={() => onInvite(f.id)}
              className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 rounded-xs hover:border-black dark:hover:border-white transition-colors"
            >
              Invite
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
