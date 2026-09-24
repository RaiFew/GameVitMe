import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../stores/roomStore';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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

  useEffect(() => {
    if (isHostForced) {
      setHostMode('HOST');
    } else if (isCodenames || isNumberGrid) {
      setHostMode('NO_HOST');
    }
  }, [selectedGame, isHostForced, isCodenames, isNumberGrid]);

  const { socket, isConnected } = useSocket();
  const { setRoom } = useRoomStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/games')
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (list.length > 0) {
          setGames(list);
          if (!searchParams.get('game')) {
            setSelectedGame(list[0].id);
          }
        }
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
        : 'My Party Room');
    const clampedPlayers = targetGame === 'number-grid'
      ? Math.min(Math.max(maxPlayers, 1), 20)
      : targetGame === 'codenames' || targetGame === 'rock-paper-scissors'
      ? Math.min(Math.max(maxPlayers, 2), 20)
      : Math.min(Math.max(maxPlayers, 4), 12);
    const isHostMode = isHostForced ? true : targetGame === 'codenames' || targetGame === 'number-grid' ? false : hostMode === 'HOST';

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
        const res = await api.post('/api/rooms', {
          name: targetName,
          gameType: targetGame,
          maxPlayers: clampedPlayers,
          isPrivate,
          hostMode: isHostMode,
        });

        const code = res?.roomCode || res?.code || res?.data?.code || res?.data?.roomCode;
        if (code && !resolved) {
          resolved = true;
          if (res?.room || res?.data?.room) {
            setRoom(res?.room || res?.data?.room);
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
          Game Configuration
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
          Create Room
        </h1>
      </div>

      <Card className="p-8 border border-zinc-300 dark:border-zinc-800">
        {error && (
          <div className="border border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-3 rounded-xs mb-6 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              Select Game
            </label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white rounded-xs p-3 text-sm font-medium focus:border-black dark:focus:border-white outline-none"
            >
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name} ({game.id === 'number-grid' ? '1–20' : game.id === 'codenames' || game.id === 'rock-paper-scissors' ? '2–20' : '4–12'} Players)
                </option>
              ))}
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
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400">
                Game Mode
              </label>
              {isHostForced && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  1 Host Required for {selectedGame === 'salem' ? 'Salem' : 'Werewolf'}
                </span>
              )}
              {isCodenames && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Team Play Mode (2 Teams: Red vs Blue)
                </span>
              )}
              {isRPS && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Party Battle (Duel 1v1 / Battle Royale Survival)
                </span>
              )}
              {isNumberGrid && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Speedrun & Elimination (1–20 Players)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => !isCodenames && !isNumberGrid && setHostMode('HOST')}
                className={`p-4 rounded-xs border transition-all ${
                  isCodenames || isNumberGrid
                    ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/30'
                    : hostMode === 'HOST'
                    ? 'border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 cursor-pointer'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="gameMode"
                    disabled={isCodenames || isNumberGrid}
                    checked={!isCodenames && !isNumberGrid && hostMode === 'HOST'}
                    onChange={() => !isCodenames && !isNumberGrid && setHostMode('HOST')}
                    className="accent-black dark:accent-white"
                  />
                  <span className="font-bold text-sm text-black dark:text-white uppercase">
                    Host / TV Mode {isHostForced && '(Required)'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {isCodenames
                    ? 'Disabled: In Codenames, the room host is an active player on a team.'
                    : isNumberGrid
                    ? 'Disabled: In Number Rush, all players (including host) play directly on their grid.'
                    : isRPS
                    ? 'Host device acts as TV / Big-Screen scoreboard with arcade fighting game HUD, round score dots, and weapon clash reveals!'
                    : 'You act as narrator & screen moderator while players participate from their devices.'}
                </p>
              </div>

              <div
                onClick={() => !isHostForced && setHostMode('NO_HOST')}
                className={`p-4 rounded-xs border transition-all ${
                  isHostForced
                    ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/30'
                    : hostMode === 'NO_HOST' || isCodenames || isNumberGrid
                    ? 'border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 cursor-pointer'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="gameMode"
                    disabled={isHostForced}
                    checked={isCodenames || isNumberGrid || (!isHostForced && hostMode === 'NO_HOST')}
                    onChange={() => !isHostForced && setHostMode('NO_HOST')}
                    className="accent-black dark:accent-white"
                  />
                  <span className="font-bold text-sm text-black dark:text-white uppercase">
                    {isCodenames ? 'Team Play Mode' : isNumberGrid ? 'All Players Compete' : 'No Host Mode'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {isHostForced
                    ? 'Disabled: This social deduction game requires 1 dedicated Host Moderator.'
                    : isCodenames
                    ? 'All connected players (including host) are assigned to Red or Blue teams as Spymasters or Operatives.'
                    : isNumberGrid
                    ? 'Everyone in the room clicks their numbers on their device simultaneously in real time.'
                    : 'Every player in the room receives a role and participates directly in the round.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Max Players ({isNumberGrid ? '1–20' : isCodenames || isRPS ? '2–20' : '4–12'})
              </label>
              <input
                type="number"
                min={isNumberGrid ? 1 : isCodenames || isRPS ? 2 : 4}
                max={isNumberGrid || isCodenames || isRPS ? 20 : 12}
                value={maxPlayers}
                onChange={(e) => {
                  const minP = isNumberGrid ? 1 : isCodenames || isRPS ? 2 : 4;
                  const maxP = isNumberGrid || isCodenames || isRPS ? 20 : 12;
                  setMaxPlayers(Math.min(Math.max(parseInt(e.target.value) || minP, minP), maxP));
                }}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white rounded-xs p-3 text-sm font-mono focus:border-black dark:focus:border-white outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xs cursor-pointer border border-zinc-300 dark:border-zinc-700">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-black dark:accent-white"
                />
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
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
