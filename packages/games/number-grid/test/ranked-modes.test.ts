import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext } from '@party/game-engine';
import {
  numberGridGame,
  buildBoard,
  drawChaosNumbers,
  settingsForVariant,
  validateNumberGridMove,
  processNumberGridMove,
  buildRankedResult,
  leaderboardKeyFor,
  rankingDirectionFor,
  isRankedVariant,
  usesChaosNumbers,
  ALL_GRID_SIZES,
  RANKED_TIME_STAGES,
  RANKED_TIME_PENALTY_MS,
  CHAOS_NUMBER_CEILING,
} from '../src/index.js';
import type { NumberGridMasterState, NumberGridVariant } from '../src/index.js';

function createMockContext(random: () => number = Math.random): GameContext {
  return {
    roomId: 'ranked-room',
    gameSessionId: 'ranked-session',
    players: [{ id: 'p1', displayName: 'Solo', seatNumber: 1, isConnected: true }],
    random,
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

/** Deterministic PRNG so a failing assertion is reproducible. */
function seededRandom(seedRef: { v: number }): () => number {
  return () => {
    seedRef.v = (seedRef.v * 9301 + 49297) % 233280;
    return seedRef.v / 233280;
  };
}

function setup(variant: NumberGridVariant, random = Math.random): NumberGridMasterState {
  return numberGridGame.setup(createMockContext(random), settingsForVariant(variant));
}

const PLAYER = 'p1';

/** Clicks the currently expected number, clearing the whole board. */
function clearBoard(state: NumberGridMasterState, ctx: GameContext, now: number) {
  while (state.players[PLAYER].expectedIndex < state.currentRound.numberSequence.length) {
    const expected = state.players[PLAYER].expectedNumber;
    const card = state.currentRound.cards.find((c) => c.number === expected)!;
    processNumberGridMove(
      state,
      PLAYER,
      'CLICK_NUMBER',
      { cardId: card.id, number: card.number },
      ctx,
      now,
    );
  }
}

/** Clicks a number that is not the expected one. */
function clickWrong(state: NumberGridMasterState, ctx: GameContext, now: number) {
  const player = state.players[PLAYER];
  const wrong = state.currentRound.cards.find((c) => c.number !== player.expectedNumber)!;
  processNumberGridMove(
    state,
    PLAYER,
    'CLICK_NUMBER',
    { cardId: wrong.id, number: wrong.number },
    ctx,
    now,
  );
}

describe('Chaos (normal room, guests allowed)', () => {
  it('draws unique values inside 1..1000', () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const values = drawChaosNumbers(100);
      assert.equal(values.length, 100);
      assert.equal(new Set(values).size, 100, 'chaos numbers must be unique');
      for (const v of values) {
        assert.ok(v >= 1 && v <= CHAOS_NUMBER_CEILING, `${v} out of range`);
      }
    }
  });

  it('builds a board of chaos values with an ascending click sequence', () => {
    const { cards, sequence } = buildBoard(5, { numberRange: 'CHAOS' });
    assert.equal(cards.length, 25);
    assert.equal(sequence.length, 25);
    assert.deepEqual(sequence, [...sequence].sort((a, b) => a - b));
    for (const card of cards) {
      assert.ok(card.number >= 1 && card.number <= CHAOS_NUMBER_CEILING);
    }
  });

  it('randomizes the grid size on the FIRST round, not just later ones', () => {
    // The default progression would start at 2x2. Chaos must not.
    const seen = new Set<number>();
    const seed = { v: 7 };
    for (let i = 0; i < 40; i++) {
      const state = setup('CHAOS', seededRandom(seed));
      assert.ok(ALL_GRID_SIZES.includes(state.currentRound.gridSize));
      seen.add(state.currentRound.gridSize);
    }
    assert.ok(seen.size > 1, 'chaos must not always open with the same grid size');
  });

  it('stays on sequential numbering for the normal variant', () => {
    const state = setup('STANDARD');
    const sequence = state.currentRound.numberSequence;
    for (let i = 1; i < sequence.length; i++) {
      assert.equal(sequence[i], sequence[i - 1] + 1);
    }
  });
});

describe('Ranked variant gating', () => {
  it('marks only the three ranked variants as ranked', () => {
    for (const v of ['STANDARD', 'CHAOS'] as NumberGridVariant[]) {
      assert.equal(isRankedVariant(v), false);
      assert.equal(usesChaosNumbers(v), v === 'CHAOS');
    }
    for (const v of ['RANKED_TIME', 'RANKED_TOWER', 'RANKED_CHAOS'] as NumberGridVariant[]) {
      assert.equal(isRankedVariant(v), true);
    }
  });

  it('ignores client settings for a ranked run', () => {
    // A client asking for a 1-round Time run, no HP penalty, must not get it.
    const state = numberGridGame.setup(
      createMockContext(),
      { variant: 'RANKED_TIME', totalRounds: 1, maxHp: 1, wrongClickDamage: true } as any,
    );
    assert.equal(state.totalRounds, RANKED_TIME_STAGES);
    assert.equal(state.currentRoundNumber, 1);
    assert.ok(state.players[PLAYER].maxHp > 1, 'Time must not run out of HP');
    assert.equal(state.settings.wrongClickDamage, false);
  });

  it('maps each mode to its own board and ranking direction', () => {
    assert.equal(leaderboardKeyFor('RANKED_TIME'), 'number-rush.time');
    assert.equal(leaderboardKeyFor('RANKED_TOWER'), 'number-rush.tower-climb');
    assert.equal(leaderboardKeyFor('RANKED_CHAOS'), 'number-rush.chaos');
    assert.notEqual(leaderboardKeyFor('RANKED_TIME'), leaderboardKeyFor('RANKED_TOWER'));

    assert.equal(rankingDirectionFor('RANKED_TIME'), 'LOWER_IS_BETTER');
    assert.equal(rankingDirectionFor('RANKED_TOWER'), 'HIGHER_IS_BETTER');
    assert.equal(rankingDirectionFor('RANKED_CHAOS'), 'HIGHER_IS_BETTER');
    assert.equal(rankingDirectionFor('STANDARD'), null);
  });
});

describe('Ranked Time: 10 stages, no HP, 10s server-enforced lock', () => {
  it('runs exactly 10 stages', () => {
    const state = setup('RANKED_TIME');
    assert.equal(state.totalRounds, RANKED_TIME_STAGES);
    assert.equal(state.totalRounds, 10);
  });

  it('locks for exactly 10 seconds on a wrong click without costing HP', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TIME');
    const t0 = 1_000_000;

    clickWrong(state, ctx, t0);

    const player = state.players[PLAYER];
    assert.equal(player.hp, player.maxHp, 'Time has no HP loss');
    assert.equal(player.eliminated, false);
    assert.equal(player.wrongClicks, 1);
    assert.equal(player.lockedUntil, t0 + RANKED_TIME_PENALTY_MS);
    assert.equal(RANKED_TIME_PENALTY_MS, 10_000);
  });

  it('rejects every click until the lock expires, then accepts it again', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TIME');
    const t0 = 1_000_000;

    clickWrong(state, ctx, t0);
    const expected = state.players[PLAYER].expectedNumber;
    const card = state.currentRound.cards.find((c) => c.number === expected)!;
    const click = { cardId: card.id, number: card.number };

    // One millisecond early is still locked.
    const justBefore = validateNumberGridMove(state, PLAYER, 'CLICK_NUMBER', click, t0 + 9_999);
    assert.equal(justBefore.valid, false);
    assert.match(justBefore.error ?? '', /Locked out/);

    // At the deadline the lock is over and progress resumes.
    const atDeadline = validateNumberGridMove(state, PLAYER, 'CLICK_NUMBER', click, t0 + 10_000);
    assert.equal(atDeadline.valid, true);
  });

  it('counts the penalty in the clock rather than as a lost life', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TIME');
    const t0 = 5_000_000;
    state.currentRound.startedAt = t0;

    clickWrong(state, ctx, t0 + 100);
    assert.equal(state.players[PLAYER].lockedUntil, t0 + 100 + RANKED_TIME_PENALTY_MS);

    // The player cannot click while locked, so the stage can only be cleared
    // once the 10 seconds have burned off — and the stage time shows it.
    const stillLocked = validateNumberGridMove(
      state,
      PLAYER,
      'START_NEXT_ROUND',
      {},
      t0 + 100 + 9_999,
    );
    assert.equal(stillLocked.valid, false);

    clearBoard(state, ctx, t0 + 10_100 + 500);
    assert.equal(state.players[PLAYER].hp, state.players[PLAYER].maxHp, 'no HP was lost');
    assert.equal(state.roundTimesMs[0], 10_600, 'the 10s penalty is inside the stage time');
  });

  it('scores the run as total completion time, lower is better', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TIME');
    let now = 1_000_000;
    state.currentRound.startedAt = now;

    for (let stage = 1; stage <= RANKED_TIME_STAGES; stage++) {
      // A stage's time runs from the moment its board appeared, so the clock
      // advances across the stage rather than after it.
      now += 3_000;
      clearBoard(state, ctx, now);
      processNumberGridMove(state, PLAYER, 'START_NEXT_ROUND', {}, ctx, now);
    }

    assert.equal(state.phase, 'GAME_OVER');
    const result = state.rankedResult!;
    assert.equal(result.mode, 'TIME');
    assert.equal(result.stages, 10);
    assert.equal(result.completedStages, 10);
    assert.equal(result.completed, true);
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.rankingDirection, 'LOWER_IS_BETTER');
    assert.equal(result.totalTimeMs, 30_000);
    assert.equal(result.rankingValue, 30_000);
  });
});

describe('Ranked Tower Climb: 3 HP, death ends the run', () => {
  it('starts with 3 HP', () => {
    const state = setup('RANKED_TOWER');
    assert.equal(state.players[PLAYER].maxHp, 3);
    assert.equal(state.totalRounds, 9999, 'tower runs until the player dies');
  });

  it('ends the run immediately at 0 HP, scoring the floors cleared', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TOWER');
    let now = 1_000_000;

    // Two floors cleared first, so the score is not trivially zero.
    for (let floor = 0; floor < 2; floor++) {
      clearBoard(state, ctx, now);
      now += 2_000;
      processNumberGridMove(state, PLAYER, 'START_NEXT_ROUND', {}, ctx, now);
    }
    assert.equal(state.players[PLAYER].hp, 3);
    assert.equal(state.currentRoundNumber, 3);

    clickWrong(state, ctx, now);
    assert.equal(state.players[PLAYER].hp, 2);
    clickWrong(state, ctx, now);
    assert.equal(state.players[PLAYER].hp, 1);
    clickWrong(state, ctx, now);

    const player = state.players[PLAYER];
    assert.equal(player.hp, 0);
    assert.equal(player.eliminated, true);
    assert.equal(state.phase, 'GAME_OVER', 'HP 0 must end the run at once');

    const result = state.rankedResult!;
    assert.equal(result.mode, 'TOWER');
    assert.equal(result.status, 'DIED');
    assert.equal(result.hpRemaining, 0);
    assert.equal(result.highestFloor, 2, 'the floor you die on is not scored');
    assert.equal(result.rankingValue, 2);
    assert.equal(result.rankingDirection, 'HIGHER_IS_BETTER');
  });

  it('ignores a click from a player who is already out of HP', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TOWER');
    const now = 1_000_000;
    clickWrong(state, ctx, now);
    clickWrong(state, ctx, now);
    clickWrong(state, ctx, now);
    assert.equal(state.phase, 'GAME_OVER');

    const expected = state.players[PLAYER].expectedNumber;
    const card = state.currentRound.cards.find((c) => c.number === expected)!;
    const res = validateNumberGridMove(
      state,
      PLAYER,
      'CLICK_NUMBER',
      { cardId: card.id, number: card.number },
      now,
    );
    assert.equal(res.valid, false);
  });
});

describe('Ranked Chaos: random numbers and sizes, 3 HP', () => {
  it('opens on a random-size chaos board with 3 HP', () => {
    const state = setup('RANKED_CHAOS');
    assert.equal(state.players[PLAYER].maxHp, 3);
    assert.ok(ALL_GRID_SIZES.includes(state.currentRound.gridSize));
    for (const card of state.currentRound.cards) {
      assert.ok(card.number >= 1 && card.number <= CHAOS_NUMBER_CEILING);
    }
  });

  it('plays a sequence that is not ascending-by-one', () => {
    const state = setup('RANKED_CHAOS');
    const sequence = state.currentRound.numberSequence;
    const strictlyAscending = sequence.every((v, i) => i === 0 || v > sequence[i - 1]);
    assert.ok(
      strictlyAscending,
      'chaos values are sorted, but the spacing proves they are not 1..N',
    );
    const gaps = sequence.some((v, i) => i > 0 && v - sequence[i - 1] > 1);
    assert.ok(gaps, 'chaos values must have gaps, not consecutive integers');
  });
});

describe('Ranked result is a pure function of server state', () => {
  it('rebuilds the same result from state alone', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TIME');
    const now = 1_000_000;
    clearBoard(state, ctx, now);
    state.roundTimesMs = [1_500, 2_000, 3_500];

    const built = buildRankedResult(state, true);
    assert.equal(built.rankingValue, 7_000);
    assert.equal(built.completedStages, 3);
    assert.equal(built.mistakes, state.players[PLAYER].wrongClicks);
    // Same state, same answer — no input from the client is involved.
    assert.deepEqual(buildRankedResult(state, true), built);
  });

  it('carries the result out through checkGameEnd for the leaderboard', () => {
    const ctx = createMockContext();
    const state = setup('RANKED_TIME');
    clearBoard(state, ctx, 1_000_000);
    state.phase = 'GAME_OVER';
    state.rankedResult = buildRankedResult(state, true);

    const end = numberGridGame.checkGameEnd(state);
    assert.ok(end);
    assert.equal(end.isEnded, true);
    assert.ok(end.data.rankedResult, 'the socket handler needs the result here to persist it');
    assert.equal(end.data.rankedResult.mode, 'TIME');
  });
});
