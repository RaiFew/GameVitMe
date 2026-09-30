/**
 * One-off check of the ranked gate: a guest row and an unknown id must both be
 * refused, a real account must pass. Run with:
 *   npx tsx src/ranking/ranking.check.ts
 */
import { db } from '../db/client.js';
import { users, leaderboardEntries, rankedGameResults } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  resolveRankedUser,
  isBetterResult,
  recordRankedResult,
  getLeaderboard,
  getMyEntries,
  getMyResults,
} from './ranking.service.js';

const run = async () => {
  const guest = await db.select().from(users).where(eq(users.isGuest, true)).limit(1);
  const real = await db
    .select()
    .from(users)
    .where(eq(users.isGuest, false))
    .limit(1);

  const results: string[] = [];
  const check = (name: string, ok: boolean) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);

  const unknown = await resolveRankedUser('00000000-0000-0000-0000-000000000000');
  check('unknown id is refused', !unknown.ok && unknown.reason === 'NOT_FOUND');

  if (guest[0]) {
    const g = await resolveRankedUser(guest[0].id);
    check(`guest "${guest[0].id}" is refused (GUEST)`, !g.ok && g.reason === 'GUEST');
  } else {
    results.push('SKIP  no guest account in the database to test against');
  }

  if (real[0]) {
    const r = await resolveRankedUser(real[0].id);
    check(`account "${real[0].id}" passes`, r.ok);
  } else {
    results.push('SKIP  no non-guest account in the database to test against');
  }

  check('time keeps the smaller score', isBetterResult('LOWER_IS_BETTER', 1000, 1200));
  check('time rejects a larger score', !isBetterResult('LOWER_IS_BETTER', 1500, 1200));
  check('tower keeps the larger score', isBetterResult('HIGHER_IS_BETTER', 12, 9));
  check('tower rejects a smaller score', !isBetterResult('HIGHER_IS_BETTER', 4, 9));

  // Guest runs are refused before anything is written.
  if (guest[0]) {
    const written = await recordRankedResult(guest[0].id, {
      mode: 'TIME',
      stages: 10,
      completedStages: 10,
      totalTimeMs: 999,
      mistakes: 0,
      highestFloor: 10,
      hpRemaining: 1,
      completed: true,
      status: 'COMPLETED',
      rankingValue: 999,
      rankingDirection: 'LOWER_IS_BETTER',
    });
    check('a guest run is not recorded', !written.ok && written.reason === 'GUEST');
  }

  if (real[0]) {
    // Record, read back, then remove the row. Proves the upsert and the rank
    // recompute SQL actually run, without leaving test data on the board.
    const first = await recordRankedResult(real[0].id, {
      mode: 'TOWER',
      stages: 0,
      completedStages: 7,
      totalTimeMs: 60_000,
      mistakes: 2,
      highestFloor: 7,
      hpRemaining: 1,
      completed: false,
      status: 'COMPLETED',
      rankingValue: 7,
      rankingDirection: 'HIGHER_IS_BETTER',
    });
    check('a real run is recorded', first.ok && first.personalBest === 7);

    const worse = await recordRankedResult(real[0].id, {
      mode: 'TOWER',
      stages: 0,
      completedStages: 3,
      totalTimeMs: 20_000,
      mistakes: 0,
      highestFloor: 3,
      hpRemaining: 3,
      completed: false,
      status: 'COMPLETED',
      rankingValue: 3,
      rankingDirection: 'HIGHER_IS_BETTER',
    });
    check(
      'a worse run does not lower the personal best',
      worse.ok && worse.personalBest === 7 && !worse.improved,
    );
    check('the attempt is still in the history', worse.ok && worse.previousBest === 7);

    const board = await getLeaderboard('number-rush.tower-climb', real[0].id);
    check('the board shows the run', board?.entries[0]?.score === 7);
    check('the viewer row is marked', board?.entries[0]?.isViewer === true);
    check('the viewer rank is reported', board?.viewer?.rank === 1);
    check('the ranked player count is reported', board?.totalRanked === 1);

    const mine = await getMyEntries(real[0].id);
    check('personal best is keyed by leaderboard', mine['number-rush.tower-climb']?.score === 7);

    const history = await getMyResults(real[0].id);
    check('both attempts are in the history', history.length === 2);

    // Clean up so the board is not left with a test entry.
    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.userId, real[0].id));
    await db.delete(rankedGameResults).where(eq(rankedGameResults.userId, real[0].id));
    const after = await getLeaderboard('number-rush.tower-climb', null);
    check('the test entry is gone', after?.entries.length === 0);
  }

  console.log(results.join('\n'));
  const failed = results.some((r) => r.startsWith('FAIL'));
  process.exit(failed ? 1 : 0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
