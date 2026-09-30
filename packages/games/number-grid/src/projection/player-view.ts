import type {
  NumberGridMasterState,
  NumberGridPlayerView,
  OpponentSummary,
} from '../types/index.js';
import { isRankedVariant, leaderboardKeyFor, rankingDirectionFor, RANKED_TIME_PENALTY_MS, RANKED_TIME_STAGES } from '../types/index.js';
import { lockRemainingMs } from '../moves/index.js';

/**
 * Projects authoritative master game state into a player-specific view,
 * adhering to anti-cheat principles.
 */
export function projectNumberGridPlayerView(
  state: NumberGridMasterState,
  playerId: string,
  now: number = Date.now(),
): NumberGridPlayerView {
  const isHost = state.hostPlayerId === playerId;
  const isHostOnlyMode = !!state.settings.hostMode;
  const canPlay = !isHostOnlyMode || !isHost;

  const me = state.players[playerId] || null;
  const totalNumbers = state.currentRound.totalNumbers;

  // Generate opponents summary
  const opponents: OpponentSummary[] = Object.values(state.players)
    .filter((p) => p.playerId !== playerId)
    .map((p) => {
      const progressPercent = Math.min(
        100,
        Math.max(0, Math.floor((p.expectedIndex / totalNumbers) * 100)),
      );
      return {
        id: p.playerId,
        displayName: p.displayName,
        hp: p.hp,
        maxHp: p.maxHp,
        completed: p.completed,
        finishOrder: p.finishOrder,
        eliminated: p.eliminated,
        progressPercent,
        expectedNumber: p.expectedNumber,
      };
    });

  const view: NumberGridPlayerView = {
    phase: state.phase,
    variant: state.variant,
    currentRoundNumber: state.currentRoundNumber,
    totalRounds: state.totalRounds,
    gridSize: state.currentRound.gridSize,
    totalNumbers,
    cards: state.currentRound.cards,
    me: me ? { ...me } : null,
    isHost,
    canPlay,
    damageMode: state.settings.damageMode,
    opponents,
    serverNow: now,
    roundResults: state.roundResults,
    winners: state.winnerPlayerIds.length > 0 ? state.winnerPlayerIds : undefined,
  };

  if (isRankedVariant(state.variant)) {
    const direction = rankingDirectionFor(state.variant)!;
    // Elapsed is the sum of cleared stages plus the stage in progress, all of it
    // measured from server timestamps. The client only renders this number.
    const cleared = state.roundTimesMs.reduce((a, b) => a + b, 0);
    const inProgress =
      state.phase === 'PLAYING' ? Math.max(0, now - state.currentRound.startedAt) : 0;

    view.ranked = {
      leaderboardKey: leaderboardKeyFor(state.variant)!,
      rankingDirection: direction,
      elapsedMs: cleared + inProgress,
      stages: state.variant === 'RANKED_TIME' ? RANKED_TIME_STAGES : 0,
      penaltyMs: state.variant === 'RANKED_TIME' ? RANKED_TIME_PENALTY_MS : 0,
      // Left on the penalty lock, so the client can count it down. Display only:
      // the server re-checks the same deadline on every incoming move.
      lockedForMs: me ? lockRemainingMs(me, now) : 0,
      // The run's own result, shown to the player it belongs to. Built by the
      // engine from server state; it is not hidden and not client-supplied.
      result: state.phase === 'GAME_OVER' ? state.rankedResult : undefined,
    };
  }

  return view;
}
