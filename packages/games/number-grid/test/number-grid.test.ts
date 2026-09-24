import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext } from '@party/game-engine';
import {
  numberGridGame,
  generateBoard,
  calculateRoundGridSizes,
  ALL_GRID_SIZES,
  DEFAULT_NUMBER_GRID_SETTINGS,
} from '../src/index.js';

function createMockContext(players: { id: string; displayName?: string }[]): GameContext {
  const events: { event: string; payload: unknown }[] = [];
  return {
    roomId: 'test-room-1',
    gameSessionId: 'session-123',
    players: players.map((p, i) => ({
      id: p.id,
      displayName: p.displayName || `Player ${i + 1}`,
      seatNumber: i + 1,
      isConnected: true,
    })),
    random: () => Math.random(),
    broadcast: (event, payload) => {
      events.push({ event, payload });
    },
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

function doMove(
  state: any,
  playerId: string,
  type: string,
  payload: any,
  ctx: GameContext,
): any {
  return numberGridGame.processMove(
    state,
    { playerId, type, payload, timestamp: Date.now() },
    ctx,
  );
}

describe('Number Grid Engine & Rules', () => {
  describe('Board Generator (2x2 through 10x10)', () => {
    it('generates correct cards for all supported grid sizes 2x2 to 10x10', () => {
      for (const size of ALL_GRID_SIZES) {
        const board = generateBoard(size);
        const total = size * size;
        assert.equal(board.length, total, `Grid ${size}x${size} should have ${total} cards`);

        const numbers = board.map((c) => c.number);
        // Check all numbers 1..total exist
        const set = new Set(numbers);
        assert.equal(set.size, total, `Grid ${size}x${size} numbers must all be unique`);

        for (let i = 1; i <= total; i++) {
          assert.ok(set.has(i), `Number ${i} must exist in grid ${size}x${size}`);
        }
      }
    });

    it('shuffles cards randomly across different runs', () => {
      const board1 = generateBoard(4);
      const board2 = generateBoard(4);
      const nums1 = board1.map((c) => c.number).join(',');
      const nums2 = board2.map((c) => c.number).join(',');
      assert.notEqual(nums1, nums2);
    });
  });

  describe('Difficulty Progression Calculation', () => {
    it('calculates Default Progression (2x2 to 10x10)', () => {
      const sizes = calculateRoundGridSizes('DEFAULT', 9);
      assert.deepEqual(sizes, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('calculates Custom Round Grid Sizes', () => {
      const custom = [3, 3, 5, 7, 10] as const;
      const sizes = calculateRoundGridSizes('CUSTOM', 5, [...custom]);
      assert.deepEqual(sizes, [3, 3, 5, 7, 10]);
    });

    it('calculates Random Mode Grid Sizes within valid 2..10 range', () => {
      const sizes = calculateRoundGridSizes('RANDOM', 6);
      assert.equal(sizes.length, 6);
      for (const s of sizes) {
        assert.ok(s >= 2 && s <= 10);
      }
    });
  });

  describe('Game Lifecycle & Sequential Number Clicking', () => {
    it('initializes game and players start with expectedNumber = 1 and configured HP', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        maxHp: 4,
        totalRounds: 3,
      });

      assert.equal(state.phase, 'PLAYING');
      assert.equal(state.currentRoundNumber, 1);
      assert.equal(state.currentRound.gridSize, 2); // default round 1 is 2x2
      assert.equal(state.players['p1'].expectedNumber, 1);
      assert.equal(state.players['p1'].hp, 4);
      assert.equal(state.players['p2'].expectedNumber, 1);
    });

    it('advances expectedNumber on correct click sequence 1 -> 2 -> 3 -> 4', () => {
      const ctx = createMockContext([{ id: 'p1' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        totalRounds: 1,
      });

      // Find card with number 1
      const card1 = state.currentRound.cards.find((c) => c.number === 1)!;
      const res1 = doMove(state, 'p1', 'CLICK_NUMBER', { cardId: card1.id, number: 1 }, ctx);
      assert.equal(res1.success, true);
      assert.equal(res1.newState.players['p1'].expectedNumber, 2);

      // Click card with number 2
      const card2 = state.currentRound.cards.find((c) => c.number === 2)!;
      const res2 = doMove(res1.newState, 'p1', 'CLICK_NUMBER', { cardId: card2.id, number: 2 }, ctx);
      assert.equal(res2.success, true);
      assert.equal(res2.newState.players['p1'].expectedNumber, 3);
    });

    it('penalizes wrong clicks by deducting 1 HP and keeping expectedNumber unchanged', () => {
      const ctx = createMockContext([{ id: 'p1' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        maxHp: 3,
      });

      // Expected is 1, but player clicks card with number 3
      const card3 = state.currentRound.cards.find((c) => c.number === 3)!;
      const res = doMove(state, 'p1', 'CLICK_NUMBER', { cardId: card3.id, number: 3 }, ctx);

      assert.equal(res.success, true);
      assert.equal(res.newState.players['p1'].expectedNumber, 1); // Still 1!
      assert.equal(res.newState.players['p1'].hp, 2); // 3 -> 2
      assert.equal(res.newState.players['p1'].wrongClicks, 1);
    });

    it('eliminates player when HP drops to 0', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        maxHp: 1,
      });

      // Wrong click with 1 HP -> 0 HP -> eliminated
      const card2 = state.currentRound.cards.find((c) => c.number === 2)!;
      const res = doMove(state, 'p1', 'CLICK_NUMBER', { cardId: card2.id, number: 2 }, ctx);

      assert.equal(res.newState.players['p1'].hp, 0);
      assert.equal(res.newState.players['p1'].eliminated, true);
      assert.equal(res.newState.phase, 'PLAYING');

      // Subsequent clicks rejected because player is eliminated
      const moveAfterDead = doMove(res.newState, 'p1', 'CLICK_NUMBER', { cardId: card2.id, number: 2 }, ctx);
      assert.equal(moveAfterDead.success, false);
      assert.match(moveAfterDead.error!, /eliminated/);
    });
  });

  describe('Multiplayer Damage Modes', () => {
    it('LAST_PLAYER mode: damages the last player to finish the round', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
      let state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        maxHp: 5,
        damageMode: 'LAST_PLAYER',
        totalRounds: 2,
      });

      // Total numbers in 2x2 = 4
      // p1 finishes 1st
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p1', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }
      assert.equal(state.players['p1'].completed, true);
      assert.equal(state.players['p1'].finishOrder, 1);

      // p2 finishes 2nd
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p2', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }
      assert.equal(state.players['p2'].completed, true);
      assert.equal(state.players['p2'].finishOrder, 2);

      // p3 finishes 3rd (last!)
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p3', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }

      // Round resolved!
      assert.equal(state.phase, 'ROUND_RESULT');
      // p1 and p2 have 5 HP
      assert.equal(state.players['p1'].hp, 5);
      assert.equal(state.players['p2'].hp, 5);
      // p3 was last -> received 1 damage -> 4 HP
      assert.equal(state.players['p3'].hp, 4);
      assert.deepEqual(state.roundResults?.damagedPlayerIds, ['p3']);
    });

    it('EVERYONE_EXCEPT_FIRST mode: damages all players except the 1st finisher', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
      let state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        maxHp: 5,
        damageMode: 'EVERYONE_EXCEPT_FIRST',
        totalRounds: 2,
      });

      // p1 finishes 1st
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p1', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }

      // p2 finishes 2nd
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p2', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }

      // p3 finishes 3rd
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p3', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }

      assert.equal(state.phase, 'ROUND_RESULT');
      // Only p1 was 1st -> took 0 damage -> 5 HP
      assert.equal(state.players['p1'].hp, 5);
      // p2 and p3 take damage -> 4 HP
      assert.equal(state.players['p2'].hp, 4);
      assert.equal(state.players['p3'].hp, 4);
    });
  });

  describe('Round Reset & Game Over', () => {
    it('advances to next round with new board and resets progress while retaining HP', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }]);
      let state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        totalRounds: 2,
        maxHp: 3,
      });

      // Both complete round 1 (2x2)
      for (let num = 1; num <= 4; num++) {
        const card = state.currentRound.cards.find((c) => c.number === num)!;
        state = doMove(state, 'p1', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
        state = doMove(state, 'p2', 'CLICK_NUMBER', { cardId: card.id, number: num }, ctx).newState;
      }

      assert.equal(state.phase, 'ROUND_RESULT');

      // Advance to round 2
      const res = doMove(state, 'p1', 'START_NEXT_ROUND', {}, ctx);

      assert.equal(res.success, true);
      assert.equal(res.newState.currentRoundNumber, 2);
      assert.equal(res.newState.currentRound.gridSize, 3); // 3x3 in round 2
      assert.equal(res.newState.currentRound.totalNumbers, 9);
      assert.equal(res.newState.phase, 'PLAYING');
      assert.equal(res.newState.players['p1'].expectedNumber, 1);
      assert.equal(res.newState.players['p1'].completed, false);
      assert.equal(res.newState.players['p2'].expectedNumber, 1);
    });
  });

  describe('Player View Projection & Anti-Cheat', () => {
    it('sanitizes player view with opponents summary and does not expose private internals', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
      });

      const viewP1 = numberGridGame.getPlayerView(state, 'p1', ctx);
      assert.equal(viewP1.me?.playerId, 'p1');
      assert.equal(viewP1.me?.expectedNumber, 1);
      assert.equal(viewP1.opponents.length, 1);
      assert.equal(viewP1.opponents[0].id, 'p2');
    });
  });
});
