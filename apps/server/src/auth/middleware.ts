import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { auth } from './auth.js';
import { db } from '../db/client.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { guestSessions } from './guest-sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: any;
    session: any;
  }
}

/**
 * Resolves the session for a request without ever replying. `requireAuth` is
 * unusable for public-but-personalised routes: it sends its own 401, so a
 * try/catch around it still leaves the response already written.
 */
export const resolveRequestSession = async (request: FastifyRequest) => {
  // 1. Try Better Auth getSession
  let session: any = await auth.api
    .getSession({
      headers: request.headers,
    })
    .catch(() => null);

  // 2. Fallback: check session token directly in Postgres
  if (!session || !session.user) {
    const cookieHeader = request.headers.cookie;
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (cookieHeader) {
      const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match && match[1]) token = match[1].trim();
    }
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (token) {
      try {
        const dbSession = await db.query.sessions.findFirst({
          where: eq(sessions.token, token),
          with: { user: true },
        });

        if (dbSession && dbSession.user && new Date(dbSession.expiresAt) > new Date()) {
          session = {
            session: dbSession,
            user: dbSession.user,
          };
        }
      } catch (err) {
        // Ignore DB query errors
      }

      // 3. Fallback: Check in-memory guestSessions
      if (!session || !session.user) {
        const guestSess = guestSessions.get(token);
      if (guestSess && new Date(guestSess.expiresAt) > new Date()) {
        session = {
          session: { id: token, userId: guestSess.user.id },
          user: guestSess.user,
        };
      } else if (token.startsWith('guest_') || token.startsWith('dev-')) {
        session = {
          session: { id: token, userId: token },
          user: {
            id: token,
            displayName: 'Guest Player',
            username: 'guest',
            status: 'online',
            isGuest: true,
          },
        };
      }
    }
  }
}

  return session?.user ? { session: session.session, user: session.user } : null;
};

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const resolved = await resolveRequestSession(request);
  if (!resolved) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  request.user = resolved.user;
  request.session = resolved.session;
};

const authMiddlewarePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('session', null);
};

export default fp(authMiddlewarePlugin);
