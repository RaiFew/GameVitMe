import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

type Relationship =
  | 'NOT_FRIENDS'
  | 'REQUEST_SENT'
  | 'REQUEST_RECEIVED'
  | 'FRIENDS'
  | 'BLOCKED';

interface SearchResult {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  relationship: Relationship;
  /** Present only when relationship is REQUEST_RECEIVED, for one-tap accept. */
  friendshipId?: string;
}

export function FriendSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get<SearchResult[]>(`/api/users/search?q=${encodeURIComponent(term)}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  /** Locally patches one row so the list reacts without a refetch. */
  const patch = (id: string, changes: Partial<SearchResult>) => {
    setResults(prev => prev.map(r => (r.id === id ? { ...r, ...changes } : r)));
  };

  const run = async (id: string, fn: () => Promise<unknown>, changes: Partial<SearchResult>) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      patch(id, changes);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  const addFriend = (id: string) =>
    run(id, () => api.post('/api/friends/request', { addresseeId: id }), {
      relationship: 'REQUEST_SENT',
    });

  const acceptFriend = (r: SearchResult) => {
    if (!r.friendshipId) return;
    return run(r.id, () => api.post('/api/friends/accept', { friendshipId: r.friendshipId }), {
      relationship: 'FRIENDS',
    });
  };

  const rejectFriend = (r: SearchResult) => {
    if (!r.friendshipId) return;
    return run(r.id, () => api.post('/api/friends/reject', { friendshipId: r.friendshipId }), {
      relationship: 'NOT_FRIENDS',
    });
  };

  const renderAction = (r: SearchResult) => {
    const busy = busyId === r.id;

    switch (r.relationship) {
      case 'FRIENDS':
        return (
          <Button size="sm" variant="outline" disabled className="text-xs py-1 px-3">
            Friends
          </Button>
        );
      case 'REQUEST_SENT':
        return (
          <Button size="sm" variant="outline" disabled className="text-xs py-1 px-3">
            Request Sent
          </Button>
        );
      case 'REQUEST_RECEIVED':
        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => acceptFriend(r)}
              className="text-xs py-1 px-3"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => rejectFriend(r)}
              className="text-xs py-1 px-3"
            >
              Reject
            </Button>
          </div>
        );
      case 'BLOCKED':
        return (
          <Button size="sm" variant="outline" disabled className="text-xs py-1 px-3">
            Blocked
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => addFriend(r.id)}
            className="text-xs py-1 px-3"
          >
            Add Friend
          </Button>
        );
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Type username or nickname..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setError('');
        }}
        className="font-mono text-xs"
      />

      {error && <p className="text-xs font-mono text-red-600 dark:text-red-400 font-bold">{error}</p>}

      <div className="space-y-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xs"
          >
            <div className="flex items-center gap-3">
              <Avatar fallback={user.displayName ?? '?'} src={user.avatarUrl ?? undefined} size="sm" />
              <div>
                <div className="text-black dark:text-white font-bold text-xs flex items-center gap-1.5">
                  {user.displayName}
                  {user.isOnline && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online" />
                  )}
                </div>
                <div className="text-zinc-500 text-[10px] font-mono">
                  @{user.username || user.displayName}
                </div>
              </div>
            </div>
            {renderAction(user)}
          </div>
        ))}
      </div>
    </div>
  );
}
