import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { codenamesGame, DEFAULT_CODENAMES_SETTINGS } from '../src/index.js';
import type { GameContext } from '@party/game-engine';
import type { CodenamesMasterState } from '../src/types/index.js';

const ROSTER = [
  { id: 'host-1', displayName: 'Host' },
  { id: 'p1', displayName: 'Red Op' },
  { id: 'p2', displayName: 'Blue SM' },
  { id: 'p3', displayName: 'Blue Op' },
];

const REPEATED_TURN_SECONDS = 1;

/** Records what the game armed, so a test can fire a timer without waiting. */
function makeCtx() {
  const armed: { timerType: string; durationMs: number }[] = [];
  let seed = 7;
  const ctx: GameContext = {
    roomId: 'room',
    gameSessionId: 'session',
    players: ROSTER.map((p, i) => ({ ...p, seatNumber: i + 1, isConnected: true })),
    random: () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    },
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: (durationMs, timerType) => {
      armed.push({ timerType, durationMs });
    },
    clearTimer: () => {},
  };
  return { ctx, armed };
}

function startedMatch(clueTimeSeconds: number, guessTimeSeconds: number) {
  const { ctx, armed } = makeCtx();
  let state = codenamesGame.setup(ctx, {
    ...DEFAULT_CODENAMES_SETTINGS,
    hostPlayerId: 'host-1',
    clueTimeSeconds,
    guessTimeSeconds,
  });

  state.players[0]!.team = 'RED';
  state.players[0]!.role = 'SPYMASTER';
  state.players[1]!.team = 'RED';
  state.players[1]!.role = 'OPERATIVE';
  state.players[2]!.team = 'BLUE';
  state.players[2]!.role = 'SPYMASTER';
  state.players[3]!.team = 'BLUE';
  state.players[3]!.role = 'OPERATIVE';

  state = codenamesGame.processMove(
    state,
    { type: 'START_MATCH', playerId: 'host-1', payload: {}, timestamp: Date.now() },
    ctx
  ).newState!;

  // The board generator's starting team is random; pin it so the turns below
  // are the ones the assertions describe.
  state.startingTeam = 'RED';
  state.currentTeam = 'RED';
  state.phase = 'CLUE';
  return { ctx, armed, state };
}

const fire = (state: CodenamesMasterState, timerType: string, ctx: GameContext) => {
  const res = codenamesGame.onTimerExpired!(state, timerType, ctx);
  assert.equal(res.success, true, `expected ${timerType} to be handled: ${res.error}`);
  return res.newState!;
};

describe('Codenames turn timers', () => {
  test('a 0-second setting arms nothing and publishes no deadline', () => {
    const { armed, state } = startedMatch(0, 0);
    assert.equal(armed.length, 0);
    assert.equal(state.turnExpiresAt, null);
    assert.equal(state.timerKind, null);
  });

  test('START_MATCH arms the clue timer and stamps a deadline', () => {
    const { ctx, armed, state } = startedMatch(45, 90);
    assert.equal(armed.length, 1);
    assert.deepEqual(armed[0], { timerType: 'clue_timer', durationMs: 45_000 });
    assert.equal(state.timerKind, 'CLUE');
    assert.ok((state.turnExpiresAt ?? 0) > Date.now());
  });

  test('the clue timer being run out forfeits the turn and never invents a clue', () => {
    const { ctx, state } = startedMatch(REPEATED_TURN_SECONDS, REPEATED_TURN_SECONDS);

    const after = fire(state, 'clue_timer', ctx);

    assert.equal(after.phase, 'CLUE');
    assert.equal(after.currentTeam, 'BLUE', 'the turn passes to the other team');
    assert.equal(after.turnNumber, 2);
    assert.equal(after.currentClue, null, 'no clue was written on the Spymaster\'s behalf');

    // The forfeit is itself recorded, so the history shows why the turn went by.
    assert.equal(after.history.length, 1);
    assert.equal(after.history[0]!.clue, null);
    assert.equal(after.history[0]!.endedReason, 'CLUE_TIMEOUT');
    assert.equal(after.history[0]!.turnNumber, 1);
  });

  test('the guessing timer being run out ends the turn without spending a guess', () => {
    const { ctx, state } = startedMatch(REPEATED_TURN_SECONDS, REPEATED_TURN_SECONDS);
    const guessing = codenamesGame.processMove(
      state,
      { type: 'SUBMIT_CLUE', playerId: 'host-1', payload: { word: 'OCEAN', number: 2 }, timestamp: Date.now() },
      ctx
    ).newState!;

    const guessesBefore = guessing.guessesRemaining;
    const after = fire(guessing, 'guess_timer', ctx);

    assert.equal(after.phase, 'CLUE');
    assert.equal(after.currentTeam, 'BLUE');
    // The clue survives in the log, but nothing is marked as guessed.
    assert.equal(after.history[0]!.clue?.word, 'OCEAN');
    assert.equal(after.history[0]!.guesses.length, 0);
    assert.ok(guessesBefore > 0);
    assert.equal(after.guessesRemaining, 0);
  });

  test('a timer from the previous turn cannot fire into the current phase', () => {
    const { ctx, state } = startedMatch(REPEATED_TURN_SECONDS, REPEATED_TURN_SECONDS);
    const guessing = codenamesGame.processMove(
      state,
      { type: 'SUBMIT_CLUE', playerId: 'host-1', payload: { word: 'OCEAN', number: 2 }, timestamp: Date.now() },
      ctx
    ).newState!;

    // A clue timer left over from before the clue was given.
    const stale = codenamesGame.onTimerExpired!(guessing, 'clue_timer', ctx);
    assert.equal(stale.success, false);
    assert.match(stale.error || '', /does not match the GUESSING phase/);

    const unknown = codenamesGame.onTimerExpired!(guessing, 'round_timer', ctx);
    assert.equal(unknown.success, false);
  });

  test('each phase change re-arms with the duration of the phase entered', () => {
    const { ctx, armed, state } = startedMatch(45, 90);
    armed.length = 0;

    const guessing = codenamesGame.processMove(
      state,
      { type: 'SUBMIT_CLUE', playerId: 'host-1', payload: { word: 'OCEAN', number: 2 }, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(guessing.phase, 'GUESSING');
    assert.equal(guessing.timerKind, 'GUESSING');
    assert.deepEqual(armed.at(-1), { timerType: 'guess_timer', durationMs: 90_000 });

    const neutral = guessing.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!;
    const backToClue = codenamesGame.processMove(
      guessing,
      { type: 'SELECT_CARD', playerId: 'p1', payload: { cardId: neutral.id }, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(backToClue.phase, 'CLUE');
    assert.equal(backToClue.timerKind, 'CLUE');
    assert.deepEqual(armed.at(-1), { timerType: 'clue_timer', durationMs: 45_000 });
  });

  test('a correct guess inside the same turn keeps the guessing timer running', () => {
    const { ctx, armed, state } = startedMatch(45, 90);
    const guessing = codenamesGame.processMove(
      state,
      { type: 'SUBMIT_CLUE', playerId: 'host-1', payload: { word: 'OCEAN', number: 3 }, timestamp: Date.now() },
      ctx
    ).newState!;
    armed.length = 0;

    const red = guessing.cards.find((c) => c.color === 'RED' && !c.revealed)!;
    const stillGuessing = codenamesGame.processMove(
      guessing,
      { type: 'SELECT_CARD', playerId: 'p1', payload: { cardId: red.id }, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(stillGuessing.phase, 'GUESSING');
    assert.equal(stillGuessing.timerKind, 'GUESSING');
    assert.deepEqual(armed.at(-1), { timerType: 'guess_timer', durationMs: 90_000 });
  });

  test('the deadline survives in the player view so a reconnecting client agrees', () => {
    const { ctx, state } = startedMatch(60, 0);
    assert.equal(state.timerKind, 'CLUE');
    const view = codenamesGame.getPlayerView(state, 'p1', ctx);
    assert.equal(view.timerKind, 'CLUE');
    assert.ok((view.turnExpiresAt ?? 0) > Date.now());

    // Same value whichever client asks, because it is stamped on the state
    // rather than computed per projection.
    assert.equal(codenamesGame.getPlayerView(state, 'p2', ctx).turnExpiresAt, view.turnExpiresAt);
  });

  test('disconnecting leaves the phase and its deadline alone', () => {
    const { ctx, state } = startedMatch(60, 60);
    const after = codenamesGame.onPlayerDisconnected!(state, 'p1', ctx).newState!;
    assert.equal(after.phase, state.phase);
    assert.equal(after.turnExpiresAt, state.turnExpiresAt);
  });
});