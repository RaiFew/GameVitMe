import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { codenamesWordFiles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { parseWordFileContent } from '@party/codenames';

export interface StoredWordFile {
  id: string;
  ownerId: string;
  name: string;
  originalFileName: string;
  format: 'TXT' | 'CSV' | 'JSON';
  words: string[];
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory fallback store for development or if DB is offline
export const inMemoryWordFiles = new Map<string, StoredWordFile>();

export async function getCodenamesWordFile(
  fileId: string,
  ownerId: string
): Promise<StoredWordFile | null> {
  // Try DB first
  try {
    const rows = await db
      .select()
      .from(codenamesWordFiles)
      .where(and(eq(codenamesWordFiles.id, fileId as any), eq(codenamesWordFiles.ownerId, ownerId)));

    if (rows.length > 0) {
      const row = rows[0]!;
      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        originalFileName: row.originalFileName,
        format: row.format as any,
        words: row.words,
        wordCount: row.wordCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
  } catch (dbErr) {
    // Fallback to in-memory
  }

  const memoryFile = inMemoryWordFiles.get(fileId);
  if (memoryFile && memoryFile.ownerId === ownerId) {
    return memoryFile;
  }

  return null;
}

const codenamesRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── List user's custom word files ─────────────────────────────
  fastify.get(
    '/api/codenames/word-files',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;

      try {
        const rows = await db
          .select({
            id: codenamesWordFiles.id,
            ownerId: codenamesWordFiles.ownerId,
            name: codenamesWordFiles.name,
            originalFileName: codenamesWordFiles.originalFileName,
            format: codenamesWordFiles.format,
            wordCount: codenamesWordFiles.wordCount,
            createdAt: codenamesWordFiles.createdAt,
            updatedAt: codenamesWordFiles.updatedAt,
          })
          .from(codenamesWordFiles)
          .where(eq(codenamesWordFiles.ownerId, userId));

        return { files: rows };
      } catch (dbErr) {
        // Fallback to in-memory store
        const files = Array.from(inMemoryWordFiles.values())
          .filter((f) => f.ownerId === userId)
          .map(({ words, ...meta }) => meta);

        return { files };
      }
    }
  );

  // ─── Upload new custom word file ───────────────────────────────
  fastify.post(
    '/api/codenames/word-files',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;
      const { name, fileName, content } = (request.body as any) || {};

      if (!content || typeof content !== 'string') {
        return reply.status(400).send({ error: 'File content is required.' });
      }

      const effectiveFileName = String(fileName || 'words.txt').trim();
      const effectiveName = String(name || effectiveFileName.replace(/\.[^/.]+$/, '')).trim();

      if (!effectiveName) {
        return reply.status(400).send({ error: 'File name cannot be empty.' });
      }

      // Check 3-file limit
      let currentCount = 0;
      try {
        const existing = await db
          .select({ id: codenamesWordFiles.id })
          .from(codenamesWordFiles)
          .where(eq(codenamesWordFiles.ownerId, userId));
        currentCount = existing.length;
      } catch (err) {
        currentCount = Array.from(inMemoryWordFiles.values()).filter((f) => f.ownerId === userId).length;
      }

      if (currentCount >= 3) {
        return reply.status(400).send({
          error: 'You can save up to 3 custom word files. Please delete an existing file before uploading a new one.',
        });
      }

      // Validate and parse content
      const parseResult = parseWordFileContent(effectiveFileName, content);
      if (!parseResult.success || !parseResult.words || !parseResult.wordCount) {
        return reply.status(400).send({ error: parseResult.error || 'Invalid word file.' });
      }

      const fileId = randomUUID();
      const now = new Date();
      const record: StoredWordFile = {
        id: fileId,
        ownerId: userId,
        name: effectiveName,
        originalFileName: effectiveFileName,
        format: parseResult.format!,
        words: parseResult.words,
        wordCount: parseResult.wordCount,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await db.insert(codenamesWordFiles).values({
          id: fileId as any,
          ownerId: userId,
          name: effectiveName,
          originalFileName: effectiveFileName,
          format: parseResult.format!,
          words: parseResult.words,
          wordCount: parseResult.wordCount,
          createdAt: now,
          updatedAt: now,
        });
      } catch (dbErr) {
        console.warn('[Codenames] DB insert failed, falling back to in-memory:', dbErr);
      }

      // Always save to in-memory for resilience
      inMemoryWordFiles.set(fileId, record);

      return reply.status(201).send({
        success: true,
        file: {
          id: record.id,
          ownerId: record.ownerId,
          name: record.name,
          originalFileName: record.originalFileName,
          format: record.format,
          wordCount: record.wordCount,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    }
  );

  // ─── Delete a custom word file ─────────────────────────────────
  fastify.delete(
    '/api/codenames/word-files/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      try {
        const deleted = await db
          .delete(codenamesWordFiles)
          .where(and(eq(codenamesWordFiles.id, id as any), eq(codenamesWordFiles.ownerId, userId)))
          .returning({ id: codenamesWordFiles.id });

        inMemoryWordFiles.delete(id);

        if (deleted.length === 0 && !inMemoryWordFiles.has(id)) {
          return reply.status(404).send({ error: 'Word file not found or unauthorized.' });
        }

        return { success: true };
      } catch (dbErr) {
        const inMemory = inMemoryWordFiles.get(id);
        if (inMemory && inMemory.ownerId === userId) {
          inMemoryWordFiles.delete(id);
          return { success: true };
        }
        return reply.status(404).send({ error: 'Word file not found or unauthorized.' });
      }
    }
  );

  // ─── Get single word file detail ───────────────────────────────
  fastify.get(
    '/api/codenames/word-files/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      const file = await getCodenamesWordFile(id, userId);
      if (!file) {
        return reply.status(404).send({ error: 'Word file not found or unauthorized.' });
      }

      return { file };
    }
  );
};

export default codenamesRoutes;
