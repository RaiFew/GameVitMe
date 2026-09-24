import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Plus, LogIn, Users, Camera, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { socketService } from '../lib/socket';
import { useRoomStore } from '../stores/roomStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Html5QrcodeScanner } from 'html5-qrcode';

const FEATURED_GAMES = [
  {
    id: 'spyfall',
    name: 'Spyfall',
    category: 'Social Deduction',
    players: '4–12 Players',
    description: 'Find the secret spy without giving away the secret location.',
  },
  {
    id: 'werewolf',
    name: 'Werewolf',
    category: 'Hidden Roles',
    players: '4–12 Players',
    description: 'Villagers and special roles uncover hidden werewolves before it is too late.',
  },
  {
    id: 'salem',
    name: 'Salem 1692',
    category: 'Witch Trials',
    players: '4–12 Players',
    description: 'Accuse and defend against hidden witches with moderator host screen.',
  },
  {
    id: 'codenames',
    name: 'Codenames',
    category: 'Word Teams & 2P Co-op',
    players: '2–20 Players',
    description: 'Deduce word cards via Spymaster clues. Supports 2-Player Co-op and custom words.',
  },
  {
    id: 'rock-paper-scissors',
    name: 'Rock Paper Scissors',
    category: 'Arcade Duel & BR',
    players: '2–20 Players',
    description: '1v1 Fighting Game duel, TV Host mode, Battle Royale elimination & Points Race.',
  },
  {
    id: 'number-grid',
    name: 'Number Grid / Rush',
    category: 'Speedrun & Reflex',
    players: '1–20 Players',
    description: 'Click numbered circles in ascending order from 2x2 to 10x10. Features custom rounds & damage modes.',
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { setRoom } = useRoomStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [joinCode, setJoinCode] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.info || location.state?.message) {
      setNotice(location.state.info || location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const executeJoin = async (targetCode: string) => {
    if (!targetCode) {
      setError('Please enter a room code');
      return;
    }

    setIsLoading(true);
    setError('');

    const activeSocket = socketService.connect();

    const proceedWithJoin = () => {
      let resolved = false;

      const finishJoin = (roomCodeStr: string, roomData?: any) => {
        if (resolved) return;
        resolved = true;
        setIsLoading(false);
        if (roomData) setRoom(roomData);
        navigate(`/lobby/${roomCodeStr}`);
      };

      const timer = setTimeout(() => {
        if (!resolved) {
          setIsLoading(false);
          setError('Room join request timed out. Please check room code.');
        }
      }, 6000);

      activeSocket.emit(
        'room:join',
        { roomCode: targetCode, code: targetCode },
        (res: any) => {
          clearTimeout(timer);
          if (res?.error) {
            setError(res.error);
            setIsLoading(false);
          } else if (res?.success || res?.room) {
            finishJoin(res?.roomCode || targetCode, res?.room);
          }
        }
      );

      activeSocket.once('room:joined', (data: any) => {
        clearTimeout(timer);
        finishJoin(data?.roomCode || targetCode, data?.room);
      });

      const handleRoomState = (roomData: any) => {
        if (roomData?.code === targetCode || roomData?.room?.code === targetCode) {
          clearTimeout(timer);
          activeSocket.off('room:state', handleRoomState);
          finishJoin(targetCode, roomData?.room || roomData);
        }
      };
      activeSocket.on('room:state', handleRoomState);

      activeSocket.once('room:error', (err: any) => {
        clearTimeout(timer);
        activeSocket.off('room:state', handleRoomState);
        setError(err?.message || 'Failed to join room');
        setIsLoading(false);
      });
    };

    if (activeSocket.connected) {
      proceedWithJoin();
    } else {
      const connectTimeout = setTimeout(() => {
        setIsLoading(false);
        setError('Connecting to game server timed out.');
      }, 5000);

      activeSocket.once('connect', () => {
        clearTimeout(connectTimeout);
        proceedWithJoin();
      });
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeJoin(joinCode.trim().toUpperCase());
  };

  useEffect(() => {
    const codeParam = searchParams.get('join');
    if (codeParam) {
      const codeUpper = codeParam.toUpperCase();
      setJoinCode(codeUpper);
      executeJoin(codeUpper);
    }
  }, [searchParams]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        'dashboard-reader',
        { qrbox: { width: 220, height: 220 }, fps: 5 },
        false
      );
      scanner.render(
        (text) => {
          scanner.clear();
          const match = text.match(/(?:join\/|[?&]join=)([A-Za-z0-9]+)/);
          const scannedCode = match ? match[1] : text;
          setJoinCode(scannedCode ? scannedCode.toUpperCase() : '');
          setShowScanner(false);
        },
        () => {}
      );
      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [showScanner]);

  useEffect(() => {
    api.get('/api/friends')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setFriends(list);
      })
      .catch(() => setFriends([]));

    api.get('/api/games')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setGames(list);
      })
      .catch(() => setGames([]));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10">
      {/* Header Profile Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <Avatar fallback={user?.displayName || 'Player'} src={user?.avatarUrl} size="lg" />
          <div>
            <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 font-bold">
              Player Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white">
              {user?.displayName || 'Player'}
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to="/friends">
            <Button variant="secondary" size="sm">
              <Users size={14} className="mr-1.5" /> Friends
            </Button>
          </Link>
          <Link to="/room/create">
            <Button size="sm">
              <Plus size={14} className="mr-1.5" /> Create Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Disband / Room Exit Notification */}
      {notice && (
        <div className="border border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-4 rounded-xs text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">NOTICE:</span>
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-black dark:hover:text-white px-2 py-0.5 ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Room Card */}
        <Card
          className="flex flex-col justify-between p-8 border-2 border-black dark:border-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer"
          onClick={() => navigate('/room/create')}
        >
          <div>
            <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center font-mono font-bold text-sm mb-6 rounded-xs">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white mb-2">
              Create New Room
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
              Start an official room as Host (TV / Screen Mode) or join together with 4–12 players.
            </p>
          </div>
          <Button className="w-full text-xs">
            Start Room <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>

        {/* Join Room Card */}
        <Card className="flex flex-col justify-between p-8 border border-zinc-300 dark:border-zinc-800">
          <div>
            <div className="w-10 h-10 border border-zinc-400 dark:border-zinc-600 flex items-center justify-center font-mono font-bold text-sm mb-6 rounded-xs">
              <LogIn size={20} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white mb-2">
              Join Existing Room
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
              Enter a 5-character room code or scan your host screen QR code.
            </p>

            {error && (
              <div className="border border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-2.5 rounded-xs text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="CODE"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  className="uppercase text-center font-mono tracking-widest font-bold text-base"
                  maxLength={5}
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !joinCode.trim()}>
                  {isLoading ? '...' : 'Join'}
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-xs"
                onClick={() => setShowScanner(true)}
                disabled={isLoading}
              >
                <Camera size={14} /> Scan QR Code
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Games & Friends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Available Games */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              Featured Games
            </span>
            <Link to="/games" className="text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {FEATURED_GAMES.map((game) => (
              <Card
                key={game.id}
                className="p-5 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-black uppercase text-black dark:text-white">
                      {game.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                      {game.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {game.players}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {game.description}
                  </p>
                </div>
                <Link to={`/room/create?game=${game.id}`} className="shrink-0 w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto text-xs">
                    Create Room
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Friends Status Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              Friends Online ({friends.filter((f) => f.status === 'online').length})
            </span>
            <Link to="/friends" className="text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white">
              Manage →
            </Link>
          </div>

          <Card className="p-4 border border-zinc-200 dark:border-zinc-800">
            {friends.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                No friends added yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {friends.slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar fallback={f.displayName} src={f.avatarUrl} status={f.status} size="sm" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {f.displayName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      {showScanner && (
        <Modal isOpen={showScanner} onClose={() => setShowScanner(false)}>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-black uppercase text-black dark:text-white">
              Scan Room QR Code
            </h3>
            <div id="dashboard-reader" className="w-full overflow-hidden border border-zinc-300 dark:border-zinc-700 rounded-xs" />
            <Button variant="secondary" size="sm" onClick={() => setShowScanner(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
