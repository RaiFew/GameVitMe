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
      setGameResult(null);
      setActionError(null);
    });
    
    socket.on('game:timer', (timerInfo: any) => {
      setTimer(timerInfo);
    });
    
    socket.on('game:finished', (result: any) => {
      setGameResult(result);
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
    };
  }, [socket, setPlayerView, setTimer, setGameResult, setActionError]);

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
