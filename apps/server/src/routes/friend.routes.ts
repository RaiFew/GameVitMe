import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { friendships } from '../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

const friendRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/friends', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user.id;
    if (request.user.isGuest || userId.startsWith('guest_')) {
      return [];
    }

    try {
      const friends = await db.query.friendships.findMany({
        where: and(
          or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
          eq(friendships.status, 'accepted')
        ),
        with: {
          requester: true,
          addressee: true,
        },
      });

      return friends.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
    } catch (err) {
      console.warn('[Friends] Database unavailable, returning empty friend list');
      return [];
    }
  });

  fastify.get('/api/friends/requests', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user.id;
    if (request.user.isGuest || userId.startsWith('guest_')) {
      return [];
    }

    try {
      return await db.query.friendships.findMany({
        where: and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')),
        with: { requester: true },
      });
    } catch (err) {
      return [];
    }
  });

  fastify.get('/api/friends/sent', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user.id;
    if (request.user.isGuest || userId.startsWith('guest_')) {
      return [];
    }

    try {
      return await db.query.friendships.findMany({
        where: and(eq(friendships.requesterId, userId), eq(friendships.status, 'pending')),
        with: { addressee: true },
      });
    } catch (err) {
      return [];
    }
  });

  fastify.post('/api/friends/request', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({ addresseeId: z.string().uuid() });
    const result = schema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'Invalid addresseeId' });

    const requesterId = request.user.id;
    const { addresseeId } = result.data;

    if (requesterId === addresseeId) {
      return reply.status(400).send({ error: 'Cannot send request to yourself' });
    }

    try {
      const existing = await db
        .select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
            and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return reply.status(400).send({ error: 'Friendship or request already exists' });
      }

      const [newRequest] = await db
        .insert(friendships)
        .values({ requesterId, addresseeId, status: 'pending' })
        .returning();

      return newRequest;
    } catch (err: any) {
      return reply.status(503).send({ error: 'Friend service temporarily unavailable' });
    }
  });

  fastify.post('/api/friends/accept', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({ friendshipId: z.string().uuid() });
    const result = schema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'Invalid friendshipId' });

    try {
      const [updated] = await db
        .update(friendships)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(
          and(
            eq(friendships.id, result.data.friendshipId),
            eq(friendships.addresseeId, request.user.id),
            eq(friendships.status, 'pending')
          )
        )
        .returning();

      if (!updated) return reply.status(404).send({ error: 'Request not found or unauthorized' });
      return updated;
    } catch (err: any) {
      return reply.status(503).send({ error: 'Friend service temporarily unavailable' });
    }
  });

  fastify.post('/api/friends/reject', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({ friendshipId: z.string().uuid() });
    const result = schema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'Invalid friendshipId' });

    try {
      const deleted = await db
        .delete(friendships)
        .where(
          and(
            eq(friendships.id, result.data.friendshipId),
            eq(friendships.addresseeId, request.user.id),
            eq(friendships.status, 'pending')
          )
        )
        .returning();

      if (deleted.length === 0) return reply.status(404).send({ error: 'Request not found' });
      return { success: true };
    } catch (err: any) {
      return reply.status(503).send({ error: 'Friend service temporarily unavailable' });
    }
  });

  fastify.delete('/api/friends/:friendshipId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { friendshipId } = request.params as any;

    try {
      const deleted = await db
        .delete(friendships)
        .where(
          and(
            eq(friendships.id, friendshipId),
            or(eq(friendships.requesterId, request.user.id), eq(friendships.addresseeId, request.user.id))
          )
        )
        .returning();

      if (deleted.length === 0) return reply.status(404).send({ error: 'Friendship not found' });
      return { success: true };
    } catch (err: any) {
      return reply.status(503).send({ error: 'Friend service temporarily unavailable' });
    }
  });
};

export default friendRoutes;
