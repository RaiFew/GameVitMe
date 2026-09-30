import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useT } from '../../stores/langStore';

export function FriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [error, setError] = useState('');
  const t = useT();

  const load = () => {
    api.get<any[]>('/api/friends/requests').then(setRequests).catch(() => {});
    api.get<any[]>('/api/friends/sent').then(setSent).catch(() => {});
  };

  useEffect(load, []);

  const handleAction = (id: string, accept: boolean) => {
    api.post(`/api/friends/${accept ? 'accept' : 'reject'}`, { friendshipId: id })
      .then(() => setRequests(prev => prev.filter(r => r.id !== id)))
      .catch((err) => setError(err.message || t('friends.errUpdate')));
  };

  // Cancelling an outgoing request is a delete, not a reject: reject is
  // restricted to the addressee.
  const cancelSent = (id: string) => {
    api.delete(`/api/friends/${id}`)
      .then(() => setSent(prev => prev.filter(r => r.id !== id)))
      .catch((err) => setError(err.message || t('friends.errCancel')));
  };

  // The server projects displayName, but a missing user row would otherwise
  // throw here and blank the whole tab.
  const nameOf = (r: any) => r?.displayName || r?.name || 'Player';

  if (requests.length === 0 && sent.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-body font-semibold text-ink">{t('friends.requestsEmptyTitle')}</p>
        <p className="mt-1 text-body text-ink-muted">
          {t('friends.requestsEmptyBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-rule">
      {error && (
        <p className="p-3 text-xs font-mono text-red-600 dark:text-red-400 font-bold">{error}</p>
      )}

      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar fallback={nameOf(req.requester)} src={req.requester?.avatarUrl ?? undefined} />
            <div>
              <div className="text-ink font-bold text-sm">
                {nameOf(req.requester)}
              </div>
              <div className="text-ink-muted text-xs font-mono">{t('friends.wantsToConnect')}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleAction(req.id, true)}>
              {t('friends.accept')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleAction(req.id, false)}>
              {t('friends.decline')}
            </Button>
          </div>
        </div>
      ))}

      {sent.map((req) => (
        <div key={req.id} className="flex items-center justify-between p-4 opacity-70">
          <div className="flex items-center gap-3">
            <Avatar fallback={nameOf(req.addressee)} src={req.addressee?.avatarUrl ?? undefined} />
            <div>
              <div className="text-ink font-bold text-sm">
                {nameOf(req.addressee)}
              </div>
              <div className="text-ink-muted text-xs font-mono">{t('friends.sentAwaiting')}</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => cancelSent(req.id)}>
            {t('common.cancel')}
          </Button>
        </div>
      ))}
    </div>
  );
}
