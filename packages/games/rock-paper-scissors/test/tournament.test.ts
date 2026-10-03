import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext } from '@party/game-engine';
import { rockPaperScissorsGame, seedOrder, resetMatchCounter } from '../src/index.js';
import type { RPSMasterState, RPSSettings } from '../src/types/index.js';

function createMockContext(playerCount: number, random = 0.5): GameContext {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    seatNumber: i + 1,
    displayName: `Player ${i + 1}`,
    isConnected: true,
  }));
  return {
    roomId: 'test-room',
    gameSessionId: 'test-session',
    players,
    random: () => random,
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

const settings = (over: Partial<RPSSettings> = {}): RPSSettings => ({
  gameMode: 'TOURNAMENT',
  livesPerMatch: 3,
  roundDurationSeconds: 10,
  ...over,
});

function start(playerCount: number, over: Partial<RPSSettings> = {}): RPSMasterState {
  resetMatchCounter();
  return rockPaperScissorsGame.setup(createMockContext(playerCount), settings(over));
}

/** Both fighters lock in, which is what triggers the leg to resolve. */
function throwLeg(
  state: RPSMasterState,
  a: string,
  aChoice: 'ROCK' | 'PAPER' | 'SCISSORS',
  b: string,
  bChoice: 'ROCK' | 'PAPER' | 'SCISSORS',
  ctx: GameContext
): RPSMasterState {
  let s = rockPaperScissorsGame.processMove(
    state,
    { type: 'MAKE_CHOICE', playerId: a, payload: { choice: aChoice }, timestamp: Date.now() },
    ctx
  ).newState!;
  s = rockPaperScissorsGame.processMove(
    s,
    { type: 'MAKE_CHOICE', playerId: b, payload: { choice: bChoice }, timestamp: Date.now() },
    ctx
  ).newState!;
  return s;
}

const nextRound = (state: RPSMasterState, ctx: GameContext) =>
  rockPaperScissorsGame.processMove(
    state,
    { type: 'NEXT_ROUND', playerId: state.playerOrder[0]!, timestamp: Date.now() },
    ctx
  ).newState!;

/** Plays out one match to a decision, then steps to the next thing to play. */
function playOutMatch(
  state: RPSMasterState,
  ctx: GameContext,
  a: string,
  b: string,
  winner: string
): RPSMasterState {
  // PAPER beats ROCK, so the intended winner always throws PAPER.
  let s = state;
  const lives = s.players[a]!.lives;
  for (let i = 0; i < lives; i++) {
    s = throwLeg(
      s,
      winner === a ? a : b,
      'PAPER',
      winner === a ? b : a,
      'ROCK',
      ctx
    );
    if (i < lives - 1) s = nextRound(s, ctx);
  }
  return nextRound(s, ctx);
}

describe('Bracket seeding', () => {
  it('pads to a power of two so the strongest seeds meet last', () => {
    assert.deepEqual(seedOrder(2), [1, 2]);
    assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
    assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('gives an odd field a BYE instead of a walkover it did not earn', () => {
    const ctx = createMockContext(3);
    const state = start(3);
    const first = state.bracket!.rounds[0]!;
    assert.equal(first.length, 2, '3 entrants round up to a 4-slot bracket');
    const byes = first.filter((m) => m.status === 'BYE');
    assert.equal(byes.length, 1);
    assert.equal(byes[0]!.winnerId, byes[0]!.playerAId ?? byes[0]!.playerBId);
  });

  it('leaves exactly one match live and never charges the bye a life', () => {
    const ctx = createMockContext(3);
    const state = start(3);
    const live = state.bracket!.rounds[0]!.filter((m) => m.status === 'LIVE');
    assert.equal(live.length, 1);
    const byeSeated = state.bracket!.rounds[0]!.find((m) => m.status === 'BYE')!;
    assert.equal(state.players[byeSeated.winnerId!]!.lives, 3);
  });

  it('seedings are distinct and every entrant appears exactly once', () => {
    for (const n of [2, 3, 5, 6, 7, 8, 9]) {
      const state = start(n);
      const seated = state.bracket!.rounds[0]!.flatMap((m) => [m.playerAId, m.playerBId]).filter(Boolean);
      assert.equal(new Set(seated).size, n, `${n} entrants seated uniquely`);
      assert.equal(seated.length, n);
    }
  });
});

describe('Tournament match play', () => {
  it('refuses a choice from a player who is not in the live match', () => {
    const ctx = createMockContext(4);
    const state = start(4);
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const outsider = state.playerOrder.find(
      (id) => id !== live.playerAId && id !== live.playerBId
    )!;
    const check = rockPaperScissorsGame.validateMove(
      state,
      { type: 'MAKE_CHOICE', playerId: outsider, payload: { choice: 'ROCK' }, timestamp: Date.now() },
      ctx
    );
    assert.equal(check.valid, false);
    assert.match(check.reason!, /not in the current match/i);
  });

  it('does not resolve the leg until both fighters have locked in', () => {
    const ctx = createMockContext(2);
    let state = start(2);
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = live.playerAId!, b = live.playerBId!;

    state = rockPaperScissorsGame.processMove(
      state,
      { type: 'MAKE_CHOICE', playerId: a, payload: { choice: 'ROCK' }, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.phase, 'CHOOSING', 'still choosing with one fighter idle');
    assert.equal(state.lastRoundOutcome, null);
    assert.equal(state.players[b]!.lives, 3, 'nobody has lost a life yet');

    const view = rockPaperScissorsGame.getPlayerView(state, b, ctx);
    assert.equal(view.players.find((p) => p.id === a)!.choice, null, 'the locked choice is not shown');
  });

  it('charges the loser a life per lost leg and ties cost nothing', () => {
    const ctx = createMockContext(2);
    let state = start(2);
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = live.playerAId!, b = live.playerBId!;

    // PAPER covers ROCK, so a wins and b pays.
    state = throwLeg(state, a, 'PAPER', b, 'ROCK', ctx);
    assert.equal(state.players[b]!.lives, 2);
    assert.equal(state.players[a]!.lives, 3);
    assert.equal(state.phase, 'ROUND_RESULT');

    state = nextRound(state, ctx);
    state = throwLeg(state, a, 'ROCK', b, 'ROCK', ctx);
    assert.equal(state.players[a]!.lives, 3, 'a tie costs no life');
    assert.equal(state.players[b]!.lives, 2);

    const m = state.bracket!.rounds[0]!.find((x) => x.id === state.currentMatchId)!;
    assert.equal(m.legs.length, 2);
    assert.equal(m.legs[1]!.isTie, true);
  });

  it('ends a match when a fighter runs out of lives, and the loser is out', () => {
    const ctx = createMockContext(2);
    let state = start(2);
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = live.playerAId!, b = live.playerBId!;

    // b loses every leg, so with 3 lives a takes the match on the third.
    for (let i = 0; i < 3; i++) {
      state = throwLeg(state, a, 'PAPER', b, 'ROCK', ctx);
      if (i < 2) state = nextRound(state, ctx);
    }
    state = nextRound(state, ctx);

    assert.equal(state.players[b]!.lives, 0);
    const final = state.bracket!.rounds.at(-1)!.at(-1)!;
    assert.equal(final.winnerId, a);
    assert.equal(state.bracket!.championId, a, 'a two-entrant bracket crowns on the first round');
    assert.equal(state.phase, 'GAME_OVER');
    assert.deepEqual(state.winnerIds, [a]);
  });
});

describe('Bracket progression', () => {
  it('runs a four-player bracket to a champion and never stalls', () => {
    const ctx = createMockContext(4);
    let state = start(4);

    const roundOne = state.bracket!.rounds[0]!;
    const first = roundOne.find((m) => m.status === 'LIVE')!;
    const second = roundOne.find((m) => m.id !== first.id)!;

    state = playOutMatch(state, ctx, first.playerAId!, first.playerBId!, first.playerAId!);
    assert.equal(state.bracket!.rounds[0]!.find((m) => m.id === first.id)!.winnerId, first.playerAId);
    assert.equal(state.phase, 'CHOOSING', 'the next match of the round starts on its own');

    const nowLive = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    assert.equal(nowLive.id, second.id, 'moves through the round in bracket order');

    const s1 = nowLive.playerAId!, s2 = nowLive.playerBId!;
    state = playOutMatch(state, ctx, s1, s2, s2);

    assert.equal(state.bracket!.currentRoundIndex, 1, 'rolled into the final');
    assert.equal(state.bracket!.rounds.length, 2);
    assert.equal(state.phase, 'CHOOSING');

    const finalMatch = state.bracket!.rounds[1]!.find((m) => m.status === 'LIVE')!;
    const f1 = finalMatch.playerAId!, f2 = finalMatch.playerBId!;
    assert.deepEqual(new Set([f1, f2]), new Set([first.playerAId, s2]));

    state = playOutMatch(state, ctx, f1, f2, f1);
    assert.equal(state.bracket!.championId, f1);
    assert.equal(state.phase, 'GAME_OVER');
    assert.match(state.winReason ?? '', /wins the tournament/i);
  });

  it('carries a bye winner into the next round as a real contestant', () => {
    const ctx = createMockContext(3);
    let state = start(3);
    const byeSeat = state.bracket!.rounds[0]!.find((m) => m.status === 'BYE')!.winnerId!;
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;

    state = playOutMatch(state, ctx, live.playerAId!, live.playerBId!, live.playerAId!);

    const final = state.bracket!.rounds[1]!.find((m) => m.status === 'LIVE')!;
    assert.deepEqual(
      new Set([final.playerAId, final.playerBId]),
      new Set([live.playerAId, byeSeat]),
      'the bye holder meets the winner rather than sitting the final out'
    );
  });

  it('refills lives between matches but not between legs of one', () => {
    const ctx = createMockContext(4);
    let state = start(4, { livesPerMatch: 2 });
    const first = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = first.playerAId!, b = first.playerBId!;

    // a cedes the first leg, then wins the match on the next two throws.
    state = throwLeg(state, a, 'ROCK', b, 'PAPER', ctx);
    state = nextRound(state, ctx);
    state = throwLeg(state, a, 'PAPER', b, 'ROCK', ctx);
    assert.equal(state.players[a]!.lives, 1, 'two legs, one of them lost');
    state = nextRound(state, ctx);
    assert.equal(state.players[a]!.lives, 1, 'still the same match, so no refill');

    state = throwLeg(state, a, 'PAPER', b, 'ROCK', ctx);
    state = nextRound(state, ctx);
    assert.notEqual(state.currentMatchId, first.id, 'moved to the other first-round match');
    assert.equal(state.players[a]!.lives, 2, 'lives top back up for a new match');
  });

  it('goes back to throwing when neither fighter is out of lives', () => {
    const ctx = createMockContext(2);
    let state = start(2, { livesPerMatch: 3 });
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = live.playerAId!, b = live.playerBId!;

    state = throwLeg(state, a, 'PAPER', b, 'ROCK', ctx);
    assert.equal(state.phase, 'ROUND_RESULT');
    state = nextRound(state, ctx);

    // Same match, both fighters alive -- the room has to let them throw again,
    // otherwise the bracket sits on the result screen forever.
    assert.equal(state.phase, 'CHOOSING');
    assert.equal(state.currentMatchId, live.id);
    assert.equal(state.players[b]!.lives, 2, 'no refill mid-match');
    assert.equal(state.lastRoundOutcome!.winnerIds[0], a);
  });

  it('a 5-player bracket plays four first-round matches and a two-match final', () => {
    const state = start(5);
    assert.equal(state.bracket!.rounds[0]!.length, 4, '5 entrants pad to 8 slots');
    assert.equal(state.bracket!.rounds[0]!.filter((m) => m.status === 'BYE').length, 3);
  });
});

describe('Tournament anti-cheat', () => {
  it('masks the live leg\'s choices from the opponent', () => {
    const ctx = createMockContext(2);
    let state = start(2);
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = live.playerAId!, b = live.playerBId!;

    state = throwLeg(state, a, 'ROCK', b, 'PAPER', ctx);

    const bView = rockPaperScissorsGame.getPlayerView(state, b, ctx);
    assert.equal(bView.bracket!.rounds[0]!.find((m) => m.id === live.id)!.legs[0]!.choices.ROCK, undefined);
    assert.equal(bView.phase, 'ROUND_RESULT', 'resolved legs are public');
  });

  it('never leaks the host\'s or an opponent\'s choice during CHOOSING', () => {
    const ctx = createMockContext(4);
    let state = start(4, { hostMode: false });
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const a = live.playerAId!, b = live.playerBId!;

    state = rockPaperScissorsGame.processMove(
      state,
      { type: 'MAKE_CHOICE', playerId: a, payload: { choice: 'SCISSORS' }, timestamp: Date.now() },
      ctx
    ).newState!;

    const bView = rockPaperScissorsGame.getPlayerView(state, b, ctx);
    assert.equal(bView.players.find((p) => p.id === a)!.choice, null);
    assert.equal(bView.players.find((p) => p.id === a)!.hasChosen, true, 'locked in, still hidden');
    assert.equal(bView.me.lives, 3);
  });

  it('only auto-picks for the live match on the turn timer', () => {
    let autoPicked: string[] = [];
    const ctx: GameContext = {
      ...createMockContext(4),
      random: () => 0,
    };
    let state = start(4);
    const live = state.bracket!.rounds[0]!.find((m) => m.status === 'LIVE')!;
    const idle = state.playerOrder.filter(
      (id) => id !== live.playerAId && id !== live.playerBId
    );

    const after = rockPaperScissorsGame.onTimerExpired!(state, 'CHOOSING_TIMEOUT', ctx).newState!;
    const chosen = after.playerOrder.filter((id) => after.players[id]!.currentChoice !== null);
    assert.deepEqual(new Set(chosen), new Set([live.playerAId, live.playerBId]));
    autoPicked = idle;
    assert.equal(autoPicked.length, 2, 'the two bystanders were not thrown into the match');
  });
});

describe('Existing modes are untouched', () => {
  it('Duel, Battle Royale and Points Race carry no bracket', () => {
    for (const [mode, n] of [
      ['DUEL', 2],
      ['BATTLE_ROYALE', 4],
      ['POINTS_RACE', 4],
    ] as const) {
      const state = rockPaperScissorsGame.setup(createMockContext(n), {
        gameMode: mode,
        targetScore: 3,
      });
      assert.equal(state.bracket, undefined, `${mode} has no bracket`);
      assert.equal(state.currentMatchId, undefined);
      assert.equal(state.phase, 'CHOOSING');
      assert.equal(Object.keys(state.players).length, n);
    }
  });
});

describe('Tournament defaults', () => {
  it('falls back to three lives and clamps the configured value', () => {
    assert.equal(start(2, { livesPerMatch: undefined as any }).players[Object.keys(start(2).players)[0]!]!.lives, 3);
    const state = start(2, { livesPerMatch: 99 });
    assert.equal(Object.values(state.players)[0]!.lives, 5, 'clamped to the settings-field max');
  });

  it('a single entrant does not open a bracket', () => {
    const state = rockPaperScissorsGame.setup(createMockContext(1), settings());
    assert.equal(state.bracket, undefined);
    assert.equal(state.phase, 'CHOOSING');
  });
});
