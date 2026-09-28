import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Gamepad2, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { socketService } from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';

interface Invitation {
  id: string;
  roomCode?: string;
  roomName?: string | null;
  gameType: string;
  inviterName: string;
  expiresAt: string;
}

/**
 * Invitations are already durable on the server, so the poll is the source of
 * truth and the socket events only tell us to re-poll. That also covers a tab
 * that was open before the invite arrived.
 */
const POLL_MS = 30_000;

export function NotificationBell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [inv, req] = await Promise.all([
        api.get<Invitation[]>('/api/invitations'),
        api.get<any[]>('/api/friends/requests'),
      ]);
      setInvitations(inv ?? []);
      setRequests(req ?? []);
    } catch {
      // A failed poll just leaves the last known list on screen.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
    if (!isAuthenticated) return;

    const socket = socketService.getSocket();
    const refresh = () => load();
    socket?.on('invitation:received', refresh);
    socket?.on('friend:request_received', refresh);

    const t = setInterval(load, POLL_MS);
    return () => {
      socket?.off('invitation:received', refresh);
      socket?.off('friend:request_received', refresh);
      clearInterval(t);
    };
  }, [load, isAuthenticated]);

  const respond = async (inv: Invitation, accept: boolean) => {
    setBusyId(inv.id);
    setError('');
    try {
      if (accept) {
        const res = await api.post<{ roomCode: string }>('/api/invitations/accept', {
          invitationId: inv.id,
        });
        setInvitations(prev => prev.filter(i => i.id !== inv.id));
        // The dashboard already handles ?join=CODE, so accepting is one hop.
        if (res?.roomCode) navigate(`/dashboard?join=${encodeURIComponent(res.roomCode)}`);
        return;
      }
      await api.post('/api/invitations/decline', { invitationId: inv.id });
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
    } catch (err: any) {
      setError(err.message || 'Could not update the invitation.');
    } finally {
      setBusyId(null);
    }
  }

  const count = invitations.length + requests.length;
  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label={`Notifications (${count})`}
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-600 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xs shadow-xl z-50">
            {count === 0 ? (
              <p className="p-4 text-xs font-mono text-zinc-500 text-center">Nothing new.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {error && (
                  <p className="p-3 text-xs font-mono text-red-600 dark:text-red-400 font-bold">
                    {error}
                  </p>
                )}

                {invitations.map(inv => (
                  <div key={inv.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Gamepad2 size={14} className="mt-0.5 shrink-0 text-zinc-500" />
                      <div className="text-xs">
                        <span className="font-bold text-black dark:text-white">{inv.inviterName}</span>{' '}
                        <span className="text-zinc-600 dark:text-zinc-400">
                          invited you to {inv.roomName || inv.roomCode}
                        </span>
                        <div className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">
                          {inv.gameType.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pl-6">
                      <Button
                        size="sm"
                        disabled={busyId === inv.id}
                        onClick={() => respond(inv, true)}
                        className="text-[10px] py-1 px-3"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === inv.id}
                        onClick={() => respond(inv, false)}
                        className="text-[10px] py-1 px-3"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}

                {requests.map(req => (
                  <button
                    key={req.id}
                    onClick={() => {
                      setOpen(false);
                      navigate('/friends?tab=requests');
                    }}
                    className="w-full text-left p-3 flex items-start gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                  >
                    <UserPlus size={14} className="mt-0.5 shrink-0 text-zinc-500" />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-bold text-black dark:text-white">
                        {req.requester?.displayName || req.requester?.name || 'Someone'}
                      </span>{' '}
                      sent you a friend request
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
