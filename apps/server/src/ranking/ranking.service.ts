import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  leaderboards,
  leaderboardEntries,
  rankedGameResults,
  users,
} from '../db/schema.js';
import type { NumberGridVariant, RankedRunResult } from '@party/number-grid';
import { leaderboardKeyFor } from '@party/number-grid';

/** Ranked mode -> the engine variant that produces it. */
function variantForMode(mode: RankedRunResult['mode']): NumberGridVariant {
  switch (mode) {
    case 'TIME':
      return 'RANKED_TIME';
    case 'TOWER':
      return 'RANKED_TOWER';
    case 'CHAOS':
      return 'RANKED_CHAOS';
  }
}

/**
 * Every leaderboard the site offers. Adding a future ranking (Play Streak, a
 * per-game streak) is one entry here plus a row in the `leaderboards` table —
 * not a new route, table, or page.
 */
export const LEADERBOARD_DEFINITIONS = [
  {
    key: 'number-rush.time',
    name: 'Time',
    category: 'Number Rush',
    gameType: 'number-grid',
    mode: 'TIME',
    metric: 'totalTimeMs',
    direction: 'LOWER_IS_BETTER' as const,
  },
  {
    key: 'number-rush.tower-climb',
    name: 'Tower Climb',
    category: 'Number Rush',
    gameType: 'number-grid',
    mode: 'TOWER',
    metric: 'highestFloor',
    direction: 'HIGHER_IS_BETTER' as const,
  },
  {
    key: 'number-rush.chaos',
    name: 'Chaos',
    category: 'Number Rush',
    gameType: 'number-grid',
    mode: 'CHAOS',
    metric: 'highestFloor',
    direction: 'HIGHER_IS_BETTER' as const,
  },
];

export type LeaderboardDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

/** True when `candidate` should replace `existing` on the board. */
export function isBetterResult(
  direction: LeaderboardDirection,
  candidate: number,
  existing: number,
): boolean {
  return direction === 'LOWER_IS_BETTER' ? candidate < existing : candidate > existing;
}

function orderFor(direction: LeaderboardDirection) {
  return direction === 'LOWER_IS_BETTER' ? asc(leaderboardEntries.score) : desc(leaderboardEntries.score);
}

/**
 * Resolves a user id to a real, non-guest account.
 *
 * This is the only gate that matters for ranked play. `socket.data.user` is not
 * trustworthy: the socket gateway falls back to `handshake.auth.user`, which the
 * client supplies freely, so an unauthenticated caller can claim any id it
 * likes. Only a row that actually exists in `users` and is not a guest may
 * score. Guests therefore never reach the leaderboard at all — no entry, no
 * result row, and nothing a later request could "claim".
 */
export async function resolveRankedUser(userId: string): Promise<{
  ok: true;
  user: { id: string; displayName: string; username: string | null; avatarUrl: string | null };
} | { ok: false; reason: 'NOT_FOUND' | 'GUEST' }> {
  const row = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
      isGuest: users.isGuest,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = row[0];
  if (!user) return { ok: false, reason: 'NOT_FOUND' };
  if (user.isGuest) return { ok: false, reason: 'GUEST' };

  return {
    ok: true,
    user: {
      id: user.id,
      displayName: user.displayName || user.name || 'Player',
      username: user.username,
      avatarUrl: user.avatarUrl,
    },
  };
}

/** Idempotently ensures the built-in leaderboards exist. Safe to call per request. */
export async function ensureLeaderboards(): Promise<void> {
  for (const def of LEADERBOARD_DEFINITIONS) {
    await db
      .insert(leaderboards)
      .values({
        key: def.key,
        name: def.name,
        category: def.category,
        gameType: def.gameType,
        mode: def.mode,
        metric: def.metric,
        direction: def.direction,
        season: 'all-time',
      })
      .onConflictDoNothing({ target: leaderboards.key });
  }
}

async function findLeaderboard(key: string) {
  const rows = await db.select().from(leaderboards).where(eq(leaderboards.key, key)).limit(1);
  return rows[0] ?? null;
}

/**
 * Recomputes rank for every entry on a board, in the board's own direction.
 *
 * Rank is stored rather than computed per-read so that a future season can
 * freeze a board's order at season end. Recomputing the whole board is fine
 * here: entries are one row per user per board.
 */
async function recomputeRanks(
  leaderboardId: string,
  direction: LeaderboardDirection,
): Promise<void> {
  const order = direction === 'LOWER_IS_BETTER' ? 'ASC' : 'DESC';
  await db.execute(sql`
    UPDATE leaderboard_entries AS le
    SET rank = ranked.rownum
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY score ${sql.raw(order)}, updated_at ASC) AS rownum
      FROM leaderboard_entries
      WHERE leaderboard_id = ${leaderboardId}
    ) AS ranked
    WHERE le.id = ranked.id
  `);
}

/**
 * Records a finished ranked run.
 *
 * The run result is passed in from the game engine, which built it purely from
 * server-owned state. Nothing here is accepted from the client, so a client can
 * neither submit a fabricated time nor claim someone else's run.
 */
export async function recordRankedResult(
  userId: string,
  result: RankedRunResult,
): Promise<
  | { ok: true; leaderboardKey: string; personalBest: number; previousBest: number | null; rank: number | null; improved: boolean }
  | { ok: false; reason: 'NOT_FOUND' | 'GUEST' | 'NO_LEADERBOARD' | 'DB_ERROR' }
> {
  const auth = await resolveRankedUser(userId);
  if (!auth.ok) return { ok: false, reason: auth.reason };

  // The engine owns the mode->board mapping. Deriving the key from the mode
  // string here duplicated it and drifted immediately (TOWER is 'tower-climb').
  const leaderboardKey = leaderboardKeyFor(variantForMode(result.mode));
  if (!leaderboardKey) return { ok: false, reason: 'NO_LEADERBOARD' };

  const board = await findLeaderboard(leaderboardKey);
  if (!board) return { ok: false, reason: 'NO_LEADERBOARD' };

  const score = result.rankingValue;

  try {
    // History first: an attempt is recorded whether or not it beats the
    // player's best, so runs are auditable even when they do not score.
    await db.insert(rankedGameResults).values({
      userId: auth.user.id,
      gameType: 'number-grid',
      mode: result.mode,
      leaderboardKey: board.key,
      rankingValue: String(score),
      totalTimeMs: result.totalTimeMs,
      highestFloor: result.highestFloor,
      mistakes: result.mistakes,
      status: result.status,
      metadata: {
        stages: result.stages,
        completedStages: result.completedStages,
        hpRemaining: result.hpRemaining,
        completed: result.completed,
        rankingDirection: result.rankingDirection,
      },
    });

    const existingRows = await db
      .select()
      .from(leaderboardEntries)
      .where(and(eq(leaderboardEntries.leaderboardId, board.id), eq(leaderboardEntries.userId, auth.user.id)))
      .limit(1);
    const existing = existingRows[0];

    const improved = !existing || isBetterResult(board.direction, score, Number(existing.score));
    const personalBest = improved ? score : Number(existing!.score);

    if (improved) {
      await db
        .insert(leaderboardEntries)
        .values({
          leaderboardId: board.id,
          userId: auth.user.id,
          score: String(score),
          metadata: {
            displayName: auth.user.displayName,
            totalTimeMs: result.totalTimeMs,
            highestFloor: result.highestFloor,
            mistakes: result.mistakes,
            mode: result.mode,
          },
        })
        .onConflictDoUpdate({
          target: [leaderboardEntries.leaderboardId, leaderboardEntries.userId],
          set: { score: String(score), metadata: {
            displayName: auth.user.displayName,
            totalTimeMs: result.totalTimeMs,
            highestFloor: result.highestFloor,
            mistakes: result.mistakes,
            mode: result.mode,
          }, updatedAt: new Date() },
        });
    }

    await recomputeRanks(board.id, board.direction);

    const rankRows = await db
      .select({ rank: leaderboardEntries.rank })
      .from(leaderboardEntries)
      .where(and(eq(leaderboardEntries.leaderboardId, board.id), eq(leaderboardEntries.userId, auth.user.id)))
      .limit(1);

    return {
      ok: true,
      leaderboardKey: board.key,
      personalBest,
      previousBest: existing ? Number(existing.score) : null,
      rank: rankRows[0]?.rank ?? null,
      improved,
    };
  } catch (err) {
    console.warn('[Ranking] Failed to record result:', err);
    return { ok: false, reason: 'DB_ERROR' };
  }
}

/** Top entries for a board, plus the total ranked player count. */
export async function getLeaderboard(
  key: string,
  viewerId: string | null,
  limit = 50,
): Promise<{
  leaderboard: typeof LEADERBOARD_DEFINITIONS[number] | null;
  entries: {
    rank: number | null;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    totalTimeMs: number | null;
    highestFloor: number | null;
    mistakes: number | null;
    isViewer: boolean;
  }[];
  totalRanked: number;
  viewer: { rank: number | null; score: number | null } | null;
} | null> {
  const board = await findLeaderboard(key);
  if (!board) return null;

  const rows = await db
    .select({
      rank: leaderboardEntries.rank,
      userId: leaderboardEntries.userId,
      score: leaderboardEntries.score,
      metadata: leaderboardEntries.metadata,
      displayName: users.displayName,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(leaderboardEntries)
    .innerJoin(users, eq(leaderboardEntries.userId, users.id))
    .where(eq(leaderboardEntries.leaderboardId, board.id))
    .orderBy(orderFor(board.direction))
    .limit(limit);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.leaderboardId, board.id));

  let viewer: { rank: number | null; score: number | null } | null = null;
  if (viewerId) {
    const vRows = await db
      .select({ rank: leaderboardEntries.rank, score: leaderboardEntries.score })
      .from(leaderboardEntries)
      .where(and(eq(leaderboardEntries.leaderboardId, board.id), eq(leaderboardEntries.userId, viewerId)))
      .limit(1);
    if (vRows[0]) viewer = { rank: vRows[0].rank ?? null, score: Number(vRows[0].score) };
  }

  return {
    leaderboard: {
      key: board.key,
      name: board.name,
      category: board.category,
      gameType: board.gameType ?? '',
      mode: board.mode ?? '',
      metric: board.metric ?? '',
      direction: board.direction,
    },
    entries: rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, any>;
      return {
        rank: r.rank,
        userId: r.userId,
        displayName: r.displayName || r.name || 'Player',
        avatarUrl: r.avatarUrl,
        score: Number(r.score),
        totalTimeMs: typeof meta.totalTimeMs === 'number' ? meta.totalTimeMs : null,
        highestFloor: typeof meta.highestFloor === 'number' ? meta.highestFloor : null,
        mistakes: typeof meta.mistakes === 'number' ? meta.mistakes : null,
        isViewer: !!viewerId && r.userId === viewerId,
      };
    }),
    totalRanked: countRows[0]?.count ?? 0,
    viewer,
  };
}

/** All personal bests for one user, keyed by leaderboard. */
export async function getMyEntries(userId: string): Promise<
  Record<string, { score: number; rank: number | null; updatedAt: Date | null }>
> {
  const auth = await resolveRankedUser(userId);
  // Guests get an empty set rather than an error: the Ranking page is public,
  // and a guest should see an empty "your best" panel, not a failure.
  if (!auth.ok) return {};

  const rows = await db
    .select({
      key: leaderboards.key,
      score: leaderboardEntries.score,
      rank: leaderboardEntries.rank,
      updatedAt: leaderboardEntries.updatedAt,
    })
    .from(leaderboardEntries)
    .innerJoin(leaderboards, eq(leaderboardEntries.leaderboardId, leaderboards.id))
    .where(eq(leaderboardEntries.userId, auth.user.id));

  const out: Record<string, { score: number; rank: number | null; updatedAt: Date | null }> = {};
  for (const r of rows) {
    out[r.key] = { score: Number(r.score), rank: r.rank ?? null, updatedAt: r.updatedAt };
  }
  return out;
}

/** Recent attempts, for a player's own history view. */
export async function getMyResults(userId: string, limit = 20) {
  const auth = await resolveRankedUser(userId);
  if (!auth.ok) return [];

  return db
    .select({
      id: rankedGameResults.id,
      mode: rankedGameResults.mode,
      leaderboardKey: rankedGameResults.leaderboardKey,
      rankingValue: rankedGameResults.rankingValue,
      totalTimeMs: rankedGameResults.totalTimeMs,
      highestFloor: rankedGameResults.highestFloor,
      mistakes: rankedGameResults.mistakes,
      status: rankedGameResults.status,
      createdAt: rankedGameResults.createdAt,
    })
    .from(rankedGameResults)
    .where(eq(rankedGameResults.userId, auth.user.id))
    .orderBy(desc(rankedGameResults.createdAt))
    .limit(limit);
}
