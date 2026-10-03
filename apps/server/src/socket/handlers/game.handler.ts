import type { Server, Socket } from 'socket.io';
import { roomManager } from '../../rooms/room-manager.js';
import { RoomRunner, GameRegistry } from '@party/game-engine';
import { db } from '../../db/client.js';
import { gameSessions, rooms } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getCodenamesWordFile } from '../../routes/codenames.routes.js';
import { getSpyfallLocationSets } from '../../routes/spyfall.routes.js';
import { MIN_SPYFALL_LOCATIONS } from '@party/spyfall';
import { clampCodenamesTimer } from '../../rooms/settings-validation.js';
import { isRankedVariant } from '@party/number-grid';
import type { RankedRunResult } from '@party/number-grid';
import { recordRankedResult, resolveRankedUser } from '../../ranking/ranking.service.js';

/**
 * Writes a finished ranked run to the board.
 *
 * The result object is built by the engine from state only the server holds, so
 * nothing here is client-supplied. Guests are re-checked rather than trusted
 * from the start gate, because a run can outlive the session that began it.
 */
const persistRankedResult = (userId: string | undefined, summary: unknown) => {
  const rankedResult = (summary as { rankedResult?: RankedRunResult } | undefined)?.rankedResult;
  if (!rankedResult || !userId) return;
  recordRankedResult(userId, rankedResult).catch((err) => {
    console.warn('[GameHandler] Failed to record ranked result:', err);
  });
};

export const registerGameHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;

  socket.on('game:start', async (payload, callback) => {
    const { roomId, roundDurationSeconds: customDuration, settings: startSettings } = payload || {};
    const room = roomManager.getRoom(roomId);

    if (!room || !room.gameType) {
      if (callback) callback({ error: 'Room not found or no game selected' });
      return;
    }

    const gameDef = GameRegistry.getInstance().get(room.gameType);
    if (!gameDef) {
      if (callback) callback({ error: `Game "${room.gameType}" not registered` });
      return;
    }

    const isHostForcedGame = room.gameType === 'werewolf' || room.gameType === 'salem';

    // A ranked run is an ordinary run in an ordinary room: same room, same
    // runner, same click handling, same reconnect path. The only differences
    // are the server-owned variant and the requirement to be a real account.
    const requestedVariant = (room.settings as any)?.gameSettings?.variant as string | undefined;
    const isRanked = room.gameType === 'number-grid' && isRankedVariant(requestedVariant);
    if (isRanked) {
      // `socket.data.user` is not an identity: the gateway falls back to
      // client-supplied handshake auth, so anyone can claim any id. Only a row
      // in `users` that is not a guest may score.
      const auth = await resolveRankedUser(user?.id);
      if (!auth.ok) {
        const msg = 'Ranked play requires a registered account. Sign in to record a score.';
        socket.emit('game:action_error', { code: 'RANKED_LOGIN_REQUIRED', message: msg });
        if (callback) callback({ error: msg });
        return;
      }
      if (room.players.length > 1) {
        const msg = 'Ranked runs are played alone. Start a new ranked run.';
        socket.emit('game:action_error', { code: 'RANKED_NOT_SOLO', message: msg });
        if (callback) callback({ error: msg });
        return;
      }
    }

    const hostMode = isRanked
      ? false
      : isHostForcedGame
        ? true
        : room.settings?.hostMode !== false;

    // In Host Mode, only host can start
    if (hostMode && room.hostId !== user.id) {
      if (callback) callback({ error: 'Only the Host can start the round' });
      return;
    }

    // Player count validation
    const isCodenames = room.gameType === 'codenames';
    const codenamesGameMode = ((room.settings as any)?.codenamesGameMode || 'CLASSIC') as 'CLASSIC' | 'TWO_PLAYER';
    const isCodenamesTwoPlayer = isCodenames && codenamesGameMode === 'TWO_PLAYER';

    const isRPS = room.gameType === 'rock-paper-scissors';
    const rpsGameMode = ((room.settings as any)?.rpsGameMode || (room.players.length === 2 ? 'DUEL' : 'BATTLE_ROYALE')) as 'DUEL' | 'BATTLE_ROYALE' | 'POINTS_RACE';
    const isRPSDuel = isRPS && rpsGameMode === 'DUEL';

    if (isCodenamesTwoPlayer) {
      if (room.players.length !== 2) {
        const msg = '2-Player Codenames requires exactly 2 players.';
        socket.emit('game:action_error', { code: 'INVALID_PLAYER_COUNT', message: msg });
        if (callback) callback({ error: msg });
        return;
      }
    } else if (isRPS) {
      const playingCount = hostMode ? room.players.filter((p) => p.id !== room.hostId).length : room.players.length;
      if (isRPSDuel) {
        if (playingCount !== 2) {
          const msg = hostMode
            ? 'Rock Paper Scissors (1v1 Duel in Host Mode) requires 1 Host + 2 Fighters (3 users total).'
            : 'Rock Paper Scissors (Duel) requires exactly 2 players.';
          socket.emit('game:action_error', { code: 'INVALID_PLAYER_COUNT', message: msg });
          if (callback) callback({ error: msg });
          return;
        }
      } else {
        if (playingCount < 2) {
          const msg = hostMode
            ? 'Rock Paper Scissors in Host Mode requires 1 Host + at least 2 Fighters (3 users minimum).'
            : 'Rock Paper Scissors requires at least 2 players.';
          socket.emit('game:action_error', { code: 'NOT_ENOUGH_PLAYERS', message: msg });
          if (callback) callback({ error: msg });
          return;
        }
      }
    } else if (room.gameType === 'number-grid') {
      const playingCount = hostMode ? room.players.filter((p) => p.id !== room.hostId).length : room.players.length;
      if (playingCount < 1) {
        const msg = hostMode
          ? 'Number Grid in Host Mode requires 1 Host + at least 1 player (2 users minimum).'
          : 'Number Grid requires at least 1 player to start.';
        socket.emit('game:action_error', { code: 'NOT_ENOUGH_PLAYERS', message: msg });
        if (callback) callback({ error: msg });
        return;
      }
    } else {
      const minRequired = isHostForcedGame ? (hostMode ? 5 : 4) : isCodenames ? 4 : (hostMode ? 5 : 4);
      const maxRequired = isCodenames ? 20 : (hostMode ? 13 : 12);

      if (room.players.length < minRequired) {
        const msg = isCodenames
          ? 'Codenames requires at least 4 players (2 per team).'
          : isHostForcedGame
          ? `${room.gameType === 'salem' ? 'Salem 1692' : 'Werewolf'} requires 1 Host Moderator and at least 4 players (5 users minimum).`
          : hostMode
          ? `Need at least 5 users (1 Host + 4 players) to start in Host Mode.`
          : `Need at least 4 players to start in No Host Mode.`;
        socket.emit('game:action_error', { code: 'NOT_ENOUGH_PLAYERS', message: msg });
        if (callback) callback({ error: msg });
        return;
      }
    }

    // Salem has no role slots: its Witch/Constable cards are physical, so the
    // roster-count gate applies to Werewolf only.
    if (room.gameType === 'werewolf') {
      const playingCount = hostMode ? room.players.filter(p => p.id !== room.hostId).length : room.players.length;
      const roleCounts = (room.settings?.roleCounts || {}) as Record<string, number>;
      const totalConfiguredRoles = Object.values(roleCounts).reduce((a, b) => a + Number(b || 0), 0);

      if (totalConfiguredRoles < playingCount) {
        const msg = 'Role configuration is incomplete';
        socket.emit('game:action_error', { code: 'ROLE_CONFIG_INCOMPLETE', message: msg });
        if (callback) callback({ error: msg });
        return;
      }

      if (totalConfiguredRoles > playingCount) {
        const msg = 'Too many roles configured';
        socket.emit('game:action_error', { code: 'TOO_MANY_ROLES', message: msg });
        if (callback) callback({ error: msg });
        return;
      }
    }

    try {
      room.status = 'playing';

      // Create DB game session record (optional persistence, do not block game if room is in-memory)
      const sessionId = randomUUID();
      try {
        const existingRoom = await db.query.rooms.findFirst({
          where: eq(rooms.id, room.id),
        }).catch(() => null);

        await db.insert(gameSessions).values({
          id: sessionId,
          roomId: existingRoom ? room.id : null,
          gameType: room.gameType,
          status: 'active',
        });
      } catch (dbErr) {
        console.warn('[GameHandler] DB session insert skipped or failed:', dbErr);
      }

      // Clean up previous game runner if one exists (e.g. on rematch/play again)
      if ((room as any).gameRunner) {
        try {
          ((room as any).gameRunner as RoomRunner).destroy();
        } catch (destroyErr) {
          console.warn('[GameHandler] Error destroying previous runner:', destroyErr);
        }
        delete (room as any).gameRunner;
      }

      // Initialize RoomRunner
      const runner = new RoomRunner(room.gameType, room.id, sessionId);

      runner.setPlayers(
        room.players.map((p) => ({
          id: p.id,
          seatNumber: p.seatNumber,
          displayName: p.displayName,
          isConnected: p.connected,
        })),
      );

      // Broadcast to all sockets in room
      runner.setBroadcast((event, data) => {
        io.to(`room:${room.id}`).emit(event as any, data);
      });

      // Direct message to individual player (anti-cheat channel)
      runner.setEmitToPlayer((playerId, event, data) => {
        io.to(`user:${playerId}`).emit(event as any, data);
      });

      // End game handler (called on win, unanimous vote, or timer expiration)
      runner.setOnGameEnd((endResult) => {
        room.status = 'finished';

        persistRankedResult(user?.id, endResult.data);

        io.to(`room:${room.id}`).emit('game:finished' as any, {
          winners: endResult.winners,
          summary: endResult.data,
        });

        // Update DB session
        db.update(gameSessions)
          .set({
            status: 'completed',
            endedAt: new Date(),
            winnerData: endResult,
          })
          .where(eq(gameSessions.id, sessionId))
          .catch(console.error);
      });

      // Assemble settings
      const roomSettings = (room.settings as any) || {};
      const customGameSettings: Record<string, unknown> =
        typeof roomSettings.gameSettings === 'object' && roomSettings.gameSettings !== null
          ? roomSettings.gameSettings
          : {};
      // Apply updated duration if specified by host
      const durationSeconds = Number(
        customDuration || startSettings?.roundDurationSeconds || roomSettings.roundDurationSeconds
      ) || 480;

      if (customDuration || startSettings?.roundDurationSeconds) {
        room.settings = {
          ...room.settings,
          roundDurationSeconds: durationSeconds,
        };
      }

      const settings = {
        ...((gameDef.defaultSettings as Record<string, unknown>) || {}),
        ...customGameSettings,
        hostMode,
        hostPlayerId: room.hostId,
        roundDurationSeconds: durationSeconds,
        ...(isHostForcedGame
          ? {
              roleAssignmentMode:
                (customGameSettings.roleAssignmentMode as string) ||
                (roomSettings.roleAssignmentMode as string) ||
                'PHYSICAL',
              roleCounts: roomSettings.roleCounts || customGameSettings.roleCounts,
              werewolfTieRule: roomSettings.werewolfTieRule || 'NO_KILL',
              initialPhase:
                ((customGameSettings.roleAssignmentMode as string) ||
                  (roomSettings.roleAssignmentMode as string) ||
                  'PHYSICAL') === 'PHYSICAL'
                  ? 'ROLE_ASSIGNMENT'
                  : 'ROLE_REVEAL',
            }
          : {}),
      };

      if (room.gameType === 'codenames') {
        const wordSource = (roomSettings.codenamesWordSource || 'DEFAULT') as 'DEFAULT' | 'CUSTOM';
        const wordFileId = roomSettings.codenamesWordFileId as string | undefined;
        let wordPoolSnapshot: string[] | undefined;

        if (wordSource === 'CUSTOM' && wordFileId) {
          try {
            const file = await getCodenamesWordFile(wordFileId, room.hostId);
            if (file && Array.isArray(file.words) && file.words.length >= 25) {
              wordPoolSnapshot = [...file.words];
            } else {
              console.warn('[GameHandler] Custom word file invalid or not found, falling back to default words');
            }
          } catch (err) {
            console.warn('[GameHandler] Error loading custom word file:', err);
          }
        }

        (settings as any).wordSource = wordSource;
        (settings as any).wordFileId = wordFileId;
        (settings as any).gameMode = codenamesGameMode;
        (settings as any).clueTimeSeconds = clampCodenamesTimer(roomSettings.codenamesClueTimeSeconds, 300);
        (settings as any).guessTimeSeconds = clampCodenamesTimer(roomSettings.codenamesGuessTimeSeconds, 600);
        if (wordPoolSnapshot) {
          (settings as any).wordPoolSnapshot = wordPoolSnapshot;
        }
      }

      if (room.gameType === 'spyfall') {
        const locationSource = (roomSettings.spyfallLocationSource || 'DEFAULT') as 'DEFAULT' | 'CUSTOM';
        const fileIds = Array.isArray(roomSettings.spyfallLocationFileIds)
          ? (roomSettings.spyfallLocationFileIds as string[]).slice(0, 3)
          : [];
        // Every enabled set is merged into one pool rather than one winning:
        // the host picks which of their sets are on, and all of them are used.
        let locationPoolSnapshot: { id: string; name: string; roles: string[] }[] | undefined;

        if (locationSource === 'CUSTOM' && fileIds.length > 0) {
          try {
            const sets = await getSpyfallLocationSets(fileIds, room.hostId);
            const merged = sets.flatMap((s) => s.locations).filter((l) => l && l.name && l.roles?.length >= 2);
            // The same floor `setup()` applies, so a set that shrank between the
            // lobby and the start still degrades to the built-ins.
            if (merged.length >= MIN_SPYFALL_LOCATIONS) {
              const seen = new Set<string>();
              locationPoolSnapshot = merged.filter((l) => {
                const key = l.name.toUpperCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            } else {
              console.warn(
                `[GameHandler] Custom location pool has ${merged.length} locations, falling back to built-in locations`
              );
            }
          } catch (err) {
            console.warn('[GameHandler] Error loading custom location sets:', err);
          }
        }

        (settings as any).locationSource = locationSource;
        if (locationPoolSnapshot) {
          (settings as any).locationPoolSnapshot = locationPoolSnapshot;
        }
      }

      if (room.gameType === 'rock-paper-scissors') {
        (settings as any).gameMode = rpsGameMode;
        (settings as any).targetScore = Number(roomSettings.rpsTargetScore) || 3;
        (settings as any).roundDurationSeconds =
          typeof roomSettings.rpsRoundDurationSeconds === 'number'
            ? roomSettings.rpsRoundDurationSeconds
            : 10;
      }

      runner.setup(settings);

      // Store runner instance on room
      (room as any).gameRunner = runner;

      // Notify all players in room that round started
      io.to(`room:${room.id}`).emit('game:started' as any, {
        gameType: room.gameType,
        sessionId,
      });

      // Broadcast initial player views
      runner.broadcastPlayerViews();

      if (callback) callback({ success: true });
    } catch (err: any) {
      room.status = 'waiting';
      if (callback) callback({ error: err.message });
    }
  });

  // ─── Game Move Action ───────────────────────────────────────────
  socket.on('game:action', (payload, callback) => {
    const { roomId, action } = payload || {};
    const room = roomManager.getRoom(roomId);
    const runner = (room as any)?.gameRunner as RoomRunner | undefined;

    if (!room || !runner) {
      if (callback) callback({ error: 'Game not running' });
      return;
    }

    try {
      const move = {
        type: action.type,
        playerId: user.id,
        payload: action.payload,
        timestamp: Date.now(),
      };

      const result = runner.processMove(move);

      if (!result.success) {
        socket.emit('game:action_error', {
          code: 'INVALID_MOVE',
          message: result.error || 'Invalid move',
        });
        if (callback) callback({ error: result.error });
        return;
      }

      // Broadcast updated player views to all players
      runner.broadcastPlayerViews();

      // Check if this move ended the game
      const endResult = runner.checkGameEnd();
      if (endResult) {
        room.status = 'finished';

        persistRankedResult(user?.id, endResult.data);

        io.to(`room:${room.id}`).emit('game:finished' as any, {
          winners: endResult.winners,
          summary: endResult.data,
        });

        // Update DB session
        db.update(gameSessions)
          .set({
            status: 'completed',
            endedAt: new Date(),
            winnerData: endResult,
          })
          .where(eq(gameSessions.id, runner.getSessionId()))
          .catch(console.error);
      }

      if (callback) callback({ success: true });
    } catch (err: any) {
      if (callback) callback({ error: err.message });
    }
  });

  // ─── Game State Sync (Reconnection & Refresh) ───────────────────
  socket.on('game:sync', (payload, callback) => {
    const roomId = payload?.roomId;
    let room = roomId ? roomManager.getRoom(roomId) : undefined;

    // No roomId supplied — fall back to the room this player holds a seat in.
    // This runs on every refresh and reconnect, so it has to be a lookup rather
    // than a scan over every live room.
    if (!room) {
      room = roomManager.getRoomByPlayer(user.id);
    }

    if (room && (room as any).gameRunner) {
      const runner = (room as any).gameRunner as RoomRunner;
      runner.emitPlayerView(user.id);
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ error: 'No active game session' });
    }
  });

  // ─── Rematch & Return to Lobby ──────────────────────────────────
  socket.on('game:return_lobby', (payload, callback) => {
    const { roomId } = payload || {};
    const room = roomId ? roomManager.getRoom(roomId) : undefined;
    if (!room) {
      if (callback) callback({ error: 'Room not found' });
      return;
    }

    // Returning everyone to the lobby destroys the round, so it is the host's
    // call. This handler had no ownership check at all: any seated player could
    // kill a game in progress for everyone else.
    if (room.hostId !== user.id) {
      if (callback) callback({ error: 'Only the Host can return the room to the lobby' });
      return;
    }

    // Destroy runner
    if ((room as any).gameRunner) {
      ((room as any).gameRunner as RoomRunner).destroy();
      delete (room as any).gameRunner;
    }

    room.status = 'waiting';
    // Reset players ready state
    room.players.forEach((p) => {
      p.isReady = false;
    });

    // `connected` is deliberately left alone. It tracks whether a socket is
    // live, and rewriting it here would report absent players as present —
    // `broadcastPlayerViews` would then try to emit to seats nobody is sitting
    // at. A player who comes back is restored by `reconnectPlayer` on connect.

    // Notify room that we are back in lobby
    io.to(`room:${room.id}`).emit('room:state', room);
    io.to(`room:${room.id}`).emit('room:updated', room);
    io.to(`room:${room.id}`).emit('game:returned_to_lobby', { roomCode: room.code });

    if (callback) callback({ success: true, roomCode: room.code });
  });
};
