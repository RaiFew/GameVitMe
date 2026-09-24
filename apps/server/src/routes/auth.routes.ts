import type { FastifyPluginAsync } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
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
  // Official Better Auth adapter for Fastify (preserves CORS, headers, and body parsing)
  fastify.route({
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  url: '/api/auth/*',
  async handler(request, reply) {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const headers = fromNodeHeaders(request.headers);
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      ...(request.body && request.method !== 'GET' && request.method !== 'HEAD'
        ? { body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body) }
        : {}),
    });

    const response = await auth.handler(req);

    reply.status(response.status);
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    const responseBody = response.body ? await response.text() : null;
    return reply.send(responseBody);
  },
});
};

export default authRoutes;
