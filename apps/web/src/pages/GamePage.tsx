import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useRoom } from '../hooks/useRoom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { useGameStore } from '../stores/gameStore';
import { SpyfallGame } from '../components/games/spyfall/SpyfallGame';
import type { SpyfallPlayerView } from '@party/spyfall';
import { WerewolfGame } from '../components/games/werewolf/WerewolfGame';
import type { WerewolfPlayerView } from '@party/werewolf';
import { SalemGame } from '../components/games/salem/SalemGame';
import type { SalemPlayerView } from '@party/salem';
import { CodenamesGame } from '../components/games/codenames/CodenamesGame';
import type { CodenamesPlayerView } from '@party/codenames';
import { RPSGame } from '../components/games/rps/RPSGame';
import type { RPSPlayerView } from '@party/rock-paper-scissors';
import { NumberGridGame } from '../components/games/number-grid/NumberGridGame';
import type { NumberGridPlayerView } from '@party/number-grid';
import { JigsawGame } from '../components/games/jigsaw/JigsawGame';
import type { JigsawPlayerView } from '@party/jigsaw';
import { MusicQuizGame } from '../components/games/music-quiz/MusicQuizGame';
import type { MusicQuizPlayerView } from '@party/music-quiz';

export function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, leaveRoom } = useRoom();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { sendAction, startGame } = useGameState();
  const { playerView } = useGameStore();
  const navigate = useNavigate();
  const [rematchError, setRematchError] = useState<string | null>(null);

  useEffect(() => {
    if (socket && room?.id) {
      socket.emit('game:sync', { roomId: room.id });
    }
  }, [socket, room?.id]);

  useEffect(() => {
    if (socket) {
      const handleReturnToLobby = () => {
        navigate(`/lobby/${roomCode}`);
      };
      socket.on('game:returned_to_lobby', handleReturnToLobby);
      return () => {
        socket.off('game:returned_to_lobby', handleReturnToLobby);
      };
    }
  }, [socket, navigate, roomCode]);

  if (!room || !playerView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-rule-strong border-t-transparent mb-4" />
        <p className="text-ink-muted font-mono text-xs uppercase tracking-wider">Synchronizing round state...</p>
        <button
          onClick={() => socket?.emit('game:sync', { roomId: room?.id })}
          className="text-xs font-mono text-ink-muted underline mt-2 hover:text-ink"
        >
          Tap to reconnect
        </button>
      </div>
    );
  }

  const handleAction = (type: string, payload?: unknown) => {
    sendAction(room.id, type, payload);
  };

  const handleReturnLobby = () => {
    if (socket && room?.id) {
      socket.emit('game:return_lobby', { roomId: room.id }, () => {
        navigate(`/lobby/${roomCode}`);
      });
    } else {
      navigate(`/lobby/${roomCode}`);
    }
  };

  /**
   * Rematch. Both emits used to be fire-and-forget, so a socket that was
   * mid-reconnect dropped them and the player was told nothing — the button
   * looked dead. A mobile client hits this constantly, because backgrounding
   * the tab is exactly when the transport drops.
   */
  const handlePlayAgain = (customDurationSeconds?: number) => {
    if (!room?.id) return;

    const applySettings = (next: () => void) => {
      if (!customDurationSeconds) return next();
      socket?.emit(
        'room:update_settings',
        { roomId: room.id, settings: { roundDurationSeconds: customDurationSeconds } },
        (res: any) => (res?.error ? setRematchError(res.error) : next())
      );
    };

    applySettings(() => {
      startGame(room.id, customDurationSeconds, (res: any) => {
        if (res?.error) setRematchError(res.error);
        else setRematchError(null);
      });
    });
  };

  const handleLeaveGame = () => {
    const isHost = room?.hostId === user?.id || (room as any)?.creatorId === user?.id;
    if (isHost) {
      if (window.confirm('คุณเป็นคนสร้างห้อง หากออกจากห้องจะยุบห้องทิ้งและเตะทุกคนออกจากห้องทันที คุณต้องการออกจากห้องใช่หรือไม่?\n(As room creator, leaving will disband the room and remove all players)')) {
        leaveRoom();
        navigate('/dashboard');
      }
    } else {
      if (window.confirm('คุณต้องการออกจากห้องใช่หรือไม่? (Leave game room)')) {
        leaveRoom();
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas">
      {rematchError && (
        <div className="border-b border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-4 py-2 text-xs font-mono flex items-center justify-between">
          <span>{rematchError}</span>
          <button
            onClick={() => setRematchError(null)}
            className="font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Game Top Control Bar */}
      <div className="bg-canvas-sunk/90 border-b border-rule px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-black uppercase tracking-wider text-ink">
            {room.name || room.gameType}
          </span>
          <span className="text-ink-faint">•</span>
          <span className="text-ink-muted font-bold">CODE: {room.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReturnLobby}
            className="px-2.5 py-1 text-ink hover:text-ink transition-colors cursor-pointer border border-rule rounded-xs bg-canvas font-bold text-[11px]"
          >
            Lobby
          </button>
          <button
            type="button"
            onClick={handleLeaveGame}
            className="px-2.5 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer border border-red-300 dark:border-red-800/60 rounded-xs font-bold text-[11px]"
          >
            {room.hostId === user?.id ? 'Disband Room' : 'Leave Room'}
          </button>
        </div>
      </div>

      {room.gameType === 'spyfall' ? (
        <SpyfallGame
          playerView={playerView as SpyfallPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : room.gameType === 'werewolf' ? (
        <WerewolfGame
          playerView={playerView as WerewolfPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : room.gameType === 'salem' ? (
        <SalemGame
          playerView={playerView as SalemPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : room.gameType === 'codenames' ? (
        <CodenamesGame
          playerView={playerView as CodenamesPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : room.gameType === 'rock-paper-scissors' ? (
        <RPSGame
          playerView={playerView as RPSPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
          isHost={room.hostId === (playerView as any)?.me?.id}
        />
      ) : room.gameType === 'number-grid' ? (
        <NumberGridGame
          playerView={playerView as NumberGridPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : room.gameType === 'jigsaw' ? (
        <JigsawGame
          playerView={playerView as JigsawPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : room.gameType === 'music-quiz' ? (
        <MusicQuizGame
          playerView={playerView as MusicQuizPlayerView}
          onAction={handleAction}
          onReturnLobby={handleReturnLobby}
          onPlayAgain={handlePlayAgain}
        />
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm font-mono text-ink-muted">Unsupported game type: {room.gameType}</p>
        </div>
      )}
    </div>
  );
}
