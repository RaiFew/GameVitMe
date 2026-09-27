import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

export function FriendSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim()) {
        api.get<any[]>(`/api/users/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => {});
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const addFriend = async (id: string) => {
    try {
      await api.post('/api/friends/request', { addresseeId: id });
      setSentMap(prev => ({ ...prev, [id]: true }));
    } catch (err: any) {
      setError(err.message || 'Failed to send friend request.');
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Type username or nickname..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="font-mono text-xs"
      />

      {error && <p className="text-xs font-mono text-red-600 dark:text-red-400 font-bold">{error}</p>}

      <div className="space-y-2">
        {results.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xs">
            <div className="flex items-center gap-3">
              <Avatar fallback={user.displayName} size="sm" />
              <div>
                <div className="text-black dark:text-white font-bold text-xs">{user.displayName}</div>
                <div className="text-zinc-500 text-[10px] font-mono">@{user.username || user.displayName}</div>
              </div>
            </div>
            <Button
              size="sm"
              variant={sentMap[user.id] ? "outline" : "primary"}
              onClick={() => addFriend(user.id)}
              disabled={sentMap[user.id]}
              className="text-xs py-1 px-3"
            >
              {sentMap[user.id] ? 'Sent' : 'Add'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
