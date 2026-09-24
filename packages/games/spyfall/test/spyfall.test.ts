import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spyfallGame } from '../src/index.js';
import { SpyfallPhase, SpyfallMoveType } from '../src/state.js';
import type { GameContext } from '@party/game-engine';

function createMockContext(playerCount = 4, hostId = 'p1'): { ctx: GameContext; timers: Array<{ delay: number; type: string }> } {
  const timers: Array<{ delay: number; type: string }> = [];
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    connected: true,
  }));

  let seed = 42;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const ctx: GameContext = {
    gameId: 'spyfall',
    roomId: 'room-1',
    players,
    hostPlayerId: hostId,
    random,
    scheduleTimer: (delayMs: number, type: string) => {
      timers.push({ delay: delayMs, type });
    },
    cancelTimer: () => {},
  };

  return { ctx, timers };
}

describe('Spyfall Game Rules & Mechanics', () => {
  describe('Setup and Role Assignment', () => {
    for (const playerCount of [4, 8, 12]) {
      it(`No Host Mode: assigns exactly 1 Spy among all ${playerCount} players`, () => {
        const { ctx } = createMockContext(playerCount);
        const state = spyfallGame.setup(ctx, { hostMode: false, roundDurationSeconds: 480, locationCount: 16 });

        assert.equal(state.playerOrder.length, playerCount);
        const spies = Object.entries(state.playerRoles).filter(([_, role]) => role === 'Spy');
        assert.equal(spies.length, 1);
        assert.equal(state.spyPlayerId, spies[0]![0]);

        for (const [pid, role] of Object.entries(state.playerRoles)) {
          if (pid !== state.spyPlayerId) {
            assert.notEqual(role, 'Spy');
            assert.ok(role.length > 0);
          }
        }
      });

      it(`Host Mode: host does NOT play; assigns 1 Spy among ${playerCount - 1} playing players`, () => {
        const { ctx } = createMockContext(playerCount, 'p1');
        const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });

        // Host is excluded from playing players in playerOrder
        assert.equal(state.playerOrder.length, playerCount - 1);
        assert.ok(!state.playerOrder.includes('p1'));

        // Host has 'Host' role and is NEVER the Spy
        assert.equal(state.playerRoles['p1'], 'Host');
        assert.notEqual(state.spyPlayerId, 'p1');

        const spies = Object.entries(state.playerRoles).filter(([_, role]) => role === 'Spy');
        assert.equal(spies.length, 1);
        assert.ok(state.playerOrder.includes(state.spyPlayerId));
      });
    }

    it('schedules round timer according to settings', () => {
      const { ctx, timers } = createMockContext(4);
      spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 300, locationCount: 16 });

      assert.equal(timers.length, 1);
      assert.equal(timers[0]!.type, 'round_timer');
      assert.equal(timers[0]!.delay, 300000);
    });
  });

  describe('Anti-Cheat Projection and Host Separation', () => {
    it('Host in Host Mode has canPlay: false and receives myRole Host', () => {
      const { ctx } = createMockContext(4, 'p1');
      const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      const hostView = spyfallGame.getPlayerView(state, 'p1', ctx);

      assert.equal(hostView.isHost, true);
      assert.equal(hostView.canPlay, false);
      assert.equal(hostView.myRole, 'Host');
      assert.equal(hostView.isSpy, false);
      // Location is hidden from Host during the game
      assert.equal(hostView.location, null);
    });

    it('never leaks location to the Spy', () => {
      const { ctx } = createMockContext(4, 'p1');
      const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      const spyView = spyfallGame.getPlayerView(state, state.spyPlayerId, ctx);

      assert.equal(spyView.isSpy, true);
      assert.equal(spyView.canPlay, true);
      assert.equal(spyView.location, null);
      assert.equal(spyView.myRole, 'Spy');
      assert.ok(spyView.allLocations.length > 0);
    });

    it('never leaks spy identity to innocent players or the Host', () => {
      const { ctx } = createMockContext(4, 'p1');
      const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });

      const innocentId = state.playerOrder.find((pid) => pid !== state.spyPlayerId)!;
      const innocentView = spyfallGame.getPlayerView(state, innocentId, ctx);

      assert.equal(innocentView.isSpy, false);
      assert.equal(innocentView.canPlay, true);
      assert.equal(innocentView.location, state.selectedLocation);
      assert.equal(innocentView.myRole, state.playerRoles[innocentId]);
      assert.equal((innocentView as any).spyPlayerId, undefined);

      const hostView = spyfallGame.getPlayerView(state, 'p1', ctx);
      assert.equal(hostView.isSpy, false);
      assert.equal((hostView as any).spyPlayerId, undefined);
    });
  });

  describe('Turn System and Anti-Retaliation', () => {
    it('blocks host from asking or answering questions in Host Mode', () => {
      const { ctx } = createMockContext(4, 'p1');
      const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      // Host tries to ask
      const hostAsk = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.ASK_QUESTION,
        playerId: 'p1',
        payload: { targetPlayerId: 'p2' },
      }, ctx);
      assert.equal(hostAsk.valid, false);

      // Player tries to ask the Host
      const askHost = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.ASK_QUESTION,
        playerId: state.currentQuestionerId!,
        payload: { targetPlayerId: 'p1' },
      }, ctx);
      assert.equal(askHost.valid, false);
    });

    it('progresses questioning and blocks self-asking and immediate retaliation among active players', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });

      const readyRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.READY_TO_PLAY,
        playerId: 'p1',
      }, ctx);
      assert.equal(readyRes.success, true);
      state = readyRes.newState!;
      assert.equal(state.phase, SpyfallPhase.QUESTIONING);

      const q1 = state.currentQuestionerId!;
      assert.notEqual(q1, 'p1'); // Not the host
      const target1 = state.playerOrder.find((p) => p !== q1)!;

      const selfMove = {
        type: SpyfallMoveType.ASK_QUESTION,
        playerId: q1,
        payload: { targetPlayerId: q1 },
      };
      const selfCheck = spyfallGame.validateMove(state, selfMove, ctx);
      assert.equal(selfCheck.valid, false);
      assert.ok(selfCheck.reason?.includes('yourself'));

      const askRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.ASK_QUESTION,
        playerId: q1,
        payload: { targetPlayerId: target1 },
      }, ctx);
      assert.equal(askRes.success, true);
      state = askRes.newState!;
      assert.equal(state.currentAnswererId, target1);

      const answerRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.ANSWER_DONE,
        playerId: target1,
      }, ctx);
      assert.equal(answerRes.success, true);
      state = answerRes.newState!;

      assert.equal(state.currentQuestionerId, target1);
      assert.equal(state.previousQuestionerId, q1);

      const retaliateMove = {
        type: SpyfallMoveType.ASK_QUESTION,
        playerId: target1,
        payload: { targetPlayerId: q1 },
      };
      const retaliateCheck = spyfallGame.validateMove(state, retaliateMove, ctx);
      assert.equal(retaliateCheck.valid, false);
      assert.ok(retaliateCheck.reason?.includes('asked you'));

      const thirdPlayer = state.playerOrder.find((p) => p !== target1 && p !== q1)!;
      const validMove = {
        type: SpyfallMoveType.ASK_QUESTION,
        playerId: target1,
        payload: { targetPlayerId: thirdPlayer },
      };
      const validCheck = spyfallGame.validateMove(state, validMove, ctx);
      assert.equal(validCheck.valid, true);
    });
  });

  describe('Accusation Limits', () => {
    it('blocks host from accusing in Host Mode', () => {
      const { ctx } = createMockContext(4, 'p1');
      const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const hostAccuse = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: 'p1',
        payload: { targetPlayerId: 'p2' },
      }, ctx);
      assert.equal(hostAccuse.valid, false);
      assert.ok(hostAccuse.reason?.includes('Host cannot accuse'));
    });

    it('allows only 1 indictment attempt per active player per round', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const accuser = state.playerOrder[0]!;
      const accused = state.playerOrder[1]!;

      const selfAccuse = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: accuser,
        payload: { targetPlayerId: accuser },
      }, ctx);
      assert.equal(selfAccuse.valid, false);

      const accuseRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: accuser,
        payload: { targetPlayerId: accused },
      }, ctx);
      assert.equal(accuseRes.success, true);
      state = accuseRes.newState!;
      assert.equal(state.phase, SpyfallPhase.ACCUSATION_VOTE);
      assert.equal(state.indictmentUsed[accuser], true);

      const voter = state.voting!.order[0]!;
      const noRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.VOTE,
        playerId: voter,
        payload: { vote: 'NO' },
      }, ctx);
      assert.equal(noRes.success, true);
      state = noRes.newState!;
      assert.equal(state.phase, SpyfallPhase.QUESTIONING);

      const thirdPlayer = state.playerOrder.find((p) => p !== accuser && p !== accused)!;
      const secondAccuse = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: accuser,
        payload: { targetPlayerId: thirdPlayer },
      }, ctx);
      assert.equal(secondAccuse.valid, false);
      assert.ok(secondAccuse.reason?.includes('already used'));
    });
  });

  describe('Sequential Voting & Unanimous Conviction', () => {
    it('enforces turn order, excludes host, and cancels on NO vote', () => {
      const { ctx } = createMockContext(5, 'p1'); // 1 Host + 4 Playing Players (p2, p3, p4, p5)
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      // p2 accuses p3
      const accuseRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: 'p2',
        payload: { targetPlayerId: 'p3' },
      }, ctx);
      state = accuseRes.newState!;
      assert.equal(state.phase, SpyfallPhase.ACCUSATION_VOTE);

      // Voting order must exclude p3 (accused) and p1 (host)
      assert.ok(!state.voting!.order.includes('p3'));
      assert.ok(!state.voting!.order.includes('p1'));
      assert.equal(state.voting!.order.length, 3); // p2, p4, p5

      const firstVoter = state.voting!.order[0]!;
      const secondVoter = state.voting!.order[1]!;

      // Host cannot vote
      const hostVoteCheck = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.VOTE,
        playerId: 'p1',
        payload: { vote: 'YES' },
      }, ctx);
      assert.equal(hostVoteCheck.valid, false);

      // Second voter out of turn
      const outOfTurnCheck = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.VOTE,
        playerId: secondVoter,
        payload: { vote: 'YES' },
      }, ctx);
      assert.equal(outOfTurnCheck.valid, false);
      assert.ok(outOfTurnCheck.reason?.includes('turn'));

      // First voter votes NO -> fails
      const voteNoRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.VOTE,
        playerId: firstVoter,
        payload: { vote: 'NO' },
      }, ctx);
      assert.equal(voteNoRes.success, true);
      state = voteNoRes.newState!;

      assert.equal(state.phase, SpyfallPhase.QUESTIONING);
      assert.equal(state.voting, null);
      assert.equal(state.accusedPlayerId, null);
    });

    it('unanimous YES convicts: if Spy accused -> NON_SPIES win', () => {
      const { ctx } = createMockContext(5, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const spyId = state.spyPlayerId;
      const innocentPlayers = state.playerOrder.filter((pid) => pid !== spyId);
      const accuser = innocentPlayers[0]!;

      const accuseRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: accuser,
        payload: { targetPlayerId: spyId },
      }, ctx);
      state = accuseRes.newState!;

      for (const voter of [...state.voting!.order]) {
        const voteRes = spyfallGame.processMove(state, {
          type: SpyfallMoveType.VOTE,
          playerId: voter,
          payload: { vote: 'YES' },
        }, ctx);
        assert.equal(voteRes.success, true);
        state = voteRes.newState!;
      }

      assert.equal(state.phase, SpyfallPhase.GAME_OVER);
      assert.equal(state.gameOverData!.winner, 'NON_SPIES');
      assert.equal(state.gameOverData!.spyPlayerId, spyId);

      const checkEnd = spyfallGame.checkGameEnd(state, ctx);
      assert.equal(checkEnd?.isEnded, true);
      assert.ok(!checkEnd?.winners.includes(spyId));
    });

    it('unanimous YES convicts: if Innocent accused -> Spy wins', () => {
      const { ctx } = createMockContext(5, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const spyId = state.spyPlayerId;
      const innocentPlayers = state.playerOrder.filter((pid) => pid !== spyId);
      const accuser = spyId;
      const innocentVictim = innocentPlayers[0]!;

      const accuseRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.ACCUSE,
        playerId: accuser,
        payload: { targetPlayerId: innocentVictim },
      }, ctx);
      state = accuseRes.newState!;

      for (const voter of [...state.voting!.order]) {
        const voteRes = spyfallGame.processMove(state, {
          type: SpyfallMoveType.VOTE,
          playerId: voter,
          payload: { vote: 'YES' },
        }, ctx);
        assert.equal(voteRes.success, true);
        state = voteRes.newState!;
      }

      assert.equal(state.phase, SpyfallPhase.GAME_OVER);
      assert.equal(state.gameOverData!.winner, 'SPY');

      const checkEnd = spyfallGame.checkGameEnd(state, ctx);
      assert.equal(checkEnd?.isEnded, true);
      assert.deepEqual(checkEnd?.winners, [spyId]);
    });
  });

  describe('Spy Reveal and Location Guessing', () => {
    it('blocks non-spies and host from revealing or guessing', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      // Host cannot reveal
      const hostCheck = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.SPY_REVEAL,
        playerId: 'p1',
      }, ctx);
      assert.equal(hostCheck.valid, false);

      const innocentId = state.playerOrder.find((pid) => pid !== state.spyPlayerId)!;
      const checkReveal = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.SPY_REVEAL,
        playerId: innocentId,
      }, ctx);
      assert.equal(checkReveal.valid, false);
      assert.ok(checkReveal.reason?.toLowerCase().includes('only the spy'));
    });

    it('correct location guess awards victory to Spy', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const revealRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.SPY_REVEAL,
        playerId: state.spyPlayerId,
      }, ctx);
      assert.equal(revealRes.success, true);
      state = revealRes.newState!;
      assert.equal(state.phase, SpyfallPhase.SPY_GUESS);

      const guessRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.SPY_GUESS_LOCATION,
        playerId: state.spyPlayerId,
        payload: { location: state.selectedLocation },
      }, ctx);
      assert.equal(guessRes.success, true);
      state = guessRes.newState!;

      assert.equal(state.phase, SpyfallPhase.GAME_OVER);
      assert.equal(state.gameOverData!.winner, 'SPY');
    });

    it('wrong location guess awards victory to Normal Players', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const revealRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.SPY_REVEAL,
        playerId: state.spyPlayerId,
      }, ctx);
      state = revealRes.newState!;

      const wrongLocation = state.allLocations.find((l) => l !== state.selectedLocation)!;
      const guessRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.SPY_GUESS_LOCATION,
        playerId: state.spyPlayerId,
        payload: { location: wrongLocation },
      }, ctx);
      assert.equal(guessRes.success, true);
      state = guessRes.newState!;

      assert.equal(state.phase, SpyfallPhase.GAME_OVER);
      assert.equal(state.gameOverData!.winner, 'NON_SPIES');
    });
  });

  describe('Host Controls & Manual End', () => {
    it('allows only host to end game early in Host Mode', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const nonHostCheck = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.HOST_END_GAME,
        playerId: 'p2',
      }, ctx);
      assert.equal(nonHostCheck.valid, false);
      assert.ok(nonHostCheck.reason?.toLowerCase().includes('host'));

      const endRes = spyfallGame.processMove(state, {
        type: SpyfallMoveType.HOST_END_GAME,
        playerId: 'p1',
      }, ctx);
      assert.equal(endRes.success, true);
      state = endRes.newState!;
      assert.equal(state.phase, SpyfallPhase.GAME_OVER);
      assert.ok(state.gameOverData!.reason.toLowerCase().includes('host'));
    });

    it('blocks HOST_END_GAME when hostMode is disabled', () => {
      const { ctx } = createMockContext(4, 'p1');
      let state = spyfallGame.setup(ctx, { hostMode: false, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const check = spyfallGame.validateMove(state, {
        type: SpyfallMoveType.HOST_END_GAME,
        playerId: 'p1',
      }, ctx);
      assert.equal(check.valid, false);
      assert.ok(check.reason?.toLowerCase().includes('host mode'));
    });
  });

  describe('Timer Expiration', () => {
    it('round_timer expiration concludes the game with Spy victory', () => {
      const { ctx } = createMockContext(4);
      const state = spyfallGame.setup(ctx, { hostMode: true, hostPlayerId: 'p1', roundDurationSeconds: 480, locationCount: 16 });
      state.phase = SpyfallPhase.QUESTIONING;

      const expRes = spyfallGame.onTimerExpired!(state, 'round_timer', ctx);
      assert.equal(expRes.success, true);
      assert.equal(expRes.newState!.phase, SpyfallPhase.GAME_OVER);
      assert.equal(expRes.newState!.gameOverData!.winner, 'SPY');
      assert.ok(expRes.newState!.gameOverData!.reason.includes("Time's up"));
    });
  });
});
