import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../stores/roomStore';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// One table, so the option text, the Max Players input and the value actually
// sent to the server cannot drift apart. The ceiling mirrors room.handler.ts:
// only the big-room games go to 20, everything else is capped at 13.
const MIN_PLAYERS_BY_GAME: Record<string, number> = {
  'number-grid': 1,
  jigsaw: 1,
  codenames: 2,
  'rock-paper-scissors': 2,
  'music-quiz': 2,
};
const BIG_ROOM_GAMES = new Set(['number-grid', 'jigsaw', 'codenames', 'rock-paper-scissors', 'music-quiz']);
const playerRange = (gameId: string): [number, number] => [
  MIN_PLAYERS_BY_GAME[gameId] ?? 4,
  BIG_ROOM_GAMES.has(gameId) ? 20 : 13,
];

export function CreateRoomPage() {
  const [searchParams] = useSearchParams();
  const initialGame = searchParams.get('game') || 'spyfall';

  const [games, setGames] = useState<any[]>([
    { id: 'spyfall', name: 'Spyfall' },
    { id: 'werewolf', name: 'Werewolf' },
    { id: 'salem', name: 'Salem 1692' },
    { id: 'codenames', name: 'Codenames' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors' },
    { id: 'number-grid', name: 'Number Grid' },
    { id: 'jigsaw', name: 'Jigsaw Puzzle' },
    { id: 'music-quiz', name: 'Music Quiz' },
  ]);
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [roomName, setRoomName] = useState('');
  const [hostMode, setHostMode] = useState<'HOST' | 'NO_HOST'>('HOST');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isHostForced = selectedGame === 'werewolf' || selectedGame === 'salem';
  const isCodenames = selectedGame === 'codenames';
  const isRPS = selectedGame === 'rock-paper-scissors';
  const isNumberGrid = selectedGame === 'number-grid';
  const isJigsaw = selectedGame === 'jigsaw';
  const isMusicQuiz = selectedGame === 'music-quiz';
  // Every one of these puts the host in the game as a player, so Host/TV Mode is
  // not a choice — offering it just made the page look unresponsive.
  const isAllPlay = isCodenames || isNumberGrid || isJigsaw || isMusicQuiz;
  const [minPlayers, maxPlayerCount] = playerRange(selectedGame);

  useEffect(() => {
    if (isHostForced) {
      setHostMode('HOST');
    } else if (isAllPlay) {
      setHostMode('NO_HOST');
    }
  }, [selectedGame, isHostForced, isAllPlay]);

  // Switching to a game with a tighter ceiling has to pull the field back into
  // range, or submitting silently clamps it and the box disagrees with the server.
  useEffect(() => {
    setMaxPlayers((n) => Math.min(Math.max(n, minPlayers), maxPlayerCount));
  }, [minPlayers, maxPlayerCount]);

  const { socket, isConnected } = useSocket();
  const { setRoom } = useRoomStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/games')
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        if (list.length === 0) return;
        setGames(list);
        // Reconcile against the list the server actually serves, not against the
        // URL. A `?game=` the server does not know would otherwise leave the
        // select holding a value with no matching option, and the browser would
        // quietly show the first game instead — URL saying jigsaw, box saying
        // Spyfall, nothing on screen wrong enough to notice.
        setSelectedGame((cur) => (list.some((g: any) => g.id === cur) ? cur : list[0].id));
      })
      .catch(() => {});
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const targetGame = selectedGame || 'spyfall';
    const targetName =
      roomName.trim() ||
      (targetGame === 'salem'
        ? 'Salem Settlement'
        : targetGame === 'werewolf'
        ? 'Werewolf Village'
        : targetGame === 'codenames'
        ? 'Codenames Operation'
        : targetGame === 'number-grid'
        ? 'Number Rush Arena'
        : targetGame === 'rock-paper-scissors'
        ? 'RPS Battle Arena'
        : targetGame === 'jigsaw'
        ? 'Jigsaw Table'
        : targetGame === 'music-quiz'
        ? 'Music Quiz Night'
        : 'My Party Room');
    const [lo, hi] = playerRange(targetGame);
    const clampedPlayers = Math.min(Math.max(maxPlayers, lo), hi);
    const isHostMode = isHostForced ? true : isAllPlay ? false : hostMode === 'HOST';

    let resolved = false;

    if (socket && isConnected) {
      socket.once('room:created', (data: any) => {
        if (!resolved && data?.roomCode) {
          resolved = true;
          if (data.room) setRoom(data.room);
          navigate(`/lobby/${data.roomCode}`);
        }
      });

      socket.emit(
        'room:create',
        {
          gameId: targetGame,
          gameType: targetGame,
          name: targetName,
          maxPlayers: clampedPlayers,
          isPrivate,
          hostMode: isHostMode,
        },
        (res: any) => {
          if (!resolved && res?.roomCode) {
            resolved = true;
            if (res.room) setRoom(res.room);
            navigate(`/lobby/${res.roomCode}`);
          } else if (res?.error) {
            setError(res.error);
            setIsLoading(false);
          }
        }
      );
    }

    setTimeout(async () => {
      if (resolved) return;
      try {
        const res = await api.post<any>('/api/rooms', {
          name: targetName,
          gameType: targetGame,
          maxPlayers: clampedPlayers,
          isPrivate,
          hostMode: isHostMode,
        });

        const code = res?.roomCode || res?.code;
        if (code && !resolved) {
          resolved = true;
          if (res?.room) {
            setRoom(res.room);
          }
          navigate(`/lobby/${code}`);
        }
      } catch (err: any) {
        if (!resolved) {
          setError(err.message || 'Failed to create room. Please try again.');
          setIsLoading(false);
        }
      }
    }, 2500);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
      <div className="border-b border-rule pb-4">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-ink-muted">
          Game Configuration
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-ink mt-1">
          Create Room
        </h1>
      </div>

      <Card className="p-8 border border-rule">
        {error && (
          <div className="border border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-3 rounded-xs mb-6 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-ink-muted mb-2">
              Select Game
            </label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full bg-canvas border border-rule text-ink rounded-xs p-3 text-sm font-medium focus:border-rule-strong outline-none"
            >
              {games.map((game) => {
                const [lo, hi] = playerRange(game.id);
                return (
                  <option key={game.id} value={game.id}>
                    {game.name} ({lo}–{hi} Players)
                  </option>
                );
              })}
            </select>
          </div>

          <Input
            label="Room Name (Optional)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Saturday Night Lobby"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs uppercase tracking-wider font-semibold text-ink-muted">
                Game Mode
              </label>
              {isHostForced && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  1 Host Required for {selectedGame === 'salem' ? 'Salem' : 'Werewolf'}
                </span>
              )}
              {isCodenames && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                  Team Play Mode (2 Teams: Red vs Blue)
                </span>
              )}
              {isRPS && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                  Party Battle (Duel 1v1 / Battle Royale Survival)
                </span>
              )}
              {isNumberGrid && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                  Speedrun & Elimination (1–20 Players)
                </span>
              )}
              {isJigsaw && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                  Cooperative Assembly (1–20 Players)
                </span>
              )}
              {isMusicQuiz && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                  Listen &amp; Race (2–20 Players)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => !isAllPlay && setHostMode('HOST')}
                className={`p-4 rounded-xs border transition-all ${
                  isAllPlay
                    ? 'opacity-40 cursor-not-allowed border-rule bg-canvas-sunk/30'
                    : hostMode === 'HOST'
                    ? 'border-2 border-rule-strong bg-canvas-sunk cursor-pointer'
                    : 'border-rule hover:border-rule-strong cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="gameMode"
                    disabled={isAllPlay}
                    checked={!isAllPlay && hostMode === 'HOST'}
                    onChange={() => !isAllPlay && setHostMode('HOST')}
                    className="accent-ink"
                  />
                  <span className="font-bold text-sm text-ink uppercase">
                    Host / TV Mode {isHostForced && '(Required)'}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  {isCodenames
                    ? 'Disabled: In Codenames, the room host is an active player on a team.'
                    : isNumberGrid
                    ? 'Disabled: In Number Rush, all players (including host) play directly on their grid.'
                    : isJigsaw
                    ? 'Disabled: in a cooperative puzzle the host assembles pieces too, not a scoreboard.'
                    : isMusicQuiz
                    ? 'Disabled: everyone in the room is guessing, and the fastest correct answer wins.'
                    : isRPS
                    ? 'Host device acts as TV / Big-Screen scoreboard with arcade fighting game HUD, round score dots, and weapon clash reveals!'
                    : 'You act as narrator & screen moderator while players participate from their devices.'}
                </p>
              </div>

              <div
                onClick={() => !isHostForced && setHostMode('NO_HOST')}
                className={`p-4 rounded-xs border transition-all ${
                  isHostForced
                    ? 'opacity-40 cursor-not-allowed border-rule bg-canvas-sunk/30'
                    : hostMode === 'NO_HOST' || isAllPlay
                    ? 'border-2 border-rule-strong bg-canvas-sunk cursor-pointer'
                    : 'border-rule hover:border-rule-strong cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="gameMode"
                    disabled={isHostForced}
                    checked={isAllPlay || (!isHostForced && hostMode === 'NO_HOST')}
                    onChange={() => !isHostForced && setHostMode('NO_HOST')}
                    className="accent-ink"
                  />
                  <span className="font-bold text-sm text-ink uppercase">
                    {isCodenames ? 'Team Play Mode' : isAllPlay ? 'All Players Play' : 'No Host Mode'}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  {isHostForced
                    ? 'Disabled: This social deduction game requires 1 dedicated Host Moderator.'
                    : isCodenames
                    ? 'All connected players (including host) are assigned to Red or Blue teams as Spymasters or Operatives.'
                    : isJigsaw
                    ? 'Everyone drags pieces into the same board, in real time, against the clock.'
                    : isMusicQuiz
                    ? 'Everyone hears the same clip and races to lock in an answer.'
                    : isNumberGrid
                    ? 'Everyone in the room clicks their numbers on their device simultaneously in real time.'
                    : 'Every player in the room receives a role and participates directly in the round.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-ink-muted mb-2">
                Max Players ({minPlayers}–{maxPlayerCount})
              </label>
              <input
                type="number"
                min={minPlayers}
                max={maxPlayerCount}
                value={maxPlayers}
                onChange={(e) => {
                  const n = parseInt(e.target.value);
                  setMaxPlayers(Math.min(Math.max(Number.isNaN(n) ? minPlayers : n, minPlayers), maxPlayerCount));
                }}
                className="w-full bg-canvas border border-rule text-ink rounded-xs p-3 text-sm font-mono focus:border-rule-strong outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-3 bg-canvas-sunk/60 rounded-xs cursor-pointer border border-rule">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
                <span className="text-xs uppercase tracking-wider font-semibold text-ink">
                  Private Room (Code Only)
                </span>
              </label>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full mt-4" disabled={isLoading}>
            {isLoading ? 'Creating Room...' : 'Start Lobby'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
