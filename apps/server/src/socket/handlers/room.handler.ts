import type { Server, Socket } from 'socket.io';
import { roomManager } from '../../rooms/room-manager.js';
import { updateRoomDefaultRolesIfUncustomized, calculateDefaultRoleCounts } from '../../rooms/role-defaults.js';
import { hasValidRoomInvite } from '../../services/invitations.js';
import { validateNumberGridSettings } from '../../rooms/settings-validation.js';
import { GameRegistry } from '@party/game-engine';

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
      socket.data.roomId = room.id;

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
  socket.on('room:join', async (payload, callback) => {
    const code = payload?.code || payload?.roomCode;
    if (!code) {
      if (callback) callback({ error: 'Room code is required' });
      return;
    }

    const room = roomManager.getRoomByCode(code);
    if (!room) {
      // Distinct codes so the client can say *why* rather than "join failed".
      const msg = 'No room found with that code. Check the code and try again.';
      socket.emit('room:error', { code: 'NOT_FOUND', message: msg });
      if (callback) callback({ error: msg, code: 'NOT_FOUND' });
      return;
    }

    try {
      if (roomManager.isKicked(room.id, user.id)) {
        if (callback) callback({ error: 'You were removed from this room by the host.' });
        return;
      }

      if (room.isPrivate) {
        // A saturated database pool used to leave this handler awaiting forever:
        // no ack, no error, and the client gave up on its own timer with a
        // "request timed out" message. Bound the wait so a slow database
        // answers with something the user can act on.
        const SLOW_DB = Symbol('slow-db');
        const invited = await Promise.race<boolean | typeof SLOW_DB>([
          hasValidRoomInvite(user.id, room.id),
          new Promise<typeof SLOW_DB>((resolve) => setTimeout(() => resolve(SLOW_DB), 5000)),
        ]);

        if (invited === SLOW_DB) {
          if (callback) callback({ error: 'The server is busy checking your invitation. Please try again.' });
          return;
        }

        if (!invited) {
          if (callback) callback({ error: 'This room is private. Ask the host for an invitation.' });
          socket.emit('room:error', { code: 'PRIVATE_ROOM', message: 'This room is private.' });
          return;
        }
      }

      // Checked before joining rather than by catching the manager's throw: a
      // full room is an ordinary outcome the user needs to be told about, not
      // an exception to be flattened into "join failed".
      const alreadySeated = room.players.some((p) => p.id === user.id);
      if (!alreadySeated && room.players.length >= (room.settings?.maxPlayers ?? 8)) {
        const msg = 'This room is full. Ask the host for a spot.';
        socket.emit('room:error', { code: 'ROOM_FULL', message: msg });
        if (callback) callback({ error: msg, code: 'ROOM_FULL' });
        return;
      }

      const result = roomManager.joinRoom(room.id, user);
      if (!result) {
        if (callback) callback({ error: 'Failed to join room', code: 'JOIN_FAILED' });
        return;
      }

      updateRoomDefaultRolesIfUncustomized(result.room);
      socket.join(`room:${room.id}`);
      socket.data.roomId = room.id;

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
      const code = /full/i.test(err.message || '') ? 'ROOM_FULL' : 'JOIN_FAILED';
      socket.emit('room:error', { code, message: err.message });
      if (callback) callback({ error: err.message, code });
    }
  });

  // ─── Rejoin after a refresh or reconnect ────────────────────────
  // The room store is memory-only on the client, so a refresh wipes it and the
  // lobby has no room to render. This is how a page that finds itself without a
  // room asks the server which one it belongs to, instead of spinning forever.
  socket.on('room:sync', (_payload, callback) => {
    const room = roomManager.reconnectPlayer(user.id);
    if (!room) {
      if (callback) callback({ error: 'You are not in a room' });
      return;
    }

    socket.join(`room:${room.id}`);
    socket.data.roomId = room.id;
    socket.emit('room:state', room);
    if (callback) callback({ success: true, room });
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
    roomManager.kickPlayer(roomId, targetUserId);
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

  // ─── Change Game in Lobby ───────────────────────────────────────
  /**
   * Everything the lobby card for one game can write. Switching games has to
   * clear these or the new game starts on the old game's configuration — a
   * Number Grid room that becomes Spyfall still carrying `gameSettings` is
   * harmless, but a room that becomes Number Grid would keep Codenames' word
   * file and RPS' `rpsTargetScore` in a settings blob nothing reads.
   *
   * Anything not listed survives, so `name`, `maxPlayers` and `isPrivate` — the
   * parts that describe the room rather than the game — are left alone.
   */
  const GAME_SPECIFIC_SETTINGS = [
    'gameSettings',
    'hostMode',
    'roundDurationSeconds',
    'codenamesGameMode',
    'codenamesWordFileId',
    'codenamesWordSource',
    'codenamesClueTimeSeconds',
    'codenamesGuessTimeSeconds',
    'rpsGameMode',
    'rpsRoundDurationSeconds',
    'rpsTargetScore',
    'roleCounts',
    'roleAssignmentMode',
    'isRoleConfigurationCustomized',
    'werewolfTieRule',
  ];

  socket.on('room:change_game', (payload, callback) => {
    const { roomId, gameType } = payload || {};
    const room = roomId ? roomManager.getRoom(roomId) : undefined;

    if (!room || room.hostId !== user.id) {
      if (callback) callback({ error: 'Only the Host can change the game' });
      return;
    }

    // The runner holds live round state. Swapping the game out from under it
    // would leave two sources of truth, so a running round has to be ended
    // deliberately first.
    if (room.status === 'playing') {
      if (callback) callback({ error: 'Return the room to the lobby before changing the game' });
      return;
    }

    const gameDef = GameRegistry.getInstance().get(gameType);
    if (!gameDef) {
      if (callback) callback({ error: `Unknown game "${gameType}"` });
      return;
    }

    if (gameType === room.gameType) {
      if (callback) callback({ error: 'The room is already set to that game' });
      return;
    }

    // A definition's `minPlayers` is its *loosest* mode. Codenames declares 2
    // for its two-player co-op variant but classic play needs 4, so trusting
    // `minPlayers` alone would let a host switch into a lobby that cannot start.
    // `game:start` applies the same split a moment later.
    const MIN_SEATED: Record<string, number> = { codenames: 4 };
    const minSeated = MIN_SEATED[gameType] ?? gameDef.minPlayers;

    // The roster is carried over, not reset, so a room that has grown past a
    // smaller game's limit is refused here rather than at start time. Kicking
    // players is the host's way down.
    const seated = room.players.length;
    if (seated < minSeated) {
      if (callback) {
        callback({
          error: `${gameDef.name} needs at least ${minSeated} players — ${seated} in the room.`,
        });
      }
      return;
    }
    if (seated > gameDef.maxPlayers) {
      if (callback) {
        callback({
          error: `${gameDef.name} allows at most ${gameDef.maxPlayers} players — ${seated} in the room.`,
        });
      }
      return;
    }

    const nextSettings: Record<string, unknown> = { ...(room.settings || {}) };
    for (const key of GAME_SPECIFIC_SETTINGS) delete nextSettings[key];

    room.gameType = gameType;
    room.settings = nextSettings as typeof room.settings;
    // Werewolf and Salem are always run with a moderator, whatever the previous
    // game had selected.
    if (gameType === 'werewolf' || gameType === 'salem') {
      room.settings = { ...room.settings, hostMode: true };
    }
    updateRoomDefaultRolesIfUncustomized(room);
    room.players.forEach((p) => {
      p.isReady = false;
    });

    io.to(`room:${room.id}`).emit('room:state', room);
    io.to(`room:${room.id}`).emit('room:updated', room);
    if (callback) callback({ success: true, room });
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

    // The lobby card is not a trust boundary: this handler accepts whatever is
    // posted. Number Grid's round config is validated so a bad grid size is
    // refused rather than stored, broadcast to every player and then silently
    // rewritten by the engine's clamp.
    let patch = settings;
    if (room.gameType === 'number-grid' && settings?.gameSettings) {
      const checked = validateNumberGridSettings(settings.gameSettings);
      if (!checked.ok) {
        if (callback) callback({ error: checked.error });
        return;
      }
      patch = { ...settings, gameSettings: checked.settings };
    }

    const updatedSettings = { ...room.settings, ...patch };
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
