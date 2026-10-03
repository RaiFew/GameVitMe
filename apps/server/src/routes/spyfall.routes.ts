import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { spyfallLocationSets } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { parseLocationFileContent } from '@party/spyfall';

export interface StoredLocationSet {
  id: string;
  ownerId: string;
  name: string;
  originalFileName: string;
  format: 'CSV' | 'TXT';
  locations: { id: string; name: string; roles: string[] }[];
  locationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_SETS_PER_USER = 3;

// In-memory fallback store, mirroring the Codenames word-file path so the game
// still starts from a custom set if the database is unavailable.
export const inMemoryLocationSets = new Map<string, StoredLocationSet>();

export async function getSpyfallLocationSets(
  fileIds: string[],
  ownerId: string
): Promise<StoredLocationSet[]> {
  const out: StoredLocationSet[] = [];
  for (const fileId of fileIds) {
    const set = await getSpyfallLocationSet(fileId, ownerId);
    if (set) out.push(set);
  }
  return out;
}

export async function getSpyfallLocationSet(
  fileId: string,
  ownerId: string
): Promise<StoredLocationSet | null> {
  try {
    const rows = await db
      .select()
      .from(spyfallLocationSets)
      .where(and(eq(spyfallLocationSets.id, fileId as any), eq(spyfallLocationSets.ownerId, ownerId)));

    if (rows.length > 0) {
      const row = rows[0]!;
      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        originalFileName: row.originalFileName,
        format: row.format as any,
        locations: row.locations,
        locationCount: row.locationCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
  } catch (dbErr) {
    // Fall through to the in-memory store.
  }

  const memorySet = inMemoryLocationSets.get(fileId);
  if (memorySet && memorySet.ownerId === ownerId) return memorySet;
  return null;
}

const spyfallRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── List user's custom location sets ───────────────────────────
  fastify.get(
    '/api/spyfall/location-sets',
    { preHandler: [requireAuth] },
    async (request) => {
      const userId = request.user.id;

      try {
        // Metadata only: the locations can be a hundred KB, and the list is
        // rendered as radio buttons.
        const rows = await db
          .select({
            id: spyfallLocationSets.id,
            ownerId: spyfallLocationSets.ownerId,
            name: spyfallLocationSets.name,
            originalFileName: spyfallLocationSets.originalFileName,
            format: spyfallLocationSets.format,
            locationCount: spyfallLocationSets.locationCount,
            createdAt: spyfallLocationSets.createdAt,
            updatedAt: spyfallLocationSets.updatedAt,
          })
          .from(spyfallLocationSets)
          .where(eq(spyfallLocationSets.ownerId, userId));

        return { sets: rows };
      } catch (dbErr) {
        const sets = Array.from(inMemoryLocationSets.values())
          .filter((s) => s.ownerId === userId)
          .map(({ locations, ...meta }) => meta);
        return { sets };
      }
    }
  );

  // ─── Upload new custom location set ─────────────────────────────
  fastify.post(
    '/api/spyfall/location-sets',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;
      const { name, fileName, content } = (request.body as any) || {};

      if (!content || typeof content !== 'string') {
        return reply.status(400).send({ error: 'File content is required.' });
      }

      const effectiveFileName = String(fileName || 'locations.csv').trim();
      const effectiveName = String(name || effectiveFileName.replace(/\.[^/.]+$/, '')).trim();

      if (!effectiveName) {
        return reply.status(400).send({ error: 'Set name cannot be empty.' });
      }

      let currentCount = 0;
      try {
        const existing = await db
          .select({ id: spyfallLocationSets.id })
          .from(spyfallLocationSets)
          .where(eq(spyfallLocationSets.ownerId, userId));
        currentCount = existing.length;
      } catch (err) {
        currentCount = Array.from(inMemoryLocationSets.values()).filter((s) => s.ownerId === userId).length;
      }

      if (currentCount >= MAX_SETS_PER_USER) {
        return reply.status(400).send({
          error: `You can save up to ${MAX_SETS_PER_USER} location sets. Please delete one before uploading a new set.`,
        });
      }

      const parseResult = parseLocationFileContent(effectiveFileName, content);
      if (!parseResult.success || !parseResult.locations || !parseResult.locationCount) {
        return reply.status(400).send({ error: parseResult.error || 'Invalid location file.' });
      }

      const fileId = randomUUID();
      const now = new Date();
      const record: StoredLocationSet = {
        id: fileId,
        ownerId: userId,
        name: effectiveName,
        originalFileName: effectiveFileName,
        format: effectiveFileName.toLowerCase().endsWith('.txt') ? 'TXT' : 'CSV',
        locations: parseResult.locations,
        locationCount: parseResult.locationCount,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await db.insert(spyfallLocationSets).values({
          id: fileId as any,
          ownerId: userId,
          name: effectiveName,
          originalFileName: effectiveFileName,
          format: record.format,
          locations: record.locations,
          locationCount: record.locationCount,
          createdAt: now,
          updatedAt: now,
        });
      } catch (dbErr) {
        console.warn('[Spyfall] DB insert failed, falling back to in-memory:', dbErr);
      }

      inMemoryLocationSets.set(fileId, record);

      return reply.status(201).send({
        success: true,
        set: {
          id: record.id,
          ownerId: record.ownerId,
          name: record.name,
          originalFileName: record.originalFileName,
          format: record.format,
          locationCount: record.locationCount,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    }
  );

  // ─── Delete a custom location set ───────────────────────────────
  fastify.delete(
    '/api/spyfall/location-sets/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      try {
        const deleted = await db
          .delete(spyfallLocationSets)
          .where(and(eq(spyfallLocationSets.id, id as any), eq(spyfallLocationSets.ownerId, userId)))
          .returning({ id: spyfallLocationSets.id });

        const wasCached = inMemoryLocationSets.delete(id);

        if (deleted.length === 0 && !wasCached) {
          return reply.status(404).send({ error: 'Location set not found or unauthorized.' });
        }
        return { success: true };
      } catch (dbErr) {
        const inMemory = inMemoryLocationSets.get(id);
        if (inMemory && inMemory.ownerId === userId) {
          inMemoryLocationSets.delete(id);
          return { success: true };
        }
        return reply.status(404).send({ error: 'Location set not found or unauthorized.' });
      }
    }
  );

  // ─── Get single location set detail ─────────────────────────────
  fastify.get(
    '/api/spyfall/location-sets/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      const set = await getSpyfallLocationSet(id, userId);
      if (!set) {
        return reply.status(404).send({ error: 'Location set not found or unauthorized.' });
      }
      return { set };
    }
  );
};

export default spyfallRoutes;
