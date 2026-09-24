import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { auth } from '../auth/auth.js';
import { presence } from './presence.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerGameHandlers } from './handlers/game.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerFriendHandlers } from './handlers/friend.handler.js';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

import { guestSessions } from '../auth/guest-sessions.js';

export const initSocketGateway = (fastify: FastifyInstance) => {
  // Graceful Redis connection with memory fallback
  let adapter: any = undefined;
  try {
    const pubClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    const subClient = pubClient.duplicate();
    pubClient.on('error', () => {});
    subClient.on('error', () => {});
    
    // Attempt connecting in background, non-blocking
    pubClient.connect().catch(() => {});
    subClient.connect().catch(() => {});
  } catch (err) {
    console.warn('[SocketGateway] Redis not available, running in single-node memory mode');
  }

  const io = new Server(fastify.server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  presence.init(io);

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const token = socket.handshake.auth?.token;

      let headers = new Headers();
      if (cookieHeader) headers.set('cookie', cookieHeader);
      if (token) headers.set('authorization', `Bearer ${token}`);

      let session: any = await auth.api.getSession({ headers }).catch(() => null);

      // Direct DB lookup fallback
      if (!session || !session.user) {
        let sessionToken = token;
        if (!sessionToken && cookieHeader) {
          const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
          if (match && match[1]) sessionToken = match[1].trim();
        }

        if (sessionToken) {
          const guestSess = guestSessions.get(sessionToken);
          if (guestSess) {
            session = { session: { id: sessionToken, userId: guestSess.user.id }, user: guestSess.user };
          } else {
            try {
              const dbSession = await db.query.sessions.findFirst({
                where: eq(sessions.token, sessionToken),
                with: { user: true },
              });

              if (dbSession && dbSession.user && new Date(dbSession.expiresAt) > new Date()) {
                session = { session: dbSession, user: dbSession.user };
              }
            } catch (err) {
              // Ignore DB lookup errors
            }
          }
        }
      }

      // Guest / Dev player fallback passed in socket auth
      if (!session && socket.handshake.auth?.user) {
        const guest = socket.handshake.auth.user;
        if (guest?.id) {
          socket.data.user = {
            id: guest.id,
            username: guest.username || guest.displayName || 'Player',
            displayName: guest.displayName || guest.name || 'Player',
          };
          return next();
        }
      }

      if (!session || !session.user) {
        // Fallback: Anonymous guest player so socket connection is never blocked
        const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
        socket.data.user = {
          id: guestId,
          username: 'player_' + guestId.slice(-4),
          displayName: 'Player ' + guestId.slice(-4).toUpperCase(),
        };
        return next();
      }

      socket.data.user = {
        id: session.user.id,
        username: (session.user as any).username || session.user.name,
        displayName: session.user.name || (session.user as any).displayName || 'Player',
      };
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.user?.id;
    if (!userId) return;

    socket.join(`user:${userId}`);
    await presence.userConnected(userId, socket.id);

    // Register handlers
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerFriendHandlers(io, socket);

    socket.on('disconnect', async () => {
      await presence.userDisconnected(userId, socket.id);
    });
  });

  return io;
};
