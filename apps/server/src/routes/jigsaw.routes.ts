import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { jigsawImages } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { decodeDataUrl, MAX_IMAGE_BYTES } from '../jigsaw/image-decode.js';
import { roomManager } from '../rooms/room-manager.js';

const MAX_IMAGES_PER_USER = 20;

const jigsawRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Upload a picture ──────────────────────────────────────────
  fastify.post(
    '/api/jigsaw/images',
    {
      preHandler: [requireAuth],
      // The default 1 MB is below what a data URL costs once base64-encoded.
      bodyLimit: Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 64 * 1024,
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { dataUrl, name } = (request.body as any) || {};

      const decoded = decodeDataUrl(dataUrl);
      if (!decoded.ok) {
        return reply.status(400).send({ error: decoded.error });
      }

      const existing = await db
        .select({ id: jigsawImages.id })
        .from(jigsawImages)
        .where(eq(jigsawImages.ownerId, userId));
      if (existing.length >= MAX_IMAGES_PER_USER) {
        return reply.status(400).send({
          error: `You can keep up to ${MAX_IMAGES_PER_USER} pictures. Delete one before uploading another.`,
        });
      }

      const id = randomUUID();
      const label = String(name || 'Puzzle picture').trim().slice(0, 120) || 'Puzzle picture';

      await db.insert(jigsawImages).values({
        id: id as any,
        ownerId: userId,
        name: label,
        width: decoded.image.width,
        height: decoded.image.height,
        mimeType: decoded.image.mimeType,
        data: dataUrl as string,
      });

      return reply.status(201).send({
        image: {
          id,
          name: label,
          width: decoded.image.width,
          height: decoded.image.height,
          mimeType: decoded.image.mimeType,
        },
      });
    }
  );

  // ─── Fetch one picture ─────────────────────────────────────────
  fastify.get('/api/jigsaw/images/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user.id;
    const { id } = request.params as { id: string };

    const rows = await db.select().from(jigsawImages).where(eq(jigsawImages.id, id as any));
    const row = rows[0];
    if (!row) return reply.status(404).send({ error: 'Picture not found.' });

    // Never a guessable public URL. The owner always has access; everyone else
    // needs a seat in the room that is playing this picture, which is the only
    // other place an id can become known.
    if (row.ownerId !== userId) {
      const room = roomManager.getRoomByPlayer(userId);
      const roomImageId = (room?.settings as any)?.gameSettings?.imageId;
      if (room?.gameType !== 'jigsaw' || roomImageId !== id) {
        return reply.status(403).send({ error: 'You do not have access to this picture.' });
      }
    }

    return {
      image: {
        id: row.id,
        name: row.name,
        width: row.width,
        height: row.height,
        mimeType: row.mimeType,
        data: row.data,
      },
    };
  });

  // ─── Delete a picture ──────────────────────────────────────────
  fastify.delete('/api/jigsaw/images/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user.id;
    const { id } = request.params as { id: string };

    // Ownership is checked before the delete, not after — a returning row would
    // otherwise mean the row is already gone.
    const rows = await db
      .select({ ownerId: jigsawImages.ownerId })
      .from(jigsawImages)
      .where(eq(jigsawImages.id, id as any));
    const row = rows[0];
    if (!row) return reply.status(404).send({ error: 'Picture not found.' });
    if (row.ownerId !== userId) {
      return reply.status(403).send({ error: 'You can only delete your own pictures.' });
    }

    await db.delete(jigsawImages).where(eq(jigsawImages.id, id as any));
    return { success: true };
  });
};

export default jigsawRoutes;