import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useSocket } from './useSocket';

export function useGameState() {
  const { socket } = useSocket();
  const { setPlayerView, setTimer, setGameResult, clearGame, actionError, setActionError } = useGameStore();

  useEffect(() => {
    if (!socket) return;

    socket.on('game:state', (state: any) => {
      setPlayerView(state);
      setActionError(null);
    });
    
    socket.on('game:started', () => {
      // The previous round's view is stale the instant a new one begins. Leaving
      // it in place means a client that missed this event keeps rendering the
      // old GAME_OVER screen with a live "Play Another Round" button, so a
      // second rematch appears to do nothing.
      setPlayerView(null);
      setGameResult(null);
      setTimer(null);
      setActionError(null);
    });
    
    socket.on('game:timer', (timerInfo: any) => {
      setTimer(timerInfo);
    });
    
    socket.on('game:finished', (result: any) => {
      setGameResult(result);
    });

    // The runner is destroyed server-side on return-to-lobby, so every piece of
    // game state this client is holding is now fiction.
    socket.on('game:returned_to_lobby', () => {
      clearGame();
    });

    socket.on('game:action_error', (error: any) => {
      console.error('Game action error:', error);
      setActionError(error?.message || 'Invalid move');
    });

    return () => {
      socket.off('game:state');
      socket.off('game:started');
      socket.off('game:timer');
      socket.off('game:finished');
      socket.off('game:action_error');
      socket.off('game:returned_to_lobby');
    };
  }, [socket, setPlayerView, setTimer, setGameResult, setActionError, clearGame]);

  const startGame = (roomId: string, roundDurationSeconds?: number, callback?: (res: any) => void) => {
    socket?.emit('game:start', { roomId, roundDurationSeconds }, callback);
  };

  const sendAction = (roomId: string, type: string, payload?: unknown, callback?: (res: any) => void) => {
    setActionError(null);
    socket?.emit('game:action', { roomId, action: { type, payload } }, (res: any) => {
      if (res?.error) {
        setActionError(res.error);
      }
      if (callback) callback(res);
    });
  };

  return { startGame, sendAction, actionError, clearActionError: () => setActionError(null) };
}
