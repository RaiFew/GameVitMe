import type { GameContext } from '@party/game-engine';
import type {
  RPSChoice,
  RPSMasterState,
  RPSPlayerView,
  RPSPlayerViewItem,
} from '../types/index.js';

export function projectRPSPlayerView(
  state: RPSMasterState,
  playerId: string,
  _ctx: GameContext,
): RPSPlayerView {
  const isHost = state.hostMode && playerId === state.hostPlayerId;
  const isSecretPhase = state.phase === 'CHOOSING';

  const playerList: RPSPlayerViewItem[] = [];

  for (const id of state.playerOrder) {
    const p = state.players[id];
    if (!p) continue;
    const isSelf = id === playerId;

    // Critical anti-cheat: hide opponent's choice until choosing phase finishes
    // Even on Host TV screen, choices are secret during choosing to prevent screen-peeking
    const visibleChoice: RPSChoice | null =
      (isSelf && !isHost) || !isSecretPhase ? p.currentChoice : null;

    playerList.push({
      id: p.id,
      displayName: p.displayName,
      seatNumber: p.seatNumber,
      score: p.score,
      isAlive: p.isAlive,
      hasChosen: p.currentChoice !== null,
      choice: visibleChoice,
      roundStatus: p.roundStatus,
      choiceHistory: [...p.choiceHistory],
      isHost: false,
      canPlay: true,
    });
  }

  let me: RPSPlayerViewItem;

  if (isHost) {
    me = {
      id: playerId,
      displayName: 'Host (TV Screen)',
      seatNumber: 0,
      score: 0,
      isAlive: true,
      hasChosen: false,
      choice: null,
      roundStatus: 'PENDING' as const,
      choiceHistory: [],
      isHost: true,
      canPlay: false,
    };
  } else {
    me = playerList.find((p) => p.id === playerId) || {
      id: playerId,
      displayName: 'Unknown',
      seatNumber: 0,
      score: 0,
      isAlive: false,
      hasChosen: false,
      choice: null,
      roundStatus: 'ELIMINATED' as const,
      choiceHistory: [],
      isHost: false,
      canPlay: false,
    };
  }

  // Compute weapon distribution stats
  const weaponCounts: Record<RPSChoice, number> = {
    ROCK: 0,
    PAPER: 0,
    SCISSORS: 0,
  };

  for (const outcome of state.history) {
    for (const choice of Object.values(outcome.choices)) {
      if (choice) {
        weaponCounts[choice] = (weaponCounts[choice] || 0) + 1;
      }
    }
  }

  let mostCommonWeapon: RPSChoice | undefined;
  let maxCount = 0;
  for (const [w, count] of Object.entries(weaponCounts) as [RPSChoice, number][]) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonWeapon = w;
    }
  }

  const leader = [...playerList].sort((a, b) => b.score - a.score)[0];

  return {
    gameMode: state.gameMode,
    phase: state.phase,
    roundNumber: state.roundNumber,
    targetScore: state.targetScore,
    roundDurationSeconds: state.roundDurationSeconds,
    roundExpiresAt: state.roundExpiresAt,
    isHostMode: state.hostMode,
    hostPlayerId: state.hostPlayerId,
    me,
    players: playerList,
    lastRoundOutcome: state.lastRoundOutcome,
    winnerIds: state.winnerIds,
    winReason: state.winReason,
    stats: {
      totalRounds: state.history.length,
      mostCommonWeapon,
      leaderId: leader?.id,
    },
  };
}
