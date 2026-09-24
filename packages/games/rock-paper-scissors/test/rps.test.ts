import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext } from '@party/game-engine';
import { rockPaperScissorsGame } from '../src/index.js';
import type { RPSSettings, RPSMasterState } from '../src/types/index.js';

function createMockContext(playerCount = 2): GameContext {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i + 1}`,
    seatNumber: i + 1,
    displayName: `Player ${i + 1}`,
    isConnected: true,
  }));

  return {
    roomId: 'test-room',
    gameSessionId: 'test-session',
    players,
    random: () => 0.5,
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

describe('Rock Paper Scissors Engine', () => {
  describe('Setup & Anti-Cheat Masking', () => {
    it('sets up 1v1 Duel by default for 2 players', () => {
      const ctx = createMockContext(2);
      const state = rockPaperScissorsGame.setup(ctx, { targetScore: 3 });

      assert.equal(state.gameMode, 'DUEL');
      assert.equal(state.phase, 'CHOOSING');
      assert.equal(state.roundNumber, 1);
      assert.equal(state.targetScore, 3);
      assert.equal(Object.keys(state.players).length, 2);
    });

    it('sets up Battle Royale for 3+ players when unspecified', () => {
      const ctx = createMockContext(4);
      const state = rockPaperScissorsGame.setup(ctx, {});

      assert.equal(state.gameMode, 'BATTLE_ROYALE');
      assert.equal(Object.keys(state.players).length, 4);
    });

    it('masks opponent choice during CHOOSING phase (Anti-Cheat)', () => {
      const ctx = createMockContext(2);
      let state = rockPaperScissorsGame.setup(ctx, { targetScore: 3 });

      // Player 1 picks ROCK
      const move1 = {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'ROCK' },
        timestamp: Date.now(),
      };
      const res1 = rockPaperScissorsGame.processMove(state, move1 as any, ctx);
      assert.equal(res1.success, true);
      state = res1.newState!;

      // Inspect view for Player 1 (self)
      const view1 = rockPaperScissorsGame.getPlayerView(state, 'player-1', ctx);
      assert.equal(view1.me.choice, 'ROCK');
      assert.equal(view1.me.hasChosen, true);

      // Inspect view for Player 2 (opponent)
      const view2 = rockPaperScissorsGame.getPlayerView(state, 'player-2', ctx);
      assert.equal(view2.me.choice, null);
      assert.equal(view2.me.hasChosen, false);

      const p1InView2 = view2.players.find((p) => p.id === 'player-1')!;
      assert.equal(p1InView2.hasChosen, true);
      // Opponent choice MUST be masked
      assert.equal(p1InView2.choice, null);
    });
  });

  describe('1v1 Duel Flow', () => {
    it('resolves Rock vs Scissors: Rock wins point', () => {
      const ctx = createMockContext(2);
      let state = rockPaperScissorsGame.setup(ctx, { gameMode: 'DUEL', targetScore: 3 });

      // Player 1 picks ROCK
      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'ROCK' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      // Player 2 picks SCISSORS
      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-2',
        payload: { choice: 'SCISSORS' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      assert.equal(state.phase, 'ROUND_RESULT');
      assert.equal(state.players['player-1'].score, 1);
      assert.equal(state.players['player-2'].score, 0);
      assert.equal(state.lastRoundOutcome?.winningChoice, 'ROCK');
      assert.deepEqual(state.lastRoundOutcome?.winnerIds, ['player-1']);

      // Revealed in player view now
      const view = rockPaperScissorsGame.getPlayerView(state, 'player-2', ctx);
      const p1 = view.players.find((p) => p.id === 'player-1')!;
      assert.equal(p1.choice, 'ROCK');
    });

    it('resolves Tie: no score change and can advance to next round', () => {
      const ctx = createMockContext(2);
      let state = rockPaperScissorsGame.setup(ctx, { gameMode: 'DUEL', targetScore: 3 });

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'PAPER' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-2',
        payload: { choice: 'PAPER' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      assert.equal(state.phase, 'ROUND_RESULT');
      assert.equal(state.lastRoundOutcome?.isTie, true);
      assert.equal(state.players['player-1'].score, 0);
      assert.equal(state.players['player-2'].score, 0);

      // Advance to next round
      state = rockPaperScissorsGame.processMove(state, {
        type: 'NEXT_ROUND',
        playerId: 'player-1',
        payload: {},
        timestamp: Date.now(),
      } as any, ctx).newState!;

      assert.equal(state.phase, 'CHOOSING');
      assert.equal(state.roundNumber, 2);
      assert.equal(state.players['player-1'].currentChoice, null);
    });

    it('ends game when target score is reached', () => {
      const ctx = createMockContext(2);
      let state = rockPaperScissorsGame.setup(ctx, { gameMode: 'DUEL', targetScore: 1 });

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'SCISSORS' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-2',
        payload: { choice: 'PAPER' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      assert.equal(state.phase, 'GAME_OVER');
      assert.deepEqual(state.winnerIds, ['player-1']);

      const endResult = rockPaperScissorsGame.checkGameEnd(state, ctx);
      assert.notEqual(endResult, null);
      assert.equal(endResult?.isEnded, true);
      assert.deepEqual(endResult?.winners, ['player-1']);
    });
  });

  describe('Battle Royale (Survival Elimination)', () => {
    it('3 weapons present -> Standoff! No eliminations', () => {
      const ctx = createMockContext(3);
      let state = rockPaperScissorsGame.setup(ctx, { gameMode: 'BATTLE_ROYALE' });

      // Player 1: ROCK, Player 2: PAPER, Player 3: SCISSORS
      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'ROCK' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-2',
        payload: { choice: 'PAPER' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-3',
        payload: { choice: 'SCISSORS' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      assert.equal(state.phase, 'ROUND_RESULT');
      assert.equal(state.lastRoundOutcome?.isTie, true);
      assert.equal(state.lastRoundOutcome?.tieReason, 'ALL_THREE_PRESENT');
      assert.equal(state.players['player-1'].isAlive, true);
      assert.equal(state.players['player-2'].isAlive, true);
      assert.equal(state.players['player-3'].isAlive, true);
    });

    it('2 weapons present -> Losers eliminated, last survivor wins', () => {
      const ctx = createMockContext(3);
      let state = rockPaperScissorsGame.setup(ctx, { gameMode: 'BATTLE_ROYALE' });

      // Player 1: ROCK, Player 2: SCISSORS, Player 3: SCISSORS
      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'ROCK' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-2',
        payload: { choice: 'SCISSORS' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      state = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-3',
        payload: { choice: 'SCISSORS' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      assert.equal(state.phase, 'GAME_OVER');
      assert.equal(state.players['player-1'].isAlive, true);
      assert.equal(state.players['player-2'].isAlive, false);
      assert.equal(state.players['player-3'].isAlive, false);
      assert.deepEqual(state.winnerIds, ['player-1']);
    });
  });

  describe('Timer Expiration Handling', () => {
    it('auto-picks for players who timed out', () => {
      const ctx = createMockContext(2);
      const state = rockPaperScissorsGame.setup(ctx, { gameMode: 'DUEL', roundDurationSeconds: 10 });

      // Only player 1 makes a move
      const intermediate = rockPaperScissorsGame.processMove(state, {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'ROCK' },
        timestamp: Date.now(),
      } as any, ctx).newState!;

      // Timer expires
      const timerRes = rockPaperScissorsGame.onTimerExpired!(
        intermediate,
        'CHOOSING_TIMEOUT',
        ctx,
      );

      assert.equal(timerRes.success, true);
      assert.equal(timerRes.newState?.phase, 'ROUND_RESULT');
      assert.notEqual(timerRes.newState?.players['player-2'].currentChoice, null);
    });
  });

  describe('Host Mode & Screen Projection', () => {
    it('excludes host from playing participants and configures Duel for 2 fighters', () => {
      const ctx = createMockContext(3); // player-1 (host), player-2, player-3
      const state = rockPaperScissorsGame.setup(ctx, {
        hostMode: true,
        hostPlayerId: 'player-1',
        gameMode: 'DUEL',
        targetScore: 3,
      });

      assert.equal(state.hostMode, true);
      assert.equal(state.hostPlayerId, 'player-1');
      assert.equal(state.gameMode, 'DUEL');
      assert.equal(state.playerOrder.length, 2);
      assert.deepEqual(state.playerOrder, ['player-2', 'player-3']);
      assert.equal(state.players['player-1'], undefined);
      assert.notEqual(state.players['player-2'], undefined);
      assert.notEqual(state.players['player-3'], undefined);
    });

    it('prevents host from making moves but allows next round', () => {
      const ctx = createMockContext(3);
      const state = rockPaperScissorsGame.setup(ctx, {
        hostMode: true,
        hostPlayerId: 'player-1',
      });

      const hostMove = {
        type: 'MAKE_CHOICE',
        playerId: 'player-1',
        payload: { choice: 'ROCK' },
        timestamp: Date.now(),
      };
      const validation = rockPaperScissorsGame.validateMove(state, hostMove as any, ctx);
      assert.equal(validation.valid, false);
      assert.match(validation.reason || '', /Host cannot make choices/);
    });

    it('projects host view with isHost: true and canPlay: false', () => {
      const ctx = createMockContext(3);
      const state = rockPaperScissorsGame.setup(ctx, {
        hostMode: true,
        hostPlayerId: 'player-1',
      });

      const hostView = rockPaperScissorsGame.getPlayerView(state, 'player-1', ctx);
      assert.equal(hostView.isHostMode, true);
      assert.equal(hostView.me.isHost, true);
      assert.equal(hostView.me.canPlay, false);
      assert.equal(hostView.players.length, 2);
    });
  });
});
