import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { useParams } from 'react-router-dom';
import { useRoomStore } from '../../stores/roomStore';

interface Friend {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

type InviteState = 'idle' | 'sending' | 'sent' | 'in_room';

export function InviteFriends({ onClose }: { onClose: () => void }) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [states, setStates] = useState<Record<string, InviteState>>({});
  const [inRoom, setInRoom] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    api.get<Friend[]>('/api/friends')
      .then(setFriends)
      .catch(() => setFriends([]));

    // Already-pending invites and current members drive the per-row button, so
    // reopening the modal never offers an invite that cannot be sent.
    api.get<any[]>('/api/invitations/sent')
      .then((rows) => {
        setStates(prev => {
          const next = { ...prev };
          for (const r of rows) next[r.inviteeId] = 'sent';
          return next;
        });
      })
      .catch(() => {});
  }, [roomCode]);

  // Room members are the inviter, so the player list is the source for "in room".
  const players = useRoomStore((s) => s.room?.players);
  useEffect(() => {
    setInRoom(new Set((players || []).map((p: any) => p.id ?? p.userId)));
  }, [players]);

  const rows = useMemo(
    () =>
      friends.map(f => ({
        ...f,
        inRoom: inRoom.has(f.id),
        state: inRoom.has(f.id) ? ('in_room' as const) : states[f.id] || ('idle' as const),
      })),
    [friends, inRoom, states]
  );

  const selectable = rows.filter(r => r.state === 'idle');
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (selected.size === 0 || !roomCode) return;
    setIsSending(true);
    setError('');
    try {
      const res = await api.post<{ sent: number; accepted: string[]; rejected: { reason: string }[] }>(
        '/api/invitations',
        { roomCode, inviteeIds: [...selected] }
      );

      setStates(prev => {
        const next = { ...prev };
        for (const id of res.accepted || []) next[id] = 'sent';
        return next;
      });
      setSelected(new Set());

      if (res.rejected?.length) {
        setError(
          `${res.sent} sent. Skipped: ${res.rejected
            .map(r => r.reason.replace(/_/g, ' '))
            .join(', ')}.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="space-y-4">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
            Lobby
          </span>
          <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
            Invite Friends
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 mt-1">
            Invitations expire after 30 minutes.
          </p>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {rows.length === 0 ? (
            <p className="text-zinc-500 text-xs font-mono text-center py-6">
              No friends available to invite.
            </p>
          ) : (
            rows.map(friend => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xs"
              >
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-black dark:accent-white"
                    checked={selected.has(friend.id)}
                    disabled={friend.state !== 'idle'}
                    onChange={() => toggle(friend.id)}
                  />
                  <Avatar
                    fallback={friend.displayName || '?'}
                    src={friend.avatarUrl ?? undefined}
                    size="sm"
                  />
                  <div>
                    <span className="text-black dark:text-white font-bold text-xs block">
                      {friend.displayName}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      {friend.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </label>

                {friend.state === 'in_room' ? (
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    In Room
                  </span>
                ) : friend.state === 'sent' ? (
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                    Invitation Sent
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSending}
                    onClick={() => setSelected(new Set([friend.id]))}
                    className="text-xs py-1 px-3"
                  >
                    Invite
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {error && (
          <p className="text-xs font-mono text-red-600 dark:text-red-400 font-bold">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0 || isSending}
            onClick={send}
            className="text-xs font-bold uppercase"
          >
            {isSending
              ? 'Sending...'
              : `Send Invitation${selected.size > 1 ? ` (${selected.size})` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
