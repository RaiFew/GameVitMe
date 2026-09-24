import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { PlayerList } from '../components/lobby/PlayerList';
import { QRCodeDisplay } from '../components/lobby/QRCodeDisplay';
import { InviteFriends } from '../components/lobby/InviteFriends';
import { RoleConfigurationCard } from '../components/lobby/RoleConfigurationCard';
import { CodenamesWordSourceCard } from '../components/lobby/CodenamesWordSourceCard';
import { RPSSettingsCard } from '../components/lobby/RPSSettingsCard';
import { NumberGridSettingsCard } from '../components/lobby/NumberGridSettingsCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Users, Shield, ArrowRight } from 'lucide-react';
import { useUserSettingsStore } from '../stores/userSettingsStore';

export function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, setReady, kickPlayer, updateSettings, leaveRoom } = useRoom();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const isHost = room?.hostId === user?.id;
  const streamerMode = useUserSettingsStore((s) => s.streamerMode);
  const [showInvite, setShowInvite] = useState(false);
  const [hostTab, setHostTab] = useState<'members' | 'roles'>('members');

  const initialDuration = Number(room?.settings?.roundDurationSeconds) || 480;
  const [minutes, setMinutes] = useState(String(Math.floor(initialDuration / 60)));
  const [seconds, setSeconds] = useState(String(initialDuration % 60).padStart(2, '0'));
  const [timerError, setTimerError] = useState('');

  useEffect(() => {
    if (room?.settings?.roundDurationSeconds) {
      const dur = Number(room.settings.roundDurationSeconds);
      setMinutes(String(Math.floor(dur / 60)));
      setSeconds(String(dur % 60).padStart(2, '0'));
    }
  }, [room?.settings?.roundDurationSeconds]);

  useEffect(() => {
    if (!socket) return;
    const handleGameStarted = () => {
      navigate(`/game/${roomCode}`);
    };
    socket.on('game:started', handleGameStarted);
    return () => {
      socket.off('game:started', handleGameStarted);
    };
  }, [socket, navigate, roomCode]);

  if (!room || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black dark:border-white border-t-transparent mb-4" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-wider">Synchronizing room state...</p>
      </div>
    );
  }

  const players = room.players || [];
  const isCodenames = room.gameType === 'codenames';
  const codenamesGameMode = ((room.settings as any)?.codenamesGameMode || 'CLASSIC') as 'CLASSIC' | 'TWO_PLAYER';
  const isCodenamesTwoPlayer = isCodenames && codenamesGameMode === 'TWO_PLAYER';

  const isRPS = room.gameType === 'rock-paper-scissors';
  const rpsGameMode = ((room.settings as any)?.rpsGameMode || (players.length === 2 ? 'DUEL' : 'BATTLE_ROYALE')) as 'DUEL' | 'BATTLE_ROYALE' | 'POINTS_RACE';
  const isRPSDuel = isRPS && rpsGameMode === 'DUEL';

  const isNumberGrid = room.gameType === 'number-grid';

  const isHostForced = room.gameType === 'werewolf' || room.gameType === 'salem';
  const isHostMode = isCodenames || isNumberGrid ? false : isRPS ? !!room.settings?.hostMode : (isHostForced || room.settings?.hostMode !== false);
  const playingPlayers = isHostMode ? players.filter((p) => p.id !== room.hostId) : players;
  const minPlayers = isNumberGrid ? 1 : isCodenames ? (isCodenamesTwoPlayer ? 2 : 4) : isRPS ? (isHostMode ? 3 : 2) : (isHostMode ? 5 : 4);
  const enoughPlayers = isNumberGrid
    ? players.length >= 1
    : isCodenamesTwoPlayer
    ? players.length === 2
    : isRPSDuel
    ? playingPlayers.length === 2
    : isRPS
    ? playingPlayers.length >= 2
    : players.length >= minPlayers;
  const allReady = (isNumberGrid && players.length === 1) || playingPlayers.every((p) => p.isReady);
  const readyCount = playingPlayers.filter((p) => p.isReady).length;
  const currentPlayer = players.find((p) => p.id === user.id);

  const handleTimerChange = (newMin: string, newSec: string) => {
    setMinutes(newMin);
    setSeconds(newSec);
    const m = parseInt(newMin, 10);
    const s = parseInt(newSec, 10);

    if (isNaN(m) || isNaN(s)) {
      setTimerError('Invalid timer format');
      return;
    }
    if (m < 0 || m > 99) {
      setTimerError('Minutes must be between 0 and 99');
      return;
    }
    if (s < 0 || s > 59) {
      setTimerError('Seconds must be between 00 and 59');
      return;
    }

    const totalSeconds = m * 60 + s;
    if (totalSeconds < 30) {
      setTimerError('Round must be at least 30 seconds');
      return;
    }

    setTimerError('');
    updateSettings({
      roundDurationSeconds: totalSeconds,
    });
  };

  const isRoleGame = room.gameType === 'werewolf' || room.gameType === 'salem';
  const roleCounts = (room.settings as any)?.roleCounts || {};
  const totalConfiguredRoles = Object.values(roleCounts).reduce(
    (acc: number, c: any) => acc + (Number(c) || 0),
    0
  );
  const isRoleCountValid = !isRoleGame || totalConfiguredRoles === playingPlayers.length;

  const handleStartGame = () => {
    if (isCodenamesTwoPlayer && players.length !== 2) {
      alert('2-Player Codenames requires exactly 2 players.');
      return;
    }
    if (isRPSDuel && playingPlayers.length !== 2) {
      alert(isHostMode ? '1v1 Duel in Host Mode requires 1 Host + 2 Fighters (3 users total).' : 'Rock Paper Scissors (Duel) requires exactly 2 players.');
      return;
    }
    if (!enoughPlayers || !allReady) return;
    if (isRoleGame && !isRoleCountValid) {
      alert(`Role configuration count (${totalConfiguredRoles}) must match the number of active players (${playingPlayers.length}).`);
      return;
    }
    socket?.emit('game:start', { roomId: room.id }, (res: any) => {
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="border border-black dark:border-white text-black dark:text-white text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              {room.gameType.toUpperCase()}
            </span>
            <span className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              {isHostForced
                ? 'Host Moderator Mode (1 Host)'
                : isCodenames
                ? isCodenamesTwoPlayer
                  ? '2-Player Cooperative Mode'
                  : 'Team Play Mode (Red vs Blue)'
                : isRPS
                ? isHostMode
                  ? rpsGameMode === 'DUEL'
                    ? '1v1 Fighting Game (TV Host)'
                    : 'Battle Royale (TV Host)'
                  : rpsGameMode === 'DUEL'
                  ? '1v1 Duel Mode'
                  : rpsGameMode === 'BATTLE_ROYALE'
                  ? 'Battle Royale Survival'
                  : 'Points Race Mode'
                : isHostMode
                ? 'Host / Screen Mode'
                : 'No Host Mode'}
            </span>
            {streamerMode && (
              <span className="border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider">
                Streamer Mode Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white">
            {room.name || 'Game Lobby'}
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-1">
            {isHostForced
              ? `${room.gameType === 'salem' ? 'Salem 1692' : 'Werewolf'} requires 1 Host Moderator + 4 to 12 players (5+ users in room)`
              : isCodenames
              ? isCodenamesTwoPlayer
                ? '2-Player Cooperative requires exactly 2 players cooperating on the same team'
                : 'Classic Codenames requires 4 to 20 players (2 teams: Red vs Blue)'
              : isRPS
              ? isHostMode
                ? isRPSDuel
                  ? 'TV Host Mode: 1 TV Screen Host + 2 active fighters required (3 users in room)'
                  : 'TV Host Mode: 1 TV Screen Host + 2 to 20 active fighters'
                : isRPSDuel
                ? '1v1 Duel requires exactly 2 players'
                : 'Rock Paper Scissors supports 2 to 20 players'
              : isNumberGrid
              ? 'Number Rush: 1 to 20 players. Click numbers in ascending order under high pressure!'
              : isHostMode
              ? 'Screen Mode: 1 Screen Host + 4 to 12 active players required (5+ users in room)'
              : '4 to 12 players required to play'}
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="secondary" size="sm" onClick={() => setShowInvite(true)} className="flex-1 md:flex-initial text-xs">
            Invite Friends
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (isHost) {
                if (window.confirm('คุณเป็นคนสร้างห้อง หากออกจากห้องจะยุบห้องทิ้งและเตะทุกคนออกจากห้องทันที คุณต้องการออกจากห้องใช่หรือไม่?\n(As room creator, leaving will disband the room and remove all players)')) {
                  leaveRoom();
                  navigate('/dashboard');
                }
              } else {
                leaveRoom();
                navigate('/dashboard');
              }
            }}
            className="flex-1 md:flex-initial text-xs"
          >
            {isHost ? 'Disband Room' : 'Leave Room'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Player Count Alert */}
          {players.length < minPlayers && (
            <div className="border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-4 rounded-xs text-xs font-mono flex items-center justify-between">
              <span>Waiting for {minPlayers - players.length} more player(s) to join.</span>
              <span className="font-bold">{players.length} / {minPlayers} MIN</span>
            </div>
          )}

          {/* Host Tab Switcher for Werewolf / Salem (Shows members first by default) */}
          {isHost && isRoleGame && (
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setHostTab('members')}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xs border transition-all flex items-center gap-2 ${
                  hostTab === 'members'
                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <Users size={14} />
                <span>Room Members ({players.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setHostTab('roles')}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xs border transition-all flex items-center gap-2 ${
                  hostTab === 'roles'
                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <Shield size={14} />
                <span>Configure Roles ({totalConfiguredRoles}/{playingPlayers.length})</span>
                {!isRoleCountValid && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          )}

          {/* Members View (Default for host, only view for players) */}
          {(!isHost || !isRoleGame || hostTab === 'members') && (
            <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                  Connected Players ({players.length} / {room.maxPlayers})
                </h2>
                <span className="text-[10px] font-mono text-zinc-500">
                  Ready: {readyCount} / {playingPlayers.length}
                </span>
              </div>

              <PlayerList
                players={players}
                hostId={room.hostId}
                currentUserId={user.id}
                isHost={isHost}
                isHostMode={isHostMode}
                onKick={kickPlayer}
              />
            </Card>
          )}

          {/* Role Configuration (Only visible to Host when roles tab is selected) */}
          {isHost && isRoleGame && hostTab === 'roles' && (
            <RoleConfigurationCard
              gameType={room.gameType as 'werewolf' | 'salem'}
              isHost={isHost}
              playingPlayerCount={playingPlayers.length}
              settings={room.settings as any}
              onUpdateSettings={updateSettings}
            />
          )}

          {/* Codenames Mode Selector (Visible when 2 players in room or currently in TWO_PLAYER mode) */}
          {isCodenames && (players.length === 2 || isCodenamesTwoPlayer) && (
            <Card className="p-5 border border-zinc-300 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
                    Codenames Ruleset
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight text-black dark:text-white mt-0.5">
                    Select Game Mode
                  </h3>
                </div>

                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                  {isCodenamesTwoPlayer ? '2-Player Co-op' : 'Classic Mode'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => updateSettings({ codenamesGameMode: 'CLASSIC' })}
                  className={`p-3 border rounded-xs text-left transition-all flex items-start justify-between ${
                    !isCodenamesTwoPlayer
                      ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
                  } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase text-black dark:text-white">Classic Codenames</span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">
                      2 opposing teams: Red vs Blue (4 to 20 players).
                    </p>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      !isCodenamesTwoPlayer ? 'border-black dark:border-white bg-black dark:bg-white' : 'border-zinc-400'
                    }`}
                  >
                    {!isCodenamesTwoPlayer && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => updateSettings({ codenamesGameMode: 'TWO_PLAYER' })}
                  className={`p-3 border rounded-xs text-left transition-all flex items-start justify-between ${
                    isCodenamesTwoPlayer
                      ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
                  } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase text-black dark:text-white">2-Player Cooperative</span>
                      <span className="text-[9px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1 py-0.2 rounded-xs font-bold">
                        Co-op
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">
                      Play together on the same team (Requires exactly 2 players).
                    </p>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isCodenamesTwoPlayer ? 'border-black dark:border-white bg-black dark:bg-white' : 'border-zinc-400'
                    }`}
                  >
                    {isCodenamesTwoPlayer && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                  </div>
                </button>
              </div>

              {isCodenamesTwoPlayer && players.length > 2 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-mono rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span>2-Player Codenames requires exactly 2 players. Currently {players.length} players connected.</span>
                  {isHost && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateSettings({ codenamesGameMode: 'CLASSIC' })}
                      className="text-xs font-bold uppercase shrink-0"
                    >
                      Switch to Classic
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Codenames Word Source Library Configuration */}
          {isCodenames && (
            <CodenamesWordSourceCard
              roomId={room.id}
              isHost={isHost}
              settings={room.settings as any}
              onUpdateSettings={updateSettings}
            />
          )}

          {/* Rock Paper Scissors Battle Settings */}
          {isRPS && (
            <RPSSettingsCard
              isHost={isHost}
              playerCount={players.length}
              settings={room.settings as any}
              onUpdateSettings={updateSettings}
            />
          )}

          {/* Number Grid Settings */}
          {isNumberGrid && (
            <NumberGridSettingsCard
              isHost={isHost}
              playerCount={players.length}
              settings={room.settings as any}
              onUpdateSettings={updateSettings}
            />
          )}

          {/* Action Row */}
          <div className="flex gap-3">
            {(!isHost || !isHostMode) && (
              <Button
                size="lg"
                className="flex-1 text-xs"
                variant={currentPlayer?.isReady ? 'secondary' : 'primary'}
                onClick={() => setReady(!currentPlayer?.isReady)}
              >
                {currentPlayer?.isReady ? 'Ready (Click to Cancel)' : 'Ready Up'}
              </Button>
            )}

            {isHost ? (
              <Button
                size="lg"
                className={`${isHostMode ? 'w-full' : 'flex-1'} text-xs font-bold`}
                disabled={
                  !enoughPlayers ||
                  !allReady ||
                  (isRoleGame && !isRoleCountValid) ||
                  (isCodenamesTwoPlayer && players.length !== 2) ||
                  (isRPSDuel && players.length !== 2)
                }
                onClick={handleStartGame}
              >
                {!enoughPlayers
                  ? isCodenamesTwoPlayer
                    ? `Need exactly 2 players (currently ${players.length})`
                    : `Need ${minPlayers - players.length} more player(s)`
                  : isCodenamesTwoPlayer && players.length !== 2
                  ? `2-Player mode requires exactly 2 players (${players.length} in room)`
                  : !allReady
                  ? `Waiting for Ready (${readyCount}/${playingPlayers.length})`
                  : isRoleGame && !isRoleCountValid
                  ? `Role Count Mismatch (${totalConfiguredRoles}/${playingPlayers.length})`
                  : 'Start Round'}
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-center rounded-xs">
                {!enoughPlayers
                  ? `Need ${minPlayers - players.length} more player(s)...`
                  : !currentPlayer?.isReady
                  ? 'Click "Ready Up" when prepared'
                  : !allReady
                  ? `Waiting for others (${readyCount}/${playingPlayers.length})...`
                  : 'All ready! Waiting for Host to start...'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QR Code & Settings */}
        <div className="space-y-6">
          <Card className="flex flex-col items-center p-6 border border-zinc-300 dark:border-zinc-800">
            <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 mb-4">
              Scan / Join Code
            </h3>
            <QRCodeDisplay roomCode={roomCode || room.code || ''} />
          </Card>

          {/* Timer Settings in Host Mode */}
          {isHostMode && isHost && (
            <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 mb-1">
                Round Duration
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Configure questioning countdown timer (00:30 to 99:59)</p>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Minutes (0–99)</label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={minutes}
                    onChange={(e) => handleTimerChange(e.target.value, seconds)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white rounded-xs p-2 text-center text-base font-mono font-bold focus:border-black dark:focus:border-white outline-none"
                  />
                </div>
                <span className="text-xl font-mono font-bold text-zinc-400 mt-4">:</span>
                <div className="flex-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Seconds (0–59)</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => handleTimerChange(minutes, e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white rounded-xs p-2 text-center text-base font-mono font-bold focus:border-black dark:focus:border-white outline-none"
                  />
                </div>
              </div>

              {timerError ? (
                <p className="text-[10px] font-mono text-red-600 dark:text-red-400">{timerError}</p>
              ) : (
                <p className="text-[10px] font-mono text-zinc-500">
                  Current duration: {minutes.padStart(2, '0')}:{seconds.padStart(2, '0')}
                </p>
              )}
            </Card>
          )}

          {/* Quick Rules Card */}
          <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
            <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 mb-3">
              {isRPS
                ? 'Rock Paper Scissors Overview'
                : isCodenames
                ? 'Codenames Overview'
                : isRoleGame
                ? `${room.gameType === 'salem' ? 'Salem 1692' : 'Werewolf'} Overview`
                : 'Spyfall Overview'}
            </h3>
            {isRPS ? (
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-disc list-inside">
                <li>Secretly lock in 🪨 <strong>Rock</strong>, 📄 <strong>Paper</strong>, or ✂️ <strong>Scissors</strong> before the countdown expires!</li>
                <li><strong>Rules</strong>: Rock crushes Scissors, Scissors cuts Paper, Paper covers Rock.</li>
                <li><strong>Battle Royale Mode</strong>: If 2 weapons are thrown, the losing weapon players are eliminated! If all 3 weapons or all identical weapons are thrown, it's a standoff!</li>
                <li><strong>1v1 Duel / Points Race Mode</strong>: Win the round to score +1 point. First to the target score wins the match!</li>
              </ul>
            ) : isCodenames ? (
              isCodenamesTwoPlayer ? (
                <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-disc list-inside">
                  <li><strong>Cooperative</strong>: 2 players work together on the same team!</li>
                  <li>1 <strong>Spymaster</strong> gives 1-word clues + number of matching agents.</li>
                  <li>1 <strong>Operative</strong> deduces and uncovers the 9 friendly cards.</li>
                  <li>Opposing/neutral cards count as mistakes and end the turn.</li>
                  <li>Uncovering the <strong>Assassin</strong> immediately ends the game in defeat!</li>
                </ul>
              ) : (
                <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-disc list-inside">
                  <li>2 Teams: <strong>RED</strong> vs <strong>BLUE</strong> (min 4 players).</li>
                  <li>Each team has 1 Spymaster and 1+ Operatives.</li>
                  <li>Spymasters give 1-word clues + number indicating matching words.</li>
                  <li>Operatives deduce words on the 5×5 grid. Avoid the instant-loss Assassin!</li>
                </ul>
              )
            ) : isRoleGame ? (
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-disc list-inside">
                <li>Social deduction between Town/Village and hidden evils.</li>
                <li>Follow the Host Moderator instructions during Day and Night phases.</li>
                <li>Accuse, deliberate, and vote out suspects.</li>
              </ul>
            ) : (
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-disc list-inside">
                <li>1 player is the secret Spy; others know the secret location.</li>
                <li>Ask clever questions out loud to identify the Spy.</li>
                <li>The Spy attempts to deduce the secret location.</li>
                <li>Indictments require a unanimous vote to convict.</li>
              </ul>
            )}
          </Card>
        </div>
      </div>

      {showInvite && <InviteFriends onClose={() => setShowInvite(false)} />}
    </div>
  );
}
