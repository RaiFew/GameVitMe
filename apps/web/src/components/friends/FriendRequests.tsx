import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export function FriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/friends/requests').then(res => setRequests(res.data)).catch(() => {});
  }, []);

  const handleAction = (id: string, accept: boolean) => {
    api.post(`/api/friends/${accept ? 'accept' : 'reject'}`, { requestId: id }).then(() => {
      setRequests(prev => prev.filter(r => r.id !== id));
    });
  };

  if (requests.length === 0) {
    return (
      <div className="text-zinc-500 font-mono text-xs text-center py-12">
        No pending friend requests.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar fallback={req.from.displayName} />
            <div>
              <div className="text-black dark:text-white font-bold text-sm">{req.from.displayName}</div>
              <div className="text-zinc-500 text-xs font-mono">Wants to connect</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleAction(req.id, true)}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleAction(req.id, false)}>
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
