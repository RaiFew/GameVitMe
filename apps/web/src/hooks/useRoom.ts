import { useEffect, useState } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from './useSocket';
import type { RoomState } from '@party/shared-types';
import { useNavigate } from 'react-router-dom';

export function useRoom() {
  const { socket, isConnected } = useSocket();
  const { room, setRoom, clearRoom, updatePlayer } = useRoomStore();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (data: any) => {
      if (data?.players && data?.id) {
        setRoom(data as RoomState);
      } else if (data?.room) {
        setRoom(data.room as RoomState);
      }
    };

    socket.on('room:state', handleRoomUpdate);
    socket.on('room:updated', handleRoomUpdate);
    socket.on('room:player_joined', handleRoomUpdate);
    socket.on('room:player_left', handleRoomUpdate);
    socket.on('room:player_ready', handleRoomUpdate);
    socket.on('room:host_changed', handleRoomUpdate);

    socket.on('room:closed', (data?: any) => {
      clearRoom();
      useGameStore.getState().clearGame();
      navigate('/dashboard', {
        state: {
          info: data?.message || 'ห้องถูกยุบเนื่องจากผู้สร้างห้องออกจากห้อง (Room disbanded: Host left)',
        },
      });
    });

    socket.on('room:kicked', () => {
      clearRoom();
      useGameStore.getState().clearGame();
      navigate('/dashboard', {
        state: {
          info: 'คุณถูกเชิญออกจากห้อง (You were removed from the room)',
        },
      });
    });

    socket.on('room:kicked_out', (data?: any) => {
      clearRoom();
      useGameStore.getState().clearGame();
      navigate('/dashboard', {
        state: {
          info: data?.message || 'ห้องถูกยุบเรียบร้อยแล้ว (Room disbanded)',
        },
      });
    });

    return () => {
      socket.off('room:state', handleRoomUpdate);
      socket.off('room:updated', handleRoomUpdate);
      socket.off('room:player_joined', handleRoomUpdate);
      socket.off('room:player_left', handleRoomUpdate);
      socket.off('room:player_ready', handleRoomUpdate);
      socket.off('room:host_changed', handleRoomUpdate);
      socket.off('room:closed');
      socket.off('room:kicked');
      socket.off('room:kicked_out');
    };
  }, [socket, setRoom, clearRoom, navigate]);

  /**
   * The room store is memory-only, so a refresh — or any navigation that did
   * not come through the dashboard's join flow — leaves LobbyPage and GamePage
   * mounted with nothing to render. Neither page emitted anything to recover,
   * so both sat on a "Synchronizing…" spinner indefinitely. Ask the server
   * once which room this player holds a seat in.
   */
  useEffect(() => {
    if (!socket) return;
    let cancelled = false;

    const sync = () => {
      if (cancelled || useRoomStore.getState().room) return;
      socket.emit('room:sync', {}, () => {});
    };

    sync();
    socket.on('connect', sync);

    return () => {
      cancelled = true;
      socket.off('connect', sync);
    };
  }, [socket]);

  /**
   * Every lobby action used to fire and forget. On a slow or dropped
   * connection the server's `room:state` broadcast never came back, so the
   * button did nothing at all and the lobby looked frozen. Apply the change
   * locally straight away, then let the server's broadcast confirm it.
   */
  const runAction = (event: string, payload: any, onLocalUpdate?: () => void) => {
    if (!room?.id) {
      setActionError('Not in a room yet.');
      return;
    }
    if (!socket?.connected) {
      setActionError('Disconnected from the server. Reconnecting…');
      return;
    }

    setActionError(null);
    onLocalUpdate?.();

    socket.emit(event, payload, (res: any) => {
      if (res?.error) setActionError(res.error);
    });
  };

  const joinRoom = (roomCode: string) => {
    socket?.emit('room:join', { roomCode, code: roomCode });
  };

  const leaveRoom = () => {
    if (room?.id) {
      socket?.emit('room:leave', { roomId: room.id });
    } else {
      socket?.emit('room:leave');
    }
    clearRoom();
    useGameStore.getState().clearGame();
  };

  const setReady = (isReady: boolean) =>
    runAction('room:ready', { roomId: room!.id, isReady }, () => {
      const me = useAuthStore.getState().user?.id;
      if (me) updatePlayer(me, { isReady });
    });

  const kickPlayer = (targetUserId: string) =>
    runAction('room:kick', { roomId: room!.id, targetUserId });

  const transferHost = (newHostId: string) =>
    runAction('room:transfer_host', { roomId: room!.id, newHostId });

  const changeGame = (gameType: string) =>
    runAction('room:change_game', { roomId: room!.id, gameType });

  const updateSettings = (settings: any) =>
    runAction('room:update_settings', { roomId: room!.id, settings }, () => {
      setRoom(room ? ({ ...room, settings: { ...room.settings, ...settings } } as any) : room);
    });

  return {
    room,
    isConnected,
    actionError,
    clearActionError: () => setActionError(null),
    joinRoom,
    leaveRoom,
    setReady,
    kickPlayer,
    transferHost,
    updateSettings,
    changeGame,
  };
}
