import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export function FriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    api.get<any[]>('/api/friends/requests').then(setRequests).catch(() => {});
    api.get<any[]>('/api/friends/sent').then(setSent).catch(() => {});
  };

  useEffect(load, []);

  const handleAction = (id: string, accept: boolean) => {
    api.post(`/api/friends/${accept ? 'accept' : 'reject'}`, { friendshipId: id })
      .then(() => setRequests(prev => prev.filter(r => r.id !== id)))
      .catch((err) => setError(err.message || 'Failed to update request.'));
  };

  // Cancelling an outgoing request is a delete, not a reject: reject is
  // restricted to the addressee.
  const cancelSent = (id: string) => {
    api.delete(`/api/friends/${id}`)
      .then(() => setSent(prev => prev.filter(r => r.id !== id)))
      .catch((err) => setError(err.message || 'Failed to cancel request.'));
  };

  if (requests.length === 0 && sent.length === 0) {
    return (
      <div className="text-zinc-500 font-mono text-xs text-center py-12">
        No pending friend requests.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {error && (
        <p className="p-3 text-xs font-mono text-red-600 dark:text-red-400 font-bold">{error}</p>
      )}

      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar fallback={req.requester.displayName} />
            <div>
              <div className="text-black dark:text-white font-bold text-sm">
                {req.requester.displayName}
              </div>
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

      {sent.map((req) => (
        <div key={req.id} className="flex items-center justify-between p-4 opacity-70">
          <div className="flex items-center gap-3">
            <Avatar fallback={req.addressee.displayName} />
            <div>
              <div className="text-black dark:text-white font-bold text-sm">
                {req.addressee.displayName}
              </div>
              <div className="text-zinc-500 text-xs font-mono">Request sent · awaiting reply</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => cancelSent(req.id)}>
            Cancel
          </Button>
        </div>
      ))}
    </div>
  );
}
