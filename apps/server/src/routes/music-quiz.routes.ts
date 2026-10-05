import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { buildSongPool, poolSupports, resolvePreviewUrl } from '../music-quiz/catalog.js';
import type { TrackProvider } from '@party/music-quiz';

const PROVIDERS = new Set<TrackProvider>(['deezer', 'itunes']);

/**
 * The whole pool is returned, not a sample: the lobby card lets the host drop
 * individual tracks, and a card that only showed the first few would let them
 * exclude a song they could not see. `buildSongPool` caps the pool itself.
 */

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
      // Ids come back so the card can name a track to exclude. This is the same
      // `provider:providerId` the play screen already receives for every clip,
      // so nothing here is privileged — the titles and artists are the provider's
      // own, fetched server-side, and the host only ever subtracts from them.
      // The cover is here too, and only here: it is what tells two same-named
      // artists apart, and it never reaches the player view.
      pool: built.pool.map((t) => ({
        key: `${t.provider}:${t.providerId}`,
        provider: t.provider,
        providerId: t.providerId,
        title: t.title,
        artist: t.artist,
        cover: t.cover,
      })),
    };
  });
};

export default musicQuizRoutes;