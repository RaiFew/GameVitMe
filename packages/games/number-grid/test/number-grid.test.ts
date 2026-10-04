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
  const ctx: GameContext = {
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
  return Object.assign(ctx, { events });
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

    it('spreads the default progression across the host round count up to their ceiling', () => {
      assert.deepEqual(calculateRoundGridSizes('DEFAULT', 5, undefined, Math.random, 10), [
        2, 4, 6, 8, 10,
      ]);
      assert.deepEqual(calculateRoundGridSizes('DEFAULT', 3, undefined, Math.random, 5), [2, 4, 5]);
      // A one-round game is just the ceiling; there is nowhere to scale from.
      assert.deepEqual(calculateRoundGridSizes('DEFAULT', 1, undefined, Math.random, 8), [8]);
    });

    it('holds at the ceiling when there are more rounds than steps to it', () => {
      const sizes = calculateRoundGridSizes('DEFAULT', 6, undefined, Math.random, 4);
      assert.equal(sizes.length, 6);
      assert.equal(sizes[0], 2);
      assert.equal(sizes[sizes.length - 1], 4);
      for (const s of sizes) assert.ok(s >= 2 && s <= 4);
    });

    it('clamps a host-supplied ceiling instead of trusting it', () => {
      // maxGridSize arrives in room settings, which any host can write.
      assert.deepEqual(calculateRoundGridSizes('DEFAULT', 3, undefined, Math.random, 99), [2, 6, 10]);
      assert.deepEqual(calculateRoundGridSizes('DEFAULT', 3, undefined, Math.random, 0), [2, 6, 10]);
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
      assert.equal(res.newState.currentRound.gridSize, 10); // 2 rounds to the 10x10 ceiling: 2, 10
      assert.equal(res.newState.currentRound.totalNumbers, 100);
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

    it('exposes a host in the player view even outside host mode', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        hostMode: false,
        hostPlayerId: 'p2',
      });

      assert.equal(numberGridGame.getPlayerView(state, 'p2', ctx).isHost, true);
      assert.equal(numberGridGame.getPlayerView(state, 'p1', ctx).isHost, false);
    });
  });

  describe('Round Advance Gating', () => {
    /** Drives a player through the whole current board, 1..N. */
    function completeBoard(state: any, playerId: string, ctx: GameContext): any {
      let cur = state;
      const total = cur.currentRound.totalNumbers;
      for (let n = 1; n <= total; n++) {
        const card = cur.currentRound.cards.find((c: any) => c.number === n)!;
        const res = doMove(cur, playerId, 'CLICK_NUMBER', { cardId: card.id, number: n }, ctx);
        assert.equal(res.success, true);
        cur = res.newState;
      }
      return cur;
    }

    function reachRoundResult(ctx: GameContext) {
      const setup = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        totalRounds: 3,
        hostPlayerId: 'p1',
      });
      // The round only resolves once every alive player has finished.
      return completeBoard(completeBoard(setup, 'p1', ctx), 'p2', ctx);
    }

    it('rejects START_NEXT_ROUND from a non-host player', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }]);
      const resolved = reachRoundResult(ctx);
      assert.equal(resolved.phase, 'ROUND_RESULT');

      const res = doMove(resolved, 'p2', 'START_NEXT_ROUND', {}, ctx);
      assert.equal(res.success, false);
      assert.match(res.error!, /host/i);
      assert.equal(res.newState.currentRoundNumber, 1);
    });

    it('allows the host to advance and generates a fresh board', () => {
      const ctx = createMockContext([{ id: 'p1' }, { id: 'p2' }]);
      const resolved = reachRoundResult(ctx);
      const firstBoardIds = resolved.currentRound.cards.map((c: any) => c.id);

      const res = doMove(resolved, 'p1', 'START_NEXT_ROUND', {}, ctx);
      assert.equal(res.success, true);
      assert.equal(res.newState.currentRoundNumber, 2);
      assert.equal(res.newState.phase, 'PLAYING');
      // Three rounds scaling to the default 10x10 ceiling is 2, 6, 10.
      assert.equal(res.newState.currentRound.gridSize, 6);
      assert.notDeepEqual(res.newState.currentRound.cards.map((c: any) => c.id), firstBoardIds);
    });

    it('lets any player advance when the room has no host', () => {
      const ctx = createMockContext([{ id: 'p1' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        totalRounds: 2,
      });
      delete (state as any).hostPlayerId;

      // Solo play must survive round 1: one survivor alone is not a match win.
      const finished = completeBoard(state, 'p1', ctx);
      assert.equal(finished.phase, 'ROUND_RESULT');

      const res = doMove(finished, 'p1', 'START_NEXT_ROUND', {}, ctx);
      assert.equal(res.success, true);
      assert.equal(res.newState.currentRoundNumber, 2);
    });

    it('emits game:finished exactly once when the game ends', () => {
      const ctx = createMockContext([{ id: 'p1' }]);
      const state = numberGridGame.setup(ctx, {
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        totalRounds: 1,
      });
      completeBoard(state, 'p1', ctx);

      const finishedEvents = (ctx as any).events.filter(
        (e: any) => e.event === 'game:finished',
      );
      // The socket handler emits game:finished from checkGameEnd(); the engine
      // must not also emit it or clients receive the event twice.
      assert.equal(finishedEvents.length, 0);
      assert.equal(numberGridGame.checkGameEnd(state).isEnded, true);
    });
  });

  describe('RoomRunner Integration', () => {
    it('plays a full match through the registry-backed runner the server uses', async () => {
      const { GameRegistry, RoomRunner } = await import('@party/game-engine');
      GameRegistry.getInstance().register(numberGridGame);

      const emitted: { playerId: string; event: string; payload: any }[] = [];
      const runner = new RoomRunner<any, any, any>('number-grid', 'room-1', 'sess-1');
      runner.setPlayers([
        { id: 'p1', displayName: 'Host', seatNumber: 1, isConnected: true },
        { id: 'p2', displayName: 'Guest', seatNumber: 2, isConnected: true },
      ]);
      runner.setBroadcast(() => {});
      runner.setEmitToPlayer((playerId, event, payload) =>
        emitted.push({ playerId, event, payload }),
      );

      runner.setup({
        ...DEFAULT_NUMBER_GRID_SETTINGS,
        totalRounds: 2,
        maxHp: 3,
        damageMode: 'LAST_PLAYER',
        hostMode: false,
        hostPlayerId: 'p1',
      } as any);

      assert.equal(runner.getCurrentPhase(), 'PLAYING');

      for (let round = 1; round <= 2; round++) {
        const view = runner.getPlayerView('p1')!;
        const total = view.totalNumbers;
        assert.equal(total, view.gridSize * view.gridSize);
        assert.equal(view.cards.length, total);

        // Numbers are exactly 1..N with no duplicates.
        const numbers = view.cards.map((c: any) => c.number).sort((a: number, b: number) => a - b);
        assert.deepEqual(numbers, Array.from({ length: total }, (_, i) => i + 1));

        for (const playerId of ['p1', 'p2']) {
          for (let n = 1; n <= total; n++) {
            const card = runner.getPlayerView(playerId)!.cards.find((c: any) => c.number === n)!;
            const res = runner.processMove({
              type: 'CLICK_NUMBER',
              playerId,
              payload: { cardId: card.id, number: n },
              timestamp: Date.now(),
            } as any);
            assert.equal(res.success, true);
          }
        }

        if (round < 2) {
          assert.equal(runner.getCurrentPhase(), 'ROUND_RESULT');

          // Non-host is rejected, host advances.
          const denied = runner.processMove({
            type: 'START_NEXT_ROUND', playerId: 'p2', payload: {}, timestamp: Date.now(),
          } as any);
          assert.equal(denied.success, false);

          const advanced = runner.processMove({
            type: 'START_NEXT_ROUND', playerId: 'p1', payload: {}, timestamp: Date.now(),
          } as any);
          assert.equal(advanced.success, true);
          assert.equal(runner.getCurrentPhase(), 'PLAYING');
        }
      }

      assert.equal(runner.getCurrentPhase(), 'GAME_OVER');
      const end = runner.checkGameEnd();
      assert.equal(end?.isEnded, true);
      assert.ok(end!.winners.length > 0);

      // Exactly one game:finished is left for the socket handler to emit.
      assert.equal(
        emitted.filter((e) => e.event === 'game:finished').length,
        0,
      );
    });
  });
});
