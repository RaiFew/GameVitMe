import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { buildSongPool, poolSupports, resolvePreviewUrl } from '../music-quiz/catalog.js';
import type { TrackProvider } from '@party/music-quiz';

const PROVIDERS = new Set<TrackProvider>(['deezer', 'itunes']);

/** Enough for the longest configured run, and no more to fetch. */
const SAMPLE_SIZE = 8;

const musicQuizRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Playable clip for one track ─────────────────────────────────
  // Fetched per round rather than stored: the provider's preview URL is signed
  // and expires about fifteen minutes after issue, so a saved one is a dead link
  // by the second round. Only the provider id is ever in game state.
  fastify.get('/api/music-quiz/preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const { provider, providerId } = request.query as { provider?: string; providerId?: string };

    if (!PROVIDERS.has(provider as TrackProvider) || !providerId) {
      return reply.status(400).send({ error: 'That track cannot be played.' });
    }
    // Ids are digits on both providers; anything else is a probe, not a track.
    if (!/^\d{1,15}$/.test(providerId)) {
      return reply.status(400).send({ error: 'That track cannot be played.' });
    }

    const url = await resolvePreviewUrl(provider as TrackProvider, providerId);
    if (!url) {
      return reply.status(404).send({ error: 'No preview is available for that track.' });
    }
    return { url };
  });

  // ─── What a search would actually yield ──────────────────────────
  // The lobby card needs this before anyone commits to a query, because a pool
  // that cannot support the chosen question type is only discovered at start
  // time otherwise — after the room has already been waiting.
  fastify.post('/api/music-quiz/pool-preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const { query, questionType } = (request.body as any) || {};
    const q = typeof query === 'string' ? query.slice(0, 80) : '';

    const built = await buildSongPool(q);
    return {
      count: built.pool.length,
      questionType: built.questionType,
      // False means the host's chosen question type is not playable from this
      // pool, so the card prompts for a different one before start.
      supportsRequestedType: poolSupports(built.pool, questionType === 'ARTIST' || questionType === 'BOTH' ? questionType : 'TITLE'),
      sample: built.pool.slice(0, SAMPLE_SIZE).map((t) => ({ title: t.title, artist: t.artist })),
    };
  });
};

export default musicQuizRoutes;