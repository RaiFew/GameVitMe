import type {
  NumberGridMasterState,
  NumberGridPlayerView,
  OpponentSummary,
} from '../types/index.js';

/**
 * Projects authoritative master game state into a player-specific view,
 * adhering to anti-cheat principles.
 */
export function projectNumberGridPlayerView(
  state: NumberGridMasterState,
  playerId: string,
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
        Math.max(0, Math.floor(((p.expectedNumber - 1) / totalNumbers) * 100)),
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

  return {
    phase: state.phase,
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
    roundResults: state.roundResults,
    winners: state.winnerPlayerIds.length > 0 ? state.winnerPlayerIds : undefined,
  };
}
