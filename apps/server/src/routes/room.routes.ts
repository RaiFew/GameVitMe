import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { roomManager } from '../rooms/room-manager.js';
import { GameRegistry } from '@party/game-engine';
import { z } from 'zod';

const roomRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/games', async () => {
    return GameRegistry.getInstance().listGames();
  });

  fastify.get('/api/rooms/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = roomManager.getRoomByCode(code.toUpperCase());

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    // Return safe data for QR/Join page
    return {
      code: room.code,
      name: room.name,
      gameType: room.gameType,
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: room.settings.maxPlayers,
    };
  });

  fastify.post('/api/rooms', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(50),
      gameType: z.string().optional(),
      maxPlayers: z.number().min(1).max(100).default(8),
      isPrivate: z.boolean().default(false),
      hostMode: z.boolean().optional(),
      roundDurationSeconds: z.number().optional(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid settings', details: result.error });
    }

    try {
      const room = roomManager.createRoom(request.user.id, result.data);
      const isHostForced = result.data.gameType === 'werewolf' || result.data.gameType === 'salem';
      const isCodenames = result.data.gameType === 'codenames';
      const isNumberGrid = result.data.gameType === 'number-grid';

      room.settings = {
        ...room.settings,
        hostMode: isHostForced ? true : isCodenames || isNumberGrid ? false : result.data.hostMode !== false,
        roundDurationSeconds: Number(result.data.roundDurationSeconds) || 480,
      };

      const joinResult = roomManager.joinRoom(room.id, {
        id: request.user.id,
        username: request.user.username || request.user.name || 'Player',
        displayName: request.user.displayName || request.user.name || 'Player',
      });

      return {
        code: room.code,
        roomCode: room.code,
        roomId: room.id,
        room: joinResult ? joinResult.room : room,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to create room' });
    }
  });
};

export default roomRoutes;
