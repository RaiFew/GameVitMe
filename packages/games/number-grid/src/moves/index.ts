import type { GameContext } from '@party/game-engine';
import type {
  NumberGridMasterState,
  GridSize,
  PlayerProgressState,
} from '../types/index.js';
import { generateBoard } from '../engine/board-generator.js';

export interface ClickNumberPayload {
  cardId: string;
  number: number;
}

export function validateNumberGridMove(
  state: NumberGridMasterState,
  playerId: string,
  type: string,
  payload: unknown,
): { valid: boolean; error?: string } {
  if (!state) return { valid: false, error: 'Game not initialized' };

  if (type === 'CLICK_NUMBER') {
    if (state.phase !== 'PLAYING') {
      return { valid: false, error: `Cannot click number during ${state.phase} phase.` };
    }

    const player = state.players[playerId];
    if (!player) {
      return { valid: false, error: 'Player not in game' };
    }

    if (player.eliminated || player.hp <= 0) {
      return { valid: false, error: 'You are eliminated and cannot click numbers.' };
    }

    if (player.completed) {
      return { valid: false, error: 'You already completed this round!' };
    }

    const data = payload as ClickNumberPayload;
    if (!data || typeof data.number !== 'number' || !data.cardId) {
      return { valid: false, error: 'Invalid click payload' };
    }

    const card = state.currentRound.cards.find(
      (c) => c.id === data.cardId && c.number === data.number,
    );
    if (!card) {
      return { valid: false, error: 'Card not found on the current board' };
    }

    return { valid: true };
  }

  if (type === 'START_NEXT_ROUND') {
    if (state.phase !== 'ROUND_RESULT') {
      return { valid: false, error: 'Can only advance to next round from round results phase.' };
    }

    // Host or any alive player can trigger advance
    return { valid: true };
  }

  return { valid: false, error: `Unknown move type: "${type}"` };
}

export function processNumberGridMove(
  state: NumberGridMasterState,
  playerId: string,
  type: string,
  payload: unknown,
  ctx: GameContext,
): NumberGridMasterState {
  if (type === 'CLICK_NUMBER') {
    return processClickNumber(state, playerId, payload as ClickNumberPayload, ctx);
  }

  if (type === 'START_NEXT_ROUND') {
    return startNextRound(state, ctx);
  }

  return state;
}

function processClickNumber(
  state: NumberGridMasterState,
  playerId: string,
  payload: ClickNumberPayload,
  ctx: GameContext,
): NumberGridMasterState {
  const player = state.players[playerId];
  if (!player || player.eliminated || player.completed || state.phase !== 'PLAYING') {
    return state;
  }

  const { cardId, number } = payload;
  const isCorrect = number === player.expectedNumber;

  if (isCorrect) {
    // Correct click
    player.expectedNumber += 1;
    player.lastClickResult = {
      cardId,
      number,
      correct: true,
      timestamp: Date.now(),
    };

    // Check if player completed the whole grid!
    if (player.expectedNumber > state.currentRound.totalNumbers) {
      player.completed = true;
      state.currentRound.completedPlayerIds.push(playerId);
      player.finishOrder = state.currentRound.completedPlayerIds.length;

      // Broadcast completion badge
      ctx.broadcast('number_grid:player_completed', {
        playerId,
        displayName: player.displayName,
        finishOrder: player.finishOrder,
      });
    }
  } else {
    // Wrong click!
    player.wrongClicks += 1;
    player.lastClickResult = {
      cardId,
      number,
      correct: false,
      timestamp: Date.now(),
    };

    // Deduct 1 HP if wrong click damage is enabled (default true)
    if (state.settings.wrongClickDamage !== false) {
      player.hp = Math.max(0, player.hp - 1);
      if (player.hp === 0) {
        player.eliminated = true;

        ctx.broadcast('number_grid:player_eliminated', {
          playerId,
          displayName: player.displayName,
          reason: 'WRONG_CLICK_FATAL',
        });
      }
    }
  }

  // Check if round should end
  checkRoundCompletion(state, ctx);

  return state;
}

/**
 * Checks whether all active alive players have either finished the board or been eliminated.
 */
export function checkRoundCompletion(
  state: NumberGridMasterState,
  ctx: GameContext,
): boolean {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter((p) => !p.eliminated && p.hp > 0);

  // If all alive players have completed the board:
  const allAliveCompleted =
    alivePlayers.length > 0 && alivePlayers.every((p) => p.completed);

  // If the match started with 2+ players, but only <= 1 survivor remains:
  const startedWithMultiple = allPlayers.length >= 2;
  const onlyOneSurvivorLeft = startedWithMultiple && alivePlayers.length <= 1;

  if (allAliveCompleted || onlyOneSurvivorLeft || alivePlayers.length === 0) {
    executeRoundResolution(state, ctx);
    return true;
  }

  return false;
}

/**
 * Authoritatively resolves the round, applies multiplayer damage mode penalties,
 * checks eliminations, and determines if game should end.
 */
export function executeRoundResolution(
  state: NumberGridMasterState,
  ctx: GameContext,
): void {
  state.currentRound.endedAt = Date.now();

  const allPlayers = Object.values(state.players);
  const previouslyAlive = allPlayers.filter((p) => p.hp > 0 && !p.eliminated);
  const completedOrder = state.currentRound.completedPlayerIds;

  const damagedPlayerIds: string[] = [];
  const eliminatedPlayerIds: string[] = [];

  // Apply multiplayer damage mode if there are multiple players
  if (previouslyAlive.length >= 2) {
    if (state.settings.damageMode === 'EVERYONE_EXCEPT_FIRST') {
      const firstPlayerId = completedOrder[0];
      for (const p of previouslyAlive) {
        if (p.playerId !== firstPlayerId) {
          p.hp = Math.max(0, p.hp - 1);
          damagedPlayerIds.push(p.playerId);
          if (p.hp === 0) {
            p.eliminated = true;
            eliminatedPlayerIds.push(p.playerId);
          }
        }
      }
    } else {
      // LAST_PLAYER mode:
      // If someone didn't finish, the unfinished alive player with lowest progress takes damage.
      // Else, the last player in completedOrder takes damage.
      let targetPlayerId: string | null = null;
      const unfinishedAlive = previouslyAlive.filter((p) => !p.completed);

      if (unfinishedAlive.length > 0) {
        // Sort by lowest progress
        unfinishedAlive.sort((a, b) => a.expectedNumber - b.expectedNumber);
        targetPlayerId = unfinishedAlive[0]?.playerId ?? null;
      } else if (completedOrder.length > 0) {
        targetPlayerId = completedOrder[completedOrder.length - 1] ?? null;
      }

      if (targetPlayerId) {
        const target = state.players[targetPlayerId];
        if (target && target.hp > 0) {
          target.hp = Math.max(0, target.hp - 1);
          damagedPlayerIds.push(target.playerId);
          if (target.hp === 0) {
            target.eliminated = true;
            eliminatedPlayerIds.push(target.playerId);
          }
        }
      }
    }
  }

  const finishSummary = completedOrder.map((pid, idx) => ({
    playerId: pid,
    displayName: state.players[pid]?.displayName || 'Player',
    finishOrder: idx + 1,
  }));

  state.roundResults = {
    roundNumber: state.currentRoundNumber,
    finishOrder: finishSummary,
    damagedPlayerIds,
    eliminatedPlayerIds,
  };

  // Check Game Over conditions:
  // 1. Only 1 alive player remaining (if match started with 2+ players)
  // 2. 0 alive players remaining
  // 3. Current round was the last round
  const currentAlive = Object.values(state.players).filter((p) => p.hp > 0 && !p.eliminated);
  const totalRounds = state.totalRounds;
  const isFinalRound = state.currentRoundNumber >= totalRounds;

  if (currentAlive.length <= 1 || isFinalRound) {
    state.phase = 'GAME_OVER';

    if (currentAlive.length === 1 && currentAlive[0]) {
      state.winnerPlayerIds = [currentAlive[0].playerId];
    } else if (currentAlive.length > 1) {
      // Multiple survivors after final round -> sort by highest remaining HP, then lowest wrong clicks
      const sortedSurvivors = [...currentAlive].sort((a, b) => {
        if (b.hp !== a.hp) return b.hp - a.hp;
        return a.wrongClicks - b.wrongClicks;
      });
      const topHp = sortedSurvivors[0]?.hp ?? 0;
      state.winnerPlayerIds = sortedSurvivors
        .filter((s) => s.hp === topHp)
        .map((s) => s.playerId);
    } else {
      // Everyone died -> highest finishOrder or last eliminated
      state.winnerPlayerIds = completedOrder.length > 0 && completedOrder[0] ? [completedOrder[0]] : [];
    }

    ctx.broadcast('game:finished', {
      winners: state.winnerPlayerIds,
      summary: {
        totalRounds: state.currentRoundNumber,
        winners: state.winnerPlayerIds,
        results: state.roundResults,
      },
    });
  } else {
    state.phase = 'ROUND_RESULT';

    ctx.broadcast('number_grid:round_ended', {
      roundNumber: state.currentRoundNumber,
      results: state.roundResults,
    });
  }
}

/**
 * Advances to the next round with a freshly shuffled board and resets active progress.
 */
export function startNextRound(
  state: NumberGridMasterState,
  ctx: GameContext,
): NumberGridMasterState {
  if (state.phase === 'GAME_OVER') return state;

  state.currentRoundNumber += 1;
  const nextGridSize: GridSize =
    state.roundGridSizes[state.currentRoundNumber - 1] || 3;

  const cards = generateBoard(nextGridSize);

  state.currentRound = {
    roundNumber: state.currentRoundNumber,
    gridSize: nextGridSize,
    totalNumbers: nextGridSize * nextGridSize,
    cards,
    completedPlayerIds: [],
    startedAt: Date.now(),
  };

  // Reset player per-round progress while preserving persistent HP and elimination
  for (const player of Object.values(state.players)) {
    player.expectedNumber = 1;
    player.completed = false;
    player.finishOrder = null;
    delete player.lastClickResult;
  }

  state.phase = 'PLAYING';
  delete state.roundResults;

  ctx.broadcast('number_grid:round_started', {
    roundNumber: state.currentRoundNumber,
    gridSize: nextGridSize,
    totalNumbers: state.currentRound.totalNumbers,
  });

  return state;
}
