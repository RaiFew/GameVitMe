import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useSocket } from './useSocket';

export function useGameState() {
  const { socket } = useSocket();
  const { setPlayerView, setTimer, setGameResult, clearGame, startSession, actionError, setActionError } =
    useGameStore();

  useEffect(() => {
    if (!socket) return;

    const onState = (state: any) => {
      setPlayerView(state);
      setActionError(null);
    };
    // The previous round's view is stale the instant a new one begins. Leaving
    // it in place means a client that missed this event keeps rendering the
    // old GAME_OVER screen with a live "Play Another Round" button, so a
    // second rematch appears to do nothing.
    const onStarted = (info: any) => startSession(info?.sessionId ?? null);
    const onTimer = (timerInfo: any) => setTimer(timerInfo);
    const onFinished = (result: any) => setGameResult(result);
    // The runner is destroyed server-side on return-to-lobby, so every piece of
    // game state this client is holding is now fiction.
    const onReturned = () => clearGame();
    const onActionError = (error: any) => {
      console.error('Game action error:', error);
      setActionError(error?.message || 'Invalid move');
    };

    socket.on('game:state', onState);
    socket.on('game:started', onStarted);
    socket.on('game:timer', onTimer);
    socket.on('game:finished', onFinished);
    socket.on('game:returned_to_lobby', onReturned);
    socket.on('game:action_error', onActionError);

    // Named handlers: a bare `off(event)` also stripped every other component's
    // listener for that event (LobbyPage's `game:started`, GamePage's return).
    return () => {
      socket.off('game:state', onState);
      socket.off('game:started', onStarted);
      socket.off('game:timer', onTimer);
      socket.off('game:finished', onFinished);
      socket.off('game:returned_to_lobby', onReturned);
      socket.off('game:action_error', onActionError);
    };
  }, [socket, setPlayerView, setTimer, setGameResult, setActionError, clearGame, startSession]);

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
