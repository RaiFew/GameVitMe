import type { Server, Socket } from 'socket.io';
import { roomManager } from '../../rooms/room-manager.js';
import { updateRoomDefaultRolesIfUncustomized, calculateDefaultRoleCounts } from '../../rooms/role-defaults.js';

export const registerRoomHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;

  // ─── Room Creation ──────────────────────────────────────────────
  socket.on('room:create', (payload, callback) => {
    const { gameId, gameType, name, maxPlayers, isPrivate, hostMode, roundDurationSeconds } = payload || {};
    const effectiveGameType = gameId || gameType || 'spyfall';
    const effectiveName = name?.trim() || `${user?.displayName || 'Player'}'s Room`;
    const isCodenames = effectiveGameType === 'codenames';
    const isRPS = effectiveGameType === 'rock-paper-scissors';
    const isNumberGrid = effectiveGameType === 'number-grid';
    const effectiveMaxPlayers = isCodenames || isRPS || isNumberGrid
      ? Math.min(Math.max(maxPlayers || 8, 1), 20)
      : Math.min(Math.max(maxPlayers || 8, 4), 13);

    try {
      const room = roomManager.createRoom(user.id, {
        name: effectiveName,
        gameType: effectiveGameType,
        maxPlayers: effectiveMaxPlayers,
        isPrivate: isPrivate || false,
      });

      const isHostForced = effectiveGameType === 'werewolf' || effectiveGameType === 'salem';
      room.settings = {
        ...room.settings,
        hostMode: isHostForced ? true : isCodenames || isNumberGrid ? false : hostMode !== false,
        roundDurationSeconds: Number(roundDurationSeconds) || 480,
        roleAssignmentMode: (payload?.roleAssignmentMode as 'PHYSICAL' | 'RANDOM') || 'PHYSICAL',
        isRoleConfigurationCustomized: false,
        werewolfTieRule: 'NO_KILL',
      };

      // Join host as player 1
      const result = roomManager.joinRoom(room.id, user);
      const roomData = result ? result.room : room;
      updateRoomDefaultRolesIfUncustomized(roomData);

      socket.join(`room:${room.id}`);

      // Emit room:created to the creating socket
      socket.emit('room:created', {
        roomCode: room.code,
        roomId: room.id,
        room: roomData,
      });

      // Also emit room:state so useRoomStore gets populated immediately
      socket.emit('room:state', roomData);

      if (callback) {
        callback({
          success: true,
          roomCode: room.code,
          roomId: room.id,
          room: roomData,
        });
      }
    } catch (err: any) {
      socket.emit('room:error', {
        code: 'CREATE_FAILED',
        message: err.message || 'Failed to create room',
      });
      if (callback) callback({ error: err.message });
    }
  });

  // ─── Room Joining ───────────────────────────────────────────────
  socket.on('room:join', (payload, callback) => {
    const code = payload?.code || payload?.roomCode;
    if (!code) {
      if (callback) callback({ error: 'Room code is required' });
      return;
    }

    const room = roomManager.getRoomByCode(code);
    if (!room) {
      socket.emit('room:error', { code: 'NOT_FOUND', message: 'Room not found' });
      if (callback) callback({ error: 'Room not found' });
      return;
    }

    try {
      const result = roomManager.joinRoom(room.id, user);
      if (!result) {
        if (callback) callback({ error: 'Failed to join room' });
        return;
      }

      updateRoomDefaultRolesIfUncustomized(result.room);
      socket.join(`room:${room.id}`);

      // Emit room:joined directly to the joining socket
      socket.emit('room:joined', {
        roomCode: room.code,
        roomId: room.id,
        room: result.room,
      });

      // Also emit room:state directly to joining socket so useRoomStore gets populated
      socket.emit('room:state', result.room);

      // Broadcast full room state to all players in the room
      io.to(`room:${room.id}`).emit('room:state', result.room);
      io.to(`room:${room.id}`).emit('room:player_joined', { player: result.player, room: result.room });

      if (callback) {
        callback({
          success: true,
          roomCode: room.code,
          roomId: room.id,
          room: result.room,
        });
      }
    } catch (err: any) {
      socket.emit('room:error', { code: 'JOIN_FAILED', message: err.message });
      if (callback) callback({ error: err.message });
    }
  });

  // ─── Room Leaving ───────────────────────────────────────────────
  socket.on('room:leave', async (payload, callback) => {
    const roomId = payload?.roomId;
    const room = roomId ? roomManager.getRoom(roomId) : undefined;
    if (room) {
      const isCreator = (room.creatorId || room.hostId) === user.id;

      if (isCreator) {
        // Room creator left -> disband room and kick everyone out
        const roomChannel = `room:${room.id}`;

        // Clear active timers
        if (room.timers) {
          room.timers.forEach((timer) => clearTimeout(timer));
          room.timers.clear();
        }

        // Emit room:closed to all sockets in the room
        io.to(roomChannel).emit('room:closed', {
          roomId: room.id,
          reason: 'CREATOR_LEFT',
          message: 'ห้องถูกยุบเนื่องจากผู้สร้างห้องออกจากห้อง (Room disbanded: The host has left)',
        });
        io.to(roomChannel).emit('room:kicked_out');

        // Destroy room
        roomManager.destroyRoom(room.id);

        // Remove all sockets from room channel
        try {
          const sockets = await io.in(roomChannel).fetchSockets();
          sockets.forEach((s) => {
            s.leave(roomChannel);
          });
        } catch (err) {
          // Ignore socket fetch error
        }

        if (callback) callback({ success: true, disbanded: true });
        return;
      }

      // Normal player leaving
      roomManager.leaveRoom(room.id, user.id);
      updateRoomDefaultRolesIfUncustomized(room);
      socket.leave(`room:${room.id}`);
      io.to(`room:${room.id}`).emit('room:player_left', { userId: user.id });
      io.to(`room:${room.id}`).emit('room:state', room);
      io.to(`room:${room.id}`).emit('room:updated', room);
    }

    if (callback) callback({ success: true });
  });

  // ─── Player Ready Toggle ────────────────────────────────────────
  socket.on('room:ready', (payload, callback) => {
    const { roomId, isReady } = payload || {};
    const room = roomId ? roomManager.getRoom(roomId) : undefined;
    if (!room) {
      if (callback) callback({ error: 'Room not found' });
      return;
    }

    const player = room.players.find(p => p.id === user.id);
    if (player) {
      player.isReady = isReady;
      io.to(`room:${room.id}`).emit('room:state', room);
      io.to(`room:${room.id}`).emit('room:player_ready', { userId: user.id, isReady });
    }
    if (callback) callback({ success: true, room });
  });

  // ─── Kick Player ────────────────────────────────────────────────
  socket.on('room:kick', (payload, callback) => {
    const { roomId, targetUserId } = payload || {};
    const room = roomId ? roomManager.getRoom(roomId) : undefined;

    if (!room || room.hostId !== user.id) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }

    roomManager.leaveRoom(roomId, targetUserId);
    updateRoomDefaultRolesIfUncustomized(room);
    io.to(`room:${roomId}`).emit('room:player_kicked', { userId: targetUserId });
    io.to(`room:${roomId}`).emit('room:state', room);

    // Disconnect target user socket
    io.in(`room:${roomId}`).fetchSockets().then(sockets => {
      sockets.forEach(s => {
        if ((s as any).data?.user?.id === targetUserId) {
          s.leave(`room:${roomId}`);
          s.emit('room:kicked_out');
        }
      });
    });

    if (callback) callback({ success: true });
  });

  // ─── Transfer Host ──────────────────────────────────────────────
  socket.on('room:transfer_host', (payload, callback) => {
    const { roomId, newHostId } = payload || {};
    const room = roomId ? roomManager.getRoom(roomId) : undefined;

    if (!room || room.hostId !== user.id) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }

    if (room.players.some(p => p.id === newHostId)) {
      room.hostId = newHostId;
      io.to(`room:${roomId}`).emit('room:state', room);
      io.to(`room:${roomId}`).emit('room:updated', room);
      if (callback) callback({ success: true, room });
    } else {
      if (callback) callback({ error: 'Player not found in room' });
    }
  });

  // ─── Update Settings ────────────────────────────────────────────
  socket.on('room:update_settings', (payload, callback) => {
    const { roomId, settings } = payload || {};
    const room = roomId ? roomManager.getRoom(roomId) : undefined;

    if (!room || room.hostId !== user.id) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }

    const isHostForced = room.gameType === 'werewolf' || room.gameType === 'salem';
    const updatedSettings = { ...room.settings, ...settings };
    if (isHostForced) {
      updatedSettings.hostMode = true;
    }
    if (settings?.resetToDefault) {
      updatedSettings.isRoleConfigurationCustomized = false;
    } else if (settings?.roleCounts) {
      updatedSettings.isRoleConfigurationCustomized = true;
    }
    room.settings = updatedSettings;
    updateRoomDefaultRolesIfUncustomized(room);
    io.to(`room:${roomId}`).emit('room:state', room);
    io.to(`room:${roomId}`).emit('room:updated', room);
    if (callback) callback({ success: true, room });
  });
};
