import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { and, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { friendships } from '../db/schema.js';
import { presence } from '../socket/presence.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/users/me', { preHandler: [requireAuth] }, async (request) => {
    return request.user;
  });

  fastify.put('/api/users/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      displayName: z.string().min(1).max(50),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error });
    }

    try {
      const [updatedUser] = await db
        .update(users)
        .set({ displayName: result.data.displayName, updatedAt: new Date() })
        .where(eq(users.id, request.user.id))
        .returning();

      return updatedUser || { ...request.user, displayName: result.data.displayName };
    } catch (err) {
      // Return updated in-memory user if DB is offline or user is guest
      return { ...request.user, displayName: result.data.displayName };
    }
  });

  fastify.get('/api/users/search', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      q: z.string().min(1),
    });

    const result = schema.safeParse(request.query);
    if (!result.success) {
      return reply.status(400).send({ error: 'Search query is required' });
    }

    try {
      const term = result.data.q.trim();
      // A raw % or _ in the query would widen the match and let a search box
      // enumerate the whole user table, so they are escaped as literals.
      const searchTerm = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

      const searchResults = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          and(
            ne(users.id, request.user.id),
            or(
              ilike(users.username, searchTerm),
              ilike(users.displayName, searchTerm)
            )
          )
        )
        .limit(20);

      if (searchResults.length === 0) return [];

      const viewerId = request.user.id;
      const relations = await db
        .select({
          id: friendships.id,
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
          status: friendships.status,
        })
        .from(friendships)
        .where(
          and(
            inArray(
              or(
                eq(friendships.requesterId, viewerId),
                eq(friendships.addresseeId, viewerId)
              )!,
              searchResults.map((u) => u.id)
            ),
          )
        );

      const byUserId = new Map(
        relations.map((r) => [r.requesterId === viewerId ? r.addresseeId : r.requesterId, r])
      );

      return searchResults.map((u) => {
        const rel = byUserId.get(u.id);
        let relationship: 'NOT_FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'BLOCKED' =
          'NOT_FRIENDS';
        if (rel) {
          if (rel.status === 'accepted') relationship = 'FRIENDS';
          else if (rel.status === 'blocked') relationship = 'BLOCKED';
          else relationship = rel.requesterId === viewerId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED';
        }
        // The id is only handed over for an incoming request, which is the one
        // case where the viewer is allowed to act on it.
        const actionable = relationship === 'REQUEST_RECEIVED' && rel ? { friendshipId: rel.id } : {};
        return { ...u, isOnline: presence.isUserOnline(u.id), relationship, ...actionable };
      });
    } catch (err) {
      return [];
    }
  });
};

export default userRoutes;
