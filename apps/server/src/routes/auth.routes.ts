import type { FastifyPluginAsync } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/auth.js';
import { db } from '../db/client.js';
import { users, sessions, verifications } from '../db/schema.js';
import { env } from '../config/env.js';
import { randomUUID } from 'crypto';

import { guestSessions } from '../auth/guest-sessions.js';

const HANDOFF_IDENTIFIER = 'oauth-handoff';
const HANDOFF_TTL_MS = 60_000;

export async function issueHandoffCode(sessionToken: string): Promise<string> {
  // Must be a UUID: verifications.id is a uuid column, and Postgres rejects
  // non-uuid strings even in an equality comparison.
  const code = randomUUID();
  await db.insert(verifications).values({
    id: code,
    identifier: HANDOFF_IDENTIFIER,
    value: sessionToken,
    expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
  });
  return code;
}

export async function redeemHandoffCode(
  code: string
): Promise<{ token: string; user: Record<string, unknown> } | null> {
  const row = await db.query.verifications.findFirst({
    where: eq(verifications.id, code),
  });
  if (!row || row.identifier !== HANDOFF_IDENTIFIER) return null;

  // Burn the code before validating the session so a replay can never resolve.
  await db.delete(verifications).where(eq(verifications.id, code));

  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  const dbSession = await db.query.sessions.findFirst({
    where: eq(sessions.token, row.value),
    with: { user: true },
  });
  if (!dbSession?.user || new Date(dbSession.expiresAt) <= new Date()) return null;

  return {
    token: dbSession.token,
    user: {
      id: dbSession.user.id,
      displayName: dbSession.user.displayName || dbSession.user.name,
      avatarUrl: dbSession.user.avatarUrl || undefined,
      username: dbSession.user.username || undefined,
      email: dbSession.user.email || undefined,
    },
  };
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // OAuth landing pad. Reached as a top-level navigation on the API domain, so the
  // session cookie is first-party here even when the browser blocks third-party
  // cookies. Trades that cookie for a single-use code the frontend can redeem.
  fastify.get('/auth/finish', async (request, reply) => {
    const appUrl = (env.VITE_APP_URL || '').replace(/\/$/, '');
    if (!appUrl) {
      return reply.code(500).send('VITE_APP_URL is not configured');
    }

    try {
      const session: any = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session?.session?.token) {
        return reply.redirect(`${appUrl}/?error=no_session`, 302);
      }

      // Must be a UUID: verifications.id is a uuid column, and Postgres rejects
      // non-uuid strings even in an equality comparison.
      const code = await issueHandoffCode(session.session.token);

      return reply.redirect(`${appUrl}/?code=${encodeURIComponent(code)}`, 302);
    } catch (err) {
      console.warn('[auth] /auth/finish handoff failed:', err);
      return reply.redirect(`${appUrl}/?error=handoff_failed`, 302);
    }
  });

  fastify.post('/api/auth/handoff', async (request, reply) => {
    const code = (request.body as any)?.code;
    if (!code) {
      return reply.code(400).send({ error: 'Missing code' });
    }

    const result = await redeemHandoffCode(code);
    if (!result) {
      return reply.code(400).send({ error: 'Invalid, expired, or already used code' });
    }

    return result;
  });

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
  fastify.all('/api/auth/*', async (request, reply) => {
    const proto = (request.headers['x-forwarded-proto'] as string) || (request.headers.host?.includes('railway.app') ? 'https' : 'http');
    const host = (request.headers['x-forwarded-host'] as string) || request.headers.host || 'localhost';
    const url = new URL(request.url, `${proto}://${host}`);
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

    // Collect Set-Cookie values separately — Fastify's reply.header() overwrites
    // previous values for the same key. Set-Cookie must be forwarded as an array
    // so ALL cookies (state cookie + session cookie) are preserved.
    // Without this, the better-auth.state cookie is lost, causing state_mismatch.
    const setCookies: string[] = [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        setCookies.push(value);
      } else {
        reply.header(key, value);
      }
    });
    // Also use getSetCookie() if available (Node 18+) to catch any that forEach missed
    if (typeof (response.headers as any).getSetCookie === 'function') {
      const additional = (response.headers as any).getSetCookie() as string[];
      for (const c of additional) {
        if (!setCookies.includes(c)) setCookies.push(c);
      }
    }
    if (setCookies.length > 0) {
      reply.header('set-cookie', setCookies);
    }

    const responseBody = response.body ? await response.text() : null;
    return reply.send(responseBody);
  });
};

export default authRoutes;
