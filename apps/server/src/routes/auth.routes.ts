import type { FastifyPluginAsync } from 'fastify';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../auth/auth.js';
import { db } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import { randomUUID } from 'crypto';

import { guestSessions } from '../auth/guest-sessions.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/auth/dev-login', async (request, reply) => {
    const body = (request.body as any) || {};
    const displayName = body.displayName || `Player ${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = randomUUID();

    try {
      const [user] = await db.insert(users).values({
        name: displayName,
        displayName,
        username: `player_${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'online',
        isGuest: true,
      }).returning();

      if (user) {
        await db.insert(sessions).values({
          userId: user.id,
          token,
          expiresAt,
        });

        // Also record in memory for instant availability
        guestSessions.set(token, {
          user: {
            id: user.id,
            name: user.name || displayName,
            displayName: user.displayName || displayName,
            username: user.username || `player_${user.id.slice(0, 5)}`,
            avatarUrl: user.avatarUrl || undefined,
            status: 'online',
            isGuest: true,
          },
          expiresAt,
        });

        reply.setCookie('better-auth.session_token', token, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          expires: expiresAt,
        });

        return {
          user: {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
          token,
        };
      }
    } catch (err) {
      console.warn('[DevAuth] Database insert skipped or unavailable, using in-memory guest session');
    }

    // Resilient fallback when Postgres is unavailable or credentials mismatch
    const fallbackId = 'guest_' + randomUUID().substring(0, 8);
    const fallbackUser = {
      id: fallbackId,
      name: displayName,
      displayName,
      username: `player_${Math.floor(10000 + Math.random() * 90000)}`,
      avatarUrl: undefined,
      status: 'online',
      isGuest: true,
    };

    guestSessions.set(token, {
      user: fallbackUser,
      expiresAt,
    });

    reply.setCookie('better-auth.session_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      expires: expiresAt,
    });

    return {
      user: {
        id: fallbackUser.id,
        displayName: fallbackUser.displayName,
        avatarUrl: fallbackUser.avatarUrl,
      },
      token,
    };
  });

  fastify.all('/api/auth/*', async (request, reply) => {
    return toNodeHandler(auth)(request.raw, reply.raw);
  });
};

export default authRoutes;
