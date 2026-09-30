import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, resolveRequestSession } from '../auth/middleware.js';
import {
  ensureLeaderboards,
  getLeaderboard,
  getMyEntries,
  getMyResults,
  LEADERBOARD_DEFINITIONS,
} from '../ranking/ranking.service.js';

const rankingRoutes: FastifyPluginAsync = async (fastify) => {
  // Public. A signed-out visitor may read every leaderboard; the personal-best
  // panel is simply empty for them.
  fastify.get('/api/ranking/leaderboards', async () => {
    await ensureLeaderboards().catch(() => {});
    return LEADERBOARD_DEFINITIONS;
  });

  // Public read. `viewerId` only marks the viewer's own row and surfaces their
  // rank; it never changes the ordering or the scores returned to anyone.
  fastify.get('/api/ranking/leaderboards/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    await ensureLeaderboards().catch(() => {});

    // Optional auth: a bad or absent session just means "no viewer".
    const resolved = await resolveRequestSession(request);
    const viewerId = resolved?.user?.id ?? null;

    const board = await getLeaderboard(key, viewerId);
    if (!board) return reply.code(404).send({ error: 'Leaderboard not found' });
    return board;
  });

  // Auth-gated. Guests get an empty object so the page renders rather than
  // erroring; they have no entries by construction.
  fastify.get('/api/ranking/me', { preHandler: [requireAuth] }, async (request) => {
    const [entries, results] = await Promise.all([
      getMyEntries(request.user.id),
      getMyResults(request.user.id),
    ]);
    return { entries, results };
  });
};

export default rankingRoutes;
