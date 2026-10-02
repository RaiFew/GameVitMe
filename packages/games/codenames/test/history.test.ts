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

function makeCtx() {
  let seed = 11;
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
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
  return ctx;
}

function startedMatch(ctx: GameContext) {
  let state = codenamesGame.setup(ctx, {
    ...DEFAULT_CODENAMES_SETTINGS,
    hostPlayerId: 'host-1',
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

  state.startingTeam = 'RED';
  state.currentTeam = 'RED';
  state.phase = 'CLUE';
  return state;
}

const clue = (state: CodenamesMasterState, ctx: GameContext, by: string, word: string, n: number) =>
  codenamesGame.processMove(
    state,
    { type: 'SUBMIT_CLUE', playerId: by, payload: { word, number: n }, timestamp: Date.now() },
    ctx
  ).newState!;

const guess = (state: CodenamesMasterState, ctx: GameContext, by: string, cardId: string) =>
  codenamesGame.processMove(
    state,
    { type: 'SELECT_CARD', playerId: by, payload: { cardId }, timestamp: Date.now() },
    ctx
  ).newState!;

describe('Codenames turn history', () => {
  test('the log records the clue and every word guessed in the turn', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);

    state = clue(state, ctx, 'host-1', 'OCEAN', 2);
    const correct = state.cards.find((c) => c.color === 'RED' && !c.revealed)!;
    const bystander = state.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!;

    state = guess(state, ctx, 'p1', correct.id);
    state = guess(state, ctx, 'p1', bystander.id);

    assert.equal(state.history.length, 1, 'one turn has finished');
    const turn = state.history[0]!;
    assert.equal(turn.turnNumber, 1);
    assert.equal(turn.team, 'RED');
    assert.equal(turn.clue?.word, 'OCEAN');
    assert.equal(turn.clue?.number, 2);
    assert.equal(turn.endedReason, 'WRONG_GUESS', 'a bystander ended the turn');
    assert.deepEqual(
      turn.guesses.map((g) => [g.word, g.resultedIn, g.guessedBy]),
      [
        [correct.word, 'CORRECT', 'p1'],
        [bystander.word, 'NEUTRAL', 'p1'],
      ]
    );
  });

  test('a turn spent down on its clue is logged as MAX_GUESSES', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);

    // A clue of 1 buys two guesses (the card plus the bonus one).
    state = clue(state, ctx, 'host-1', 'TREE', 1);
    assert.equal(state.guessesRemaining, 2);

    for (let i = 0; i < 2; i++) {
      const red = state.cards.find((c) => c.color === 'RED' && !c.revealed)!;
      state = guess(state, ctx, 'p1', red.id);
    }

    assert.equal(state.phase, 'CLUE');
    assert.equal(state.history[0]!.endedReason, 'MAX_GUESSES');
    assert.equal(state.history[0]!.guesses.every((g) => g.resultedIn === 'CORRECT'), true);
    assert.equal(state.history[0]!.guesses.length, 2);
  });

  test('a wrong card ends the turn as WRONG_GUESS, not as an exhausted clue', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);
    state = clue(state, ctx, 'host-1', 'TREE', 5);
    state = guess(state, ctx, 'p1', state.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!.id);
    assert.equal(state.history[0]!.endedReason, 'WRONG_GUESS');
  });

  test('each finished turn is its own log entry, oldest first', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);

    state = clue(state, ctx, 'host-1', 'ONE', 1);
    state = guess(state, ctx, 'p1', state.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!.id);

    state = clue(state, ctx, 'p2', 'TWO', 1);
    state = guess(state, ctx, 'p3', state.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!.id);

    assert.deepEqual(
      state.history.map((t) => [t.turnNumber, t.team, t.clue?.word]),
      [
        [1, 'RED', 'ONE'],
        [2, 'BLUE', 'TWO'],
      ]
    );
  });

  test('passing the turn is logged as a pass, not as a wrong guess', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);
    state = clue(state, ctx, 'host-1', 'ONE', 1);
    state = codenamesGame.processMove(
      state,
      { type: 'PASS_TURN', playerId: 'p1', timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.history[0]!.endedReason, 'PASS');
    assert.equal(state.history[0]!.guesses.length, 0);
  });

  test('the assassin guess is logged before the game ends', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);
    state = clue(state, ctx, 'host-1', 'ONE', 1);
    state = guess(state, ctx, 'p1', state.cards.find((c) => c.color === 'ASSASSIN')!.id);

    assert.equal(state.phase, 'GAME_OVER');
    assert.equal(state.history[0]!.endedReason, 'ASSASSIN');
    assert.equal(state.history[0]!.guesses[0]!.resultedIn, 'ASSASSIN');
  });

  test('an Operative\'s history hides the colour of words, a Spymaster\'s does not', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);
    state = clue(state, ctx, 'host-1', 'OCEAN', 2);
    const bystander = state.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!;
    state = guess(state, ctx, 'p1', bystander.id);

    const operativeView = codenamesGame.getPlayerView(state, 'p1', ctx);
    const smView = codenamesGame.getPlayerView(state, 'host-1', ctx);

    assert.equal(operativeView.history[0]!.guesses[0]!.color, undefined);
    assert.equal(operativeView.history[0]!.guesses[0]!.word, bystander.word);
    assert.equal(smView.history[0]!.guesses[0]!.color, 'NEUTRAL');
  });

  test('the turn in flight is visible before it has been filed', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);
    state = clue(state, ctx, 'host-1', 'OCEAN', 2);
    const red1 = state.cards.find((c) => c.color === 'RED' && !c.revealed)!;
    state = guess(state, ctx, 'p1', red1.id);

    const view = codenamesGame.getPlayerView(state, 'p1', ctx);
    // Filed history is still empty; the live turn is shown separately.
    assert.equal(state.history.length, 0);
    const live = view.history[view.history.length - 1]!;
    assert.equal(live.endedReason, 'IN_PROGRESS');
    assert.equal(live.clue?.word, 'OCEAN');
    assert.equal(live.guesses.length, 1);
    assert.equal(live.guesses[0]!.word, red1.word);
  });

test('a finished turn stops accumulating once it is filed', () => {
    const ctx = makeCtx();
    let state = startedMatch(ctx);
    state = clue(state, ctx, 'host-1', 'OCEAN', 2);
    const red1 = state.cards.find((c) => c.color === 'RED' && !c.revealed)!;
    state = guess(state, ctx, 'p1', red1.id);
    assert.equal(state.currentGuesses.length, 1);
    assert.equal(state.history.length, 0, 'still mid-turn');

    // A correct guess keeps the turn open, so the scratch list keeps growing.
    const red2 = state.cards.find((c) => c.color === 'RED' && !c.revealed)!;
    state = guess(state, ctx, 'p1', red2.id);
    assert.equal(state.currentGuesses.length, 2);
    assert.equal(state.history.length, 0);

    state = codenamesGame.processMove(
      state,
      { type: 'PASS_TURN', playerId: 'p1', timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.currentGuesses.length, 0, 'filing the turn clears the scratch list');
    assert.equal(state.history[0]!.guesses.length, 2, 'the filed turn kept both guesses');

    state = clue(state, ctx, 'p2', 'TREE', 1);
    assert.equal(state.currentGuesses.length, 0, 'a new clue starts a fresh scratch list');
    assert.equal(state.history[0]!.guesses.length, 2, 'and does not grow the filed turn');
  });
});