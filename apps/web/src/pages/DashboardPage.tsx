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
import { useT } from '../stores/langStore';

const FEATURED_GAMES = [
  {
    id: 'spyfall',
    name: 'Spyfall',
    categoryKey: 'games.catSpyfall',
    players: '4–12 Players',
    descriptionKey: 'games.descSpyfall',
  },
  {
    id: 'werewolf',
    name: 'Werewolf',
    categoryKey: 'games.catWerewolf',
    players: '4–12 Players',
    descriptionKey: 'games.descWerewolf',
  },
  {
    id: 'salem',
    name: 'Salem 1692',
    categoryKey: 'games.catSalem',
    players: '4–12 Players',
    descriptionKey: 'games.descSalem',
  },
  {
    id: 'codenames',
    name: 'Codenames',
    categoryKey: 'games.catCodenamesShort',
    players: '2–20 Players',
    descriptionKey: 'games.descCodenames',
  },
  {
    id: 'rock-paper-scissors',
    name: 'Rock Paper Scissors',
    categoryKey: 'games.catRpsShort',
    players: '2–20 Players',
    descriptionKey: 'games.descRps',
  },
  {
    id: 'number-grid',
    name: 'Number Grid / Rush',
    categoryKey: 'games.catNumberGrid',
    players: '1–20 Players',
    descriptionKey: 'games.descNumberGrid',
  },
  {
    id: 'jigsaw',
    name: 'Jigsaw Puzzle',
    categoryKey: 'games.catJigsaw',
    players: '1–20 Players',
    descriptionKey: 'games.descJigsaw',
  },
] as const;

interface JoinFormProps {
  joinCode: string;
  setJoinCode: (value: string) => void;
  error: string;
  isLoading: boolean;
  onJoin: (e: React.FormEvent) => void;
  onScan: () => void;
}

/** Shared by the desktop join card and the mobile header modal. */
function JoinForm({ joinCode, setJoinCode, error, isLoading, onJoin, onScan }: JoinFormProps) {
  const t = useT();
  return (
    <div className="space-y-3">
      {error && (
        <div className="border border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-2.5 rounded-xs text-xs">
          {error}
        </div>
      )}

      <form onSubmit={onJoin} className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={t('dashboard.codePlaceholder')}
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
            }}
            className="uppercase text-center font-mono tracking-widest font-bold text-base"
            maxLength={5}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !joinCode.trim()}>
            {isLoading ? '...' : t('dashboard.join')}
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-2 text-xs"
          onClick={onScan}
          disabled={isLoading}
        >
          <Camera size={14} /> {t('dashboard.scanQr')}
        </Button>
      </form>
    </div>
  );
}

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
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (location.state?.info || location.state?.message) {
      setNotice(location.state.info || location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const executeJoin = async (targetCode: string, attemptedRecycle = false) => {
    if (!targetCode) {
      setError(t('dashboard.errNoCode'));
      return;
    }

    setIsLoading(true);
    setError('');

    const activeSocket = socketService.connect();

    const proceedWithJoin = () => {
      let resolved = false;

      const detach = () => {
        clearTimeout(timer);
        // Every one of these outlives the join unless it is torn down by hand.
        // Left attached they accumulate on the shared socket across retries, and
        // a stale room:state handler fires setRoom for a room the user has
        // already left.
        activeSocket.off('room:state', handleRoomState);
        activeSocket.off('room:joined', onJoined);
        activeSocket.off('room:error', onError);
      };

      const fail = (message: string) => {
        if (resolved) return;
        resolved = true;
        detach();
        setIsLoading(false);
        setError(message);
      };

      const finishJoin = (roomCodeStr: string, roomData?: any) => {
        if (resolved) return;
        resolved = true;
        detach();
        setIsLoading(false);
        if (roomData) setRoom(roomData);
        navigate(`/lobby/${roomCodeStr}`);
      };

      // A busy server can take a while to answer. The old 6s deadline fired
      // while the join was still in flight and told the user it had failed,
      // then the room they had actually joined appeared moments later.
      //
      // `attemptedRecycle` is threaded through as an argument rather than
      // reassigned here: it used to be a local variable, so the recursive call
      // started over with `false` and a failing join retried every 15 seconds
      // forever, spinner stuck, error never shown.
      const timer = setTimeout(
        () => {
          // A half-open upgrade leaves the socket claiming to be connected
          // while dropping everything sent on it. Recycling forces a fresh
          // handshake and one more attempt; only the second failure is real.
          if (!attemptedRecycle) {
            detach();
            socketService.recycle();
            executeJoin(targetCode, true);
            return;
          }
          fail(t('dashboard.errJoinTimeout'));
        },
        15000
      );

      const onJoined = (data: any) => finishJoin(data?.roomCode || targetCode, data?.room);

      const handleRoomState = (roomData: any) => {
        if (roomData?.code === targetCode || roomData?.room?.code === targetCode) {
          finishJoin(targetCode, roomData?.room || roomData);
        }
      };

      const onError = (err: any) => fail(err?.message || t('dashboard.errJoinFailed'));

      activeSocket.on('room:state', handleRoomState);
      activeSocket.once('room:joined', onJoined);
      activeSocket.once('room:error', onError);

      // Listeners are attached before the emit so an ack cannot beat them.
      activeSocket.emit(
        'room:join',
        { roomCode: targetCode, code: targetCode },
        (res: any) => {
          if (res?.error) fail(res.error);
          else if (res?.success || res?.room) finishJoin(res?.roomCode || targetCode, res?.room);
          else fail(t('dashboard.errJoinFailed'));
        }
      );
    };

    if (activeSocket.connected) {
      proceedWithJoin();
    } else {
      const connectTimeout = setTimeout(() => {
        setIsLoading(false);
        setError(t('dashboard.errConnectTimeout'));
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

  const handleCodeChange = (value: string) => {
    setJoinCode(value);
    if (error) setError('');
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
        const list = Array.isArray(res) ? res : [];
        setFriends(list);
      })
      .catch(() => setFriends([]));

    api.get('/api/games')
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setGames(list);
      })
      .catch(() => setGames([]));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10">
      {/* Header Profile Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rule pb-6">
        <div className="flex items-center gap-4">
          <Avatar fallback={user?.displayName || 'Player'} src={user?.avatarUrl} size="lg" />
          <div>
            <span className="text-[10px] uppercase tracking-widest font-mono text-ink-muted font-bold">
              {t('dashboard.playerHub')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink">
              {user?.displayName || 'Player'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/friends">
            <Button variant="secondary" size="sm">
              <Users size={14} className="mr-1.5" /> {t('dashboard.friends')}
            </Button>
          </Link>
          {/* Stands in for the join card, which is hidden on mobile. */}
          <Button
            variant="secondary"
            size="sm"
            className="sm:hidden"
            onClick={() => setShowJoinModal(true)}
          >
            <LogIn size={14} className="mr-1.5" /> {t('dashboard.joinRoom')}
          </Button>
          <Link to="/room/create">
            <Button size="sm">
              <Plus size={14} className="mr-1.5" /> {t('dashboard.createRoom')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Disband / Room Exit Notification */}
      {notice && (
        <div className="border border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-4 rounded-xs text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">{t('dashboard.notice')}</span>
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

      {/* Primary Actions Grid — the header buttons replace these on mobile. */}
      <div className="hidden sm:grid md:grid-cols-2 gap-6">
        {/* Create Room Card */}
        <Card
          className="flex flex-col justify-between p-8 border-2 border-rule-strong hover:bg-canvas-sunk/60 transition-colors cursor-pointer"
          onClick={() => navigate('/room/create')}
        >
          <div>
            <div className="w-10 h-10 border border-rule-strong flex items-center justify-center font-mono font-bold text-sm mb-6 rounded-xs">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-ink mb-2">
              {t('dashboard.createNewRoom')}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed mb-6">
              {t('dashboard.createNewRoomBody')}
            </p>
          </div>
          <Button className="w-full text-xs">
            {t('dashboard.startRoom')} <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>

        {/* Join Room Card */}
        <Card className="flex flex-col justify-between p-8 border border-rule">
          <div>
            <div className="w-10 h-10 border border-ink/40 flex items-center justify-center font-mono font-bold text-sm mb-6 rounded-xs">
              <LogIn size={20} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-ink mb-2">
              {t('dashboard.joinExistingRoom')}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed mb-6">
              {t('dashboard.joinExistingRoomBody')}
            </p>

            <JoinForm
              joinCode={joinCode}
              setJoinCode={handleCodeChange}
              error={error}
              isLoading={isLoading}
              onJoin={handleJoin}
              onScan={() => setShowScanner(true)}
            />
          </div>
        </Card>
      </div>

      {/* Bottom Section: Games & Friends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Available Games */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
              {t('dashboard.featuredGames')}
            </span>
            <Link to="/games" className="text-xs font-mono text-ink-muted hover:text-ink">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          <div className="space-y-3">
            {FEATURED_GAMES.map((game) => (
              <Card
                key={game.id}
                className="p-5 border border-rule hover:border-rule-strong transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-black uppercase text-ink">
                      {game.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border border-rule bg-canvas-sunk text-ink">
                      {t(game.categoryKey)}
                    </span>
                    <span className="text-[10px] font-mono text-ink-faint">
                      {game.players}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {t(game.descriptionKey)}
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
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
              {t('dashboard.friendsOnline', { count: friends.filter((f) => f.isOnline).length })}
            </span>
            <Link to="/friends" className="text-xs font-mono text-ink-muted hover:text-ink">
              {t('dashboard.manage')}
            </Link>
          </div>

          <Card className="p-4 border border-rule">
            {friends.length === 0 ? (
              <div className="text-center py-6 text-xs text-ink-muted font-mono">
                {t('dashboard.noFriends')}
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {friends.slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar fallback={f.displayName} src={f.avatarUrl} status={f.status} size="sm" />
                      <span className="font-semibold text-ink truncate">
                        {f.displayName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-faint uppercase">
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Mobile Join Modal — the join card is hidden below sm */}
      {showJoinModal && (
        <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)}>
          <div className="space-y-4">
            <h3 className="text-title font-black tracking-tight text-ink">{t('dashboard.mobileJoinTitle')}</h3>
            <p className="text-label text-ink-muted">
              {t('dashboard.mobileJoinBody')}
            </p>
            <JoinForm
              joinCode={joinCode}
              setJoinCode={handleCodeChange}
              error={error}
              isLoading={isLoading}
              onJoin={handleJoin}
              onScan={() => {
                setShowJoinModal(false);
                setShowScanner(true);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setShowJoinModal(false)}
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {/* QR Code Scanner Modal */}
      {showScanner && (
        <Modal isOpen={showScanner} onClose={() => setShowScanner(false)}>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-black uppercase text-ink">
              {t('dashboard.scanQrTitle')}
            </h3>
            <div id="dashboard-reader" className="w-full overflow-hidden border border-rule rounded-xs" />
            <Button variant="secondary" size="sm" onClick={() => setShowScanner(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
