import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';

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
      const searchTerm = `%${result.data.q}%`;
      const searchResults = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          status: users.status,
        })
        .from(users)
        .where(
          or(
            ilike(users.username, searchTerm),
            ilike(users.displayName, searchTerm)
          )
        )
        .limit(20);

      return searchResults;
    } catch (err) {
      return [];
    }
  });
};

export default userRoutes;
