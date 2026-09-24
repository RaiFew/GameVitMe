import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useParams } from 'react-router-dom';

export function InviteFriends({ onClose }: { onClose: () => void }) {
  const [friends, setFriends] = useState<any[]>([]);
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  const { socket } = useSocket();
  const { roomCode } = useParams<{ roomCode: string }>();

  useEffect(() => {
    api.get('/api/friends').then(res => setFriends(res.data)).catch(() => {});
  }, []);

  const handleInvite = (friendId: string) => {
    socket?.emit('friend:invite_to_room', { friendId, roomCode });
    setInvited(prev => ({ ...prev, [friendId]: true }));
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="space-y-4">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Lobby</span>
          <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Invite Friends</h2>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {friends.length === 0 ? (
            <p className="text-zinc-500 text-xs font-mono text-center py-6">No friends available to invite.</p>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xs">
                <div className="flex items-center gap-3">
                  <Avatar fallback={friend.displayName} src={friend.avatarUrl} status={friend.status} size="sm" />
                  <div>
                    <span className="text-black dark:text-white font-bold text-xs block">{friend.displayName}</span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">{friend.status}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={invited[friend.id] ? 'outline' : 'primary'}
                  onClick={() => handleInvite(friend.id)}
                  disabled={invited[friend.id]}
                  className="text-xs py-1 px-3"
                >
                  {invited[friend.id] ? 'Invited' : 'Invite'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
