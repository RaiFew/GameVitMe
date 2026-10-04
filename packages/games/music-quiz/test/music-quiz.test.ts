import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext, GameMove, GamePlayer } from '@party/game-engine';
import {
  musicQuizGame,
  DEFAULT_MUSIC_QUIZ_SETTINGS,
  buildRound,
  labelFor,
  scoreAnswer,
  type MusicQuizMasterState,
  type MusicQuizSettings,
  type QuizTrack,
} from '../src/index.js';

const PLAYERS: GamePlayer[] = [
  { id: 'ana', seatNumber: 1, displayName: 'Ana', isConnected: true },
  { id: 'bo', seatNumber: 2, displayName: 'Bo', isConnected: true },
];

const POOL: QuizTrack[] = Array.from({ length: 12 }, (_, i) => ({
  provider: 'deezer' as const,
  providerId: `t${i}`,
  title: `Song ${i}`,
  artist: `Artist ${i}`,
}));

function harness(seed = 0.42): GameContext & { armed: string | null } {
  const ctx = {
    roomId: 'room-music',
    gameSessionId: 'session-music',
    players: PLAYERS,
    random: () => seed,
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: (_d: number, type: string) => {
      ctx.armed = type;
    },
    clearTimer: () => {
      ctx.armed = null;
    },
    armed: null as string | null,
  };
  return ctx as GameContext & { armed: string | null };
}

function settings(over: Partial<MusicQuizSettings> = {}): MusicQuizSettings {
  return { ...DEFAULT_MUSIC_QUIZ_SETTINGS, rounds: 3, pool: POOL, ...over };
}

function start(over: Partial<MusicQuizSettings> = {}, ctx = harness()): MusicQuizMasterState {
  return musicQuizGame.setup(ctx, settings(over));
}

function send(state: MusicQuizMasterState, ctx: GameContext, playerId: string, type: string, payload: any = {}, timestamp = Date.now()) {
  const m: GameMove = { type, playerId, payload, timestamp };
  const v = musicQuizGame.validateMove(state, m, ctx);
  assert.ok(v.valid, `expected ${type} to be valid, got: ${v.reason}`);
  const r = musicQuizGame.processMove(state, m, ctx);
  assert.ok(r.success && r.newState, `expected ${type} to process, got ${r.error}`);
  return r.newState!;
}

function refuse(state: MusicQuizMasterState, ctx: GameContext, playerId: string, type: string, payload: any = {}) {
  const m: GameMove = { type, playerId, payload, timestamp: Date.now() };
  const v = musicQuizGame.validateMove(state, m, ctx);
  assert.equal(v.valid, false, `expected ${type} to be refused`);
  assert.ok(v.reason, 'a refusal must say why');
  return v;
}

describe('buildRound', () => {
  test('always offers exactly four choices', () => {
    const round = buildRound({
      pool: POOL,
      usedKeys: new Set(),
      questionType: 'TITLE',
      random: () => 0.3,
      roundNumber: 1,
      nowMs: 0,
      answerSeconds: 20,
    });
    assert.ok(round);
    assert.equal(round.choices.length, 4);
    assert.equal(new Set(round.choices).size, 4, 'no duplicate button');
  });

  test('the correct index really points at the correct track', () => {
    for (const seed of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const round = buildRound({
        pool: POOL,
        usedKeys: new Set(),
        questionType: 'BOTH',
        random: () => seed,
        roundNumber: 1,
        nowMs: 0,
        answerSeconds: 20,
      });
      assert.ok(round);
      const label = round.choices[round.correctIndex];
      assert.equal(label, `${round.track.title} — ${round.track.artist}`);
    }
  });

  test('an artist pool cannot make an ARTIST question and says so', () => {
    const oneArtist: QuizTrack[] = Array.from({ length: 9 }, (_, i) => ({
      provider: 'deezer' as const,
      providerId: `x${i}`,
      title: `Hit ${i}`,
      artist: 'Same Band',
    }));
    const round = buildRound({
      pool: oneArtist,
      usedKeys: new Set(),
      questionType: 'ARTIST',
      random: () => 0.4,
      roundNumber: 1,
      nowMs: 0,
      answerSeconds: 20,
    });
    assert.equal(round, null, 'four copies of one artist is not a question');
  });

  test('near-duplicate labels collapse instead of showing twice', () => {
    const twins: QuizTrack[] = [
      { provider: 'deezer', providerId: '1', title: 'Hello There', artist: 'A' },
      { provider: 'deezer', providerId: '2', title: 'hello there!', artist: 'B' },
      { provider: 'deezer', providerId: '3', title: 'Totally Different', artist: 'C' },
      { provider: 'deezer', providerId: '4', title: 'Fourth Song', artist: 'D' },
      { provider: 'deezer', providerId: '5', title: 'Fifth Song', artist: 'E' },
    ];
    const round = buildRound({
      pool: twins,
      usedKeys: new Set(),
      questionType: 'TITLE',
      random: () => 0.4,
      roundNumber: 1,
      nowMs: 0,
      answerSeconds: 20,
    });
    assert.ok(round);
    assert.equal(round.choices.length, 4);
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-–—_'".,()!]+/g, '');
    assert.equal(new Set(round.choices.map(norm)).size, 4, 'no two buttons read the same');
  });

  test('already-played tracks are avoided while the pool allows it', () => {
    const used = new Set(['deezer:t0', 'deezer:t1', 'deezer:t2', 'deezer:t3']);
    const round = buildRound({
      pool: POOL,
      usedKeys: used,
      questionType: 'TITLE',
      random: () => 0.5,
      roundNumber: 2,
      nowMs: 0,
      answerSeconds: 20,
    });
    assert.ok(round);
    assert.ok(!used.has(`deezer:${round.track.providerId}`), 'must not replay t0..t3');
  });
});

describe('labelFor', () => {
  const t = { provider: 'deezer', providerId: '1', title: 'Yellow', artist: 'Coldplay' } as QuizTrack;
  test('TITLE, ARTIST and BOTH ask for what they say', () => {
    assert.equal(labelFor(t, 'TITLE'), 'Yellow');
    assert.equal(labelFor(t, 'ARTIST'), 'Coldplay');
    assert.equal(labelFor(t, 'BOTH'), 'Yellow — Coldplay');
  });
});

describe('scoreAnswer', () => {
  test('an instant correct answer is worth the maximum', () => {
    assert.equal(scoreAnswer(true, 0, 1000, 20000), 1000);
  });
  test('the deadline is worth nothing', () => {
    assert.equal(scoreAnswer(true, 20000, 1000, 20000), 0);
  });
  test('a wrong answer is worth nothing however fast', () => {
    assert.equal(scoreAnswer(false, 0, 1000, 20000), 0);
  });
  test('a later answer always scores less', () => {
    assert.ok(scoreAnswer(true, 5000, 1000, 20000) > scoreAnswer(true, 15000, 1000, 20000));
  });
  test('a negative response cannot buy extra points', () => {
    assert.equal(scoreAnswer(true, -5000, 1000, 20000), 1000);
  });
});

describe('anti-leak', () => {
  test('an ANSWERING view names no title, artist or correct index', () => {
    // ARTIST mode, because in TITLE mode the answer is necessarily one of the
    // four choices. Here the correct song's *title* is the secret, and it has no
    // business in the view at all.
    const state = start({ questionType: 'ARTIST' });
    const view = musicQuizGame.getPlayerView(state, 'ana', harness());
    assert.equal(view.phase, 'ANSWERING');
    assert.equal(view.choices.length, 4);
    const json = JSON.stringify(view);
    assert.ok(!json.includes(state.round.track.title), 'the song title leaked');
    assert.ok(!json.includes('correctIndex'), 'correctIndex leaked');
    assert.ok(!json.includes('fastestPlayerId'), 'fastestPlayerId leaked');
    assert.ok(!json.includes('answers'), 'per-player answers leaked');
    // The audio key is the only handle on the track, and it is not an answer.
    assert.equal(view.audio?.providerId, state.round.track.providerId);
    assert.equal(view.revealed, null);
  });

  test('every other player is told nothing about who answered', () => {
    const ctx = harness();
    const state = send(start(), ctx, 'ana', 'ANSWER', { index: 0 });
    const boView = musicQuizGame.getPlayerView(state, 'bo', ctx);
    assert.equal(boView.myAnswerIndex, null);
    assert.equal(boView.myScore, 0);
    assert.ok(!JSON.stringify(boView).includes('"correct"'));
  });

  test('a REVEAL view gives up the answer', () => {
    const ctx = harness();
    const state = send(start(), ctx, 'ana', 'ANSWER', { index: 0 });
    const revealed = musicQuizGame.onTimerExpired(state, 'answer_timer', ctx)!.newState!;
    const view = musicQuizGame.getPlayerView(revealed, 'ana', ctx);
    assert.equal(view.revealed?.correctIndex, revealed.round.correctIndex);
    assert.equal(view.revealed?.title, revealed.round.track.title);
  });
});

describe('answering', () => {
  test('the phase starts at ANSWERING with the answer clock armed', () => {
    const ctx = harness();
    const state = start({}, ctx);
    assert.equal(state.phase, 'ANSWERING');
    assert.equal(ctx.armed, 'answer_timer');
  });

  test('a correct answer scores by speed', () => {
    const ctx = harness();
    let state = start();
    const deadline = state.round.questionDeadlineMs;
    state = send(state, ctx, 'ana', 'ANSWER', { index: state.round.correctIndex }, deadline - 5000);
    assert.equal(state.players.ana!.score, 750);
    assert.equal(state.players.ana!.correctCount, 1);
  });

  test('a wrong answer scores nothing and still locks the choice', () => {
    const ctx = harness();
    let state = start();
    const wrong = (state.round.correctIndex + 1) % 4;
    state = send(state, ctx, 'ana', 'ANSWER', { index: wrong });
    assert.equal(state.players.ana!.score, 0);
    refuse(state, ctx, 'ana', 'ANSWER', { index: state.round.correctIndex });
  });

  test('a second answer is refused, so a reconnect cannot answer twice', () => {
    const ctx = harness();
    const state = send(start(), ctx, 'ana', 'ANSWER', { index: 0 });
    refuse(state, ctx, 'ana', 'ANSWER', { index: 0 });
  });

  test('the fastest correct answer takes the round', () => {
    const ctx = harness();
    let state = start();
    const deadline = state.round.questionDeadlineMs;
    state = send(state, ctx, 'ana', 'ANSWER', { index: state.round.correctIndex }, deadline - 9000);
    state = send(state, ctx, 'bo', 'ANSWER', { index: state.round.correctIndex }, deadline - 2000);
    assert.equal(state.round.fastestPlayerId, 'bo');
  });

  test('a late answer is refused on the server clock, not the client one', () => {
    const ctx = harness();
    const state = start();
    // A deadline in the past rather than a sleep: the same rule, no waiting.
    const expired = { ...state, round: { ...state.round, questionDeadlineMs: Date.now() - 1 } };
    const m: GameMove = { type: 'ANSWER', playerId: 'ana', payload: { index: 0 }, timestamp: Date.now() };
    assert.equal(musicQuizGame.validateMove(expired, m, ctx).valid, false);
  });

  test('an out-of-range choice is refused', () => {
    const ctx = harness();
    const state = start();
    refuse(state, ctx, 'ana', 'ANSWER', { index: 4 });
    refuse(state, ctx, 'ana', 'ANSWER', { index: -1 });
    refuse(state, ctx, 'ana', 'ANSWER', { index: 1.5 });
    refuse(state, ctx, 'ana', 'ANSWER', {});
  });
});

describe('round flow', () => {
  test('ADVANCE is refused while someone has not answered and time is left', () => {
    const ctx = harness();
    const state = send(start(), ctx, 'ana', 'ANSWER', { index: 0 });
    refuse(state, ctx, 'bo', 'ADVANCE');
  });

  test('ADVANCE once everyone answered opens the reveal and arms its timer', () => {
    const ctx = harness();
    let state = send(start(), ctx, 'ana', 'ANSWER', { index: 0 });
    state = send(state, ctx, 'bo', 'ANSWER', { index: 0 });
    state = send(state, ctx, 'ana', 'ADVANCE');
    assert.equal(state.phase, 'REVEAL');
    assert.equal(ctx.armed, 'reveal_timer');
  });

  test('the answer timer opens the reveal by itself', () => {
    const ctx = harness();
    const state = start();
    const revealed = musicQuizGame.onTimerExpired(state, 'answer_timer', ctx)!.newState!;
    assert.equal(revealed.phase, 'REVEAL');
  });

  test('the reveal timer rolls into the next round with a new track', () => {
    const ctx = harness();
    const first = start();
    const revealed = musicQuizGame.onTimerExpired(first, 'answer_timer', ctx)!.newState!;
    const next = musicQuizGame.onTimerExpired(revealed, 'reveal_timer', ctx)!.newState!;
    assert.equal(next.phase, 'ANSWERING');
    assert.equal(next.roundNumber, 2);
    assert.notEqual(next.round.track.providerId, first.round.track.providerId);
    assert.equal(next.round.answers && Object.keys(next.round.answers).length, 0, 'scores do not carry over');
    assert.equal(next.players.ana!.score, 0);
  });

  test('the last round finishes the game and every tie wins', () => {
    const ctx = harness();
    let state = start({ rounds: 1 });
    const deadline = state.round.questionDeadlineMs;
    state = send(state, ctx, 'ana', 'ANSWER', { index: state.round.correctIndex }, deadline - 1000);
    const revealed = musicQuizGame.onTimerExpired(state, 'answer_timer', ctx)!.newState!;
    const over = musicQuizGame.onTimerExpired(revealed, 'reveal_timer', ctx)!.newState!;
    assert.equal(over.phase, 'GAME_OVER');
    assert.deepEqual(over.winnerPlayerIds, ['ana']);
    const end = musicQuizGame.checkGameEnd(over, ctx);
    assert.ok(end?.isEnded);
    assert.deepEqual(end?.winners, ['ana']);
    assert.equal(end?.scoreSummary?.ana, 950);
  });

  test('a pool that cannot make a round ends the game instead of rendering nothing', () => {
    const ctx = harness();
    const state = start({ pool: POOL.slice(0, 3) });
    assert.equal(state.phase, 'GAME_OVER');
    assert.deepEqual(state.winnerPlayerIds, []);
    assert.ok(musicQuizGame.checkGameEnd(state, ctx)?.isEnded);
  });

  test('a move after the game is over is refused', () => {
    const ctx = harness();
    const state = start({ pool: POOL.slice(0, 3) });
    refuse(state, ctx, 'ana', 'ANSWER', { index: 0 });
    refuse(state, ctx, 'ana', 'ADVANCE');
  });

  test('an unknown action is refused rather than ignored', () => {
    const ctx = harness();
    refuse(start(), ctx, 'ana', 'TOTALLY_MADE_UP');
  });
});

describe('settings', () => {
  test('hostile numbers are clamped instead of reaching the timers', () => {
    const ctx = harness();
    const state = start({ rounds: 9999, answerSeconds: -4, excerptSeconds: 1e9, maxPoints: 0 }, ctx);
    assert.equal(state.settings.rounds, 50);
    assert.equal(state.settings.answerSeconds, 5);
    assert.equal(state.settings.excerptSeconds, 30);
    assert.equal(state.settings.maxPoints, 100);
  });

  test('the deadline follows the clamped answer window', () => {
    const ctx = harness();
    const state = start({ answerSeconds: 60 });
    assert.equal(state.round.questionDeadlineMs - state.round.questionStartedAtMs, 60000);
  });
});