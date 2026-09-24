import { useEffect } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useGameStore } from '../stores/gameStore';
import { useSocket } from './useSocket';
import type { RoomState } from '@party/shared-types';
import { useNavigate } from 'react-router-dom';

export function useRoom() {
  const { socket, isConnected } = useSocket();
  const { room, setRoom, clearRoom } = useRoomStore();
  const navigate = useNavigate();

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

  const setReady = (isReady: boolean) => {
    if (room?.id) {
      socket?.emit('room:ready', { roomId: room.id, isReady });
    }
  };

  const kickPlayer = (targetUserId: string) => {
    if (room?.id) {
      socket?.emit('room:kick', { roomId: room.id, targetUserId });
    }
  };

  const transferHost = (newHostId: string) => {
    if (room?.id) {
      socket?.emit('room:transfer_host', { roomId: room.id, newHostId });
    }
  };

  const updateSettings = (settings: any) => {
    if (room?.id) {
      socket?.emit('room:update_settings', { roomId: room.id, settings });
    }
  };

  return {
    room,
    isConnected,
    joinRoom,
    leaveRoom,
    setReady,
    kickPlayer,
    transferHost,
    updateSettings,
  };
}
