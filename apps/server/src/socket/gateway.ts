import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { auth } from '../auth/auth.js';
import { presence } from './presence.js';
import { roomManager } from '../rooms/room-manager.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerGameHandlers } from './handlers/game.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerFriendHandlers } from './handlers/friend.handler.js';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

import { guestSessions } from '../auth/guest-sessions.js';
import { setIo } from './io-ref.js';

export const initSocketGateway = (fastify: FastifyInstance) => {
  const io = new Server(fastify.server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  presence.init(io);
  setIo(io);

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

  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    if (!userId) return;

    socket.join(`user:${userId}`);

    // Handlers go on synchronously, before any await. The client treats the
    // socket as usable the moment it sees 'connect', so an await here (presence
    // is a network round trip) opens a window where its first emit — room:join,
    // game:start — reaches a socket with no listener and is silently dropped.
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerFriendHandlers(io, socket);

    // Presence is bookkeeping, not a gate on being able to act.
    presence.userConnected(userId, socket.id).catch(() => {});

    socket.on('disconnect', () => {
      presence.userDisconnected(userId, socket.id).catch(() => {});

      // Release the room seat. Without this a lobby whose host closed the tab
      // was never freed: `room:leave` only fires on an explicit click, so the
      // room sat in memory until the 2-hour TTL with its creator still marked
      // connected. markDisconnected keeps the seat so a refresh rejoins as the
      // same player; the sweep reclaims the room once nobody is connected.
      const roomId = socket.data.roomId;
      if (roomId) {
        roomManager.markDisconnected(roomId, userId);
        socket.leave(`room:${roomId}`);
      }
    });
  });

  return io;
};
