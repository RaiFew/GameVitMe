import type {
  GameMove,
  GameContext,
  MoveResult,
} from '@party/game-engine';
import type {
  RPSChoice,
  RPSMasterState,
  RPSPlayerState,
} from '../types/index.js';
import { resolveRound } from '../engine/resolver.js';

export function validateRPSMove(
  state: RPSMasterState,
  move: GameMove,
  _ctx: GameContext,
): { valid: boolean; reason?: string } {
  switch (move.type) {
    case 'MAKE_CHOICE': {
      if (state.hostMode && move.playerId === state.hostPlayerId) {
        return { valid: false, reason: 'Host cannot make choices in Host Mode' };
      }
      if (state.phase !== 'CHOOSING') {
        return { valid: false, reason: 'Not currently in choosing phase' };
      }
      const player = state.players[move.playerId];
      if (!player) {
        return { valid: false, reason: 'Player not found in game' };
      }
      if (state.gameMode === 'BATTLE_ROYALE' && !player.isAlive) {
        return { valid: false, reason: 'Player has been eliminated' };
      }
      const choice = (move.payload as any)?.choice as RPSChoice;
      if (choice !== 'ROCK' && choice !== 'PAPER' && choice !== 'SCISSORS') {
        return { valid: false, reason: 'Invalid choice. Must be ROCK, PAPER, or SCISSORS' };
      }
      return { valid: true };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'ROUND_RESULT') {
        return { valid: false, reason: 'Cannot start next round unless round result is showing' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: `Unknown move type: ${move.type}` };
  }
}

export function executeRoundResolution(
  state: RPSMasterState,
  ctx: GameContext,
): RPSMasterState {
  const activePlayerIds = state.playerOrder.filter((id) => {
    const p = state.players[id];
    return p ? (state.gameMode === 'BATTLE_ROYALE' ? p.isAlive : true) : false;
  });

  const outcome = resolveRound(
    state.roundNumber,
    state.gameMode,
    state.players,
    activePlayerIds,
  );

  const newPlayers: Record<string, RPSPlayerState> = { ...state.players };

  for (const id of state.playerOrder) {
    const existing = newPlayers[id];
    if (!existing) continue;

    const p: RPSPlayerState = {
      ...existing,
      choiceHistory: existing.currentChoice
        ? [...existing.choiceHistory, existing.currentChoice]
        : [...existing.choiceHistory],
    };

    if (activePlayerIds.includes(id)) {
      if (outcome.isTie) {
        p.roundStatus = 'TIED';
      } else if (outcome.winnerIds.includes(id)) {
        p.roundStatus = 'WON';
        if (state.gameMode === 'DUEL' || state.gameMode === 'POINTS_RACE') {
          p.score = p.score + 1;
        }
      } else if (outcome.loserIds.includes(id)) {
        p.roundStatus = 'LOST';
        if (state.gameMode === 'BATTLE_ROYALE') {
          p.isAlive = false;
          p.roundStatus = 'ELIMINATED';
        }
      }
    } else {
      p.roundStatus = 'ELIMINATED';
    }

    newPlayers[id] = p;
  }

  // Check game over conditions
  let isGameOver = false;
  let winnerIds: string[] = [];
  let winReason: string | undefined;

  const playerList = Object.values(newPlayers);

  if (state.gameMode === 'DUEL') {
    const maxScore = Math.max(...playerList.map((p) => p.score));
    if (maxScore >= state.targetScore) {
      isGameOver = true;
      winnerIds = playerList
        .filter((p) => p.score === maxScore)
        .map((p) => p.id);
      const firstWinnerId = winnerIds[0];
      const winnerName = firstWinnerId ? newPlayers[firstWinnerId]?.displayName || 'Player' : 'Player';
      winReason = `${winnerName} reached the target of ${state.targetScore} points!`;
    }
  } else if (state.gameMode === 'BATTLE_ROYALE') {
    const alivePlayers = playerList.filter((p) => p.isAlive);
    if (alivePlayers.length <= 1) {
      isGameOver = true;
      if (alivePlayers.length === 1 && alivePlayers[0]) {
        winnerIds = [alivePlayers[0].id];
        winReason = `${alivePlayers[0].displayName} is the Last Survivor! 🏆`;
      } else {
        // Tie in final standoff
        winnerIds = outcome.winnerIds.length > 0 ? outcome.winnerIds : activePlayerIds;
        winReason = 'Joint Champions in final showdown! 🏆';
      }
    }
  } else if (state.gameMode === 'POINTS_RACE') {
    const maxScore = Math.max(...playerList.map((p) => p.score));
    if (maxScore >= state.targetScore) {
      isGameOver = true;
      winnerIds = playerList
        .filter((p) => p.score >= state.targetScore)
        .map((p) => p.id);
      winReason = `Target score of ${state.targetScore} reached!`;
    }
  }

  const newState: RPSMasterState = {
    ...state,
    players: newPlayers,
    history: [...state.history, outcome],
    lastRoundOutcome: outcome,
    phase: isGameOver ? 'GAME_OVER' : 'ROUND_RESULT',
    winnerIds,
    winReason,
  };

  // Schedule auto advance if timer is available
  if (!isGameOver) {
    ctx.clearTimer();
    ctx.scheduleTimer(4000, 'ROUND_RESULT_AUTO_NEXT');
  }

  return newState;
}

export function startNextRound(
  state: RPSMasterState,
  ctx: GameContext,
): RPSMasterState {
  const nextRoundNumber = state.roundNumber + 1;
  const newPlayers: Record<string, RPSPlayerState> = {};

  for (const [id, player] of Object.entries(state.players)) {
    newPlayers[id] = {
      ...player,
      currentChoice: null,
      roundStatus: player.isAlive ? 'PENDING' : 'ELIMINATED',
    };
  }

  const durationMs = state.roundDurationSeconds > 0 ? state.roundDurationSeconds * 1000 : 0;
  const roundExpiresAt = durationMs > 0 ? Date.now() + durationMs : null;

  ctx.clearTimer();
  if (durationMs > 0) {
    ctx.scheduleTimer(durationMs, 'CHOOSING_TIMEOUT');
  }

  return {
    ...state,
    phase: 'CHOOSING',
    roundNumber: nextRoundNumber,
    roundExpiresAt,
    players: newPlayers,
  };
}

export function processRPSMove(
  state: RPSMasterState,
  move: GameMove,
  ctx: GameContext,
): MoveResult<RPSMasterState> {
  switch (move.type) {
    case 'MAKE_CHOICE': {
      const choice = (move.payload as any)?.choice as RPSChoice;
      const player = state.players[move.playerId];
      if (!player) {
        return { success: false, error: 'Player not found' };
      }

      const updatedPlayer: RPSPlayerState = {
        ...player,
        currentChoice: choice,
        roundStatus: 'LOCKED',
      };

      const updatedPlayers: Record<string, RPSPlayerState> = {
        ...state.players,
        [move.playerId]: updatedPlayer,
      };

      const intermediateState: RPSMasterState = {
        ...state,
        players: updatedPlayers,
      };

      // Check if all active players have chosen
      const activePlayers = state.playerOrder
        .map((id) => updatedPlayers[id])
        .filter((p): p is RPSPlayerState =>
          p !== undefined && (state.gameMode === 'BATTLE_ROYALE' ? p.isAlive : true),
        );

      const allChosen = activePlayers.every((p) => p.currentChoice !== null);

      if (allChosen) {
        const resolvedState = executeRoundResolution(intermediateState, ctx);
        return {
          success: true,
          newState: resolvedState,
          events: [
            {
              type: 'ROUND_RESOLVED',
              payload: { outcome: resolvedState.lastRoundOutcome },
              recipient: 'all',
            },
          ],
        };
      }

      return {
        success: true,
        newState: intermediateState,
        events: [
          {
            type: 'PLAYER_LOCKED',
            payload: { playerId: move.playerId },
            recipient: 'all',
          },
        ],
      };
    }

    case 'NEXT_ROUND': {
      const nextState = startNextRound(state, ctx);
      return {
        success: true,
        newState: nextState,
      };
    }

    default:
      return { success: false, error: `Unhandled move type: ${move.type}` };
  }
}
