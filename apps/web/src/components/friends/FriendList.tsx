import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';

export function FriendList({ onInvite }: { onInvite?: (id: string) => void }) {
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/friends').then(res => setFriends(res.data)).catch(() => {});
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
        <div key={f.id} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
          <div className="flex items-center gap-3">
            <Avatar fallback={f.displayName} src={f.avatarUrl} status={f.status} />
            <div>
              <span className="font-bold text-sm text-black dark:text-white block">{f.displayName}</span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">@{f.username || f.displayName}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            {f.status}
          </span>
        </div>
      ))}
    </div>
  );
}
