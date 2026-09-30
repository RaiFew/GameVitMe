import type { GameContext } from '@party/game-engine';
import type {
  NumberGridMasterState,
  NumberGridVariant,
  GridSize,
  PlayerProgressState,
  RankedRunResult,
} from '../types/index.js';
import { isRankedVariant, RANKED_TIME_PENALTY_MS, RANKED_TIME_STAGES, rankingDirectionFor } from '../types/index.js';
import { buildBoard, ALL_GRID_SIZES } from '../engine/board-generator.js';

export interface ClickNumberPayload {
  cardId: string;
  number: number;
}

/** Tower Climb and Chaos run until the player dies, not for a fixed round count. */
export const ENDLESS_TOTAL_ROUNDS = 9999;

export function usesChaosNumbers(variant: NumberGridVariant): boolean {
  return variant === 'CHAOS' || variant === 'RANKED_CHAOS';
}

export function isEndless(variant: NumberGridVariant): boolean {
  return variant === 'RANKED_TOWER' || variant === 'RANKED_CHAOS';
}

/** Milliseconds left on the wrong-click lock, from the server's own clock. */
export function lockRemainingMs(player: PlayerProgressState, now: number): number {
  if (!player.lockedUntil) return 0;
  return Math.max(0, player.lockedUntil - now);
}

export function validateNumberGridMove(
  state: NumberGridMasterState,
  playerId: string,
  type: string,
  payload: unknown,
  now: number = Date.now(),
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

    const locked = lockRemainingMs(player, now);
    if (locked > 0) {
      return { valid: false, error: `Locked out for ${Math.ceil(locked / 1000)}s after a wrong click.` };
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

    // The host owns round pacing. Guest rooms have no host, so anyone may advance.
    if (state.hostPlayerId && playerId !== state.hostPlayerId) {
      return { valid: false, error: 'Only the host can start the next round.' };
    }

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
  now: number = Date.now(),
): NumberGridMasterState {
  if (type === 'CLICK_NUMBER') {
    return processClickNumber(state, playerId, payload as ClickNumberPayload, ctx, now);
  }

  if (type === 'START_NEXT_ROUND') {
    return startNextRound(state, ctx, now);
  }

  return state;
}

function processClickNumber(
  state: NumberGridMasterState,
  playerId: string,
  payload: ClickNumberPayload,
  ctx: GameContext,
  now: number,
): NumberGridMasterState {
  const player = state.players[playerId];
  if (!player || player.eliminated || player.completed || state.phase !== 'PLAYING') {
    return state;
  }
  if (lockRemainingMs(player, now) > 0) return state;

  const { cardId, number } = payload;
  const isCorrect = number === player.expectedNumber;

  if (isCorrect) {
    player.lastClickResult = { cardId, number, correct: true, timestamp: now };
    player.expectedIndex += 1;

    const upcoming = state.currentRound.numberSequence[player.expectedIndex];
    if (upcoming === undefined) {
      player.completed = true;
      state.currentRound.completedPlayerIds.push(playerId);
      player.finishOrder = state.currentRound.completedPlayerIds.length;

      ctx.broadcast('number_grid:player_completed', {
        playerId,
        displayName: player.displayName,
        finishOrder: player.finishOrder,
      });
    } else {
      player.expectedNumber = upcoming;
    }
  } else {
    player.wrongClicks += 1;
    player.lastClickResult = { cardId, number, correct: false, timestamp: now };

    // RANKED_TIME has no HP: a wrong click costs 10 locked-out seconds instead,
    // which lands in the final time because the clock never stops.
    if (state.variant === 'RANKED_TIME') {
      player.lockedUntil = now + RANKED_TIME_PENALTY_MS;
      return state;
    }

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

  checkRoundCompletion(state, ctx, now);

  return state;
}

/**
 * Checks whether all active alive players have either finished the board or been eliminated.
 */
export function checkRoundCompletion(
  state: NumberGridMasterState,
  ctx: GameContext,
  now: number = Date.now(),
): boolean {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter((p) => !p.eliminated && p.hp > 0);

  const allAliveCompleted =
    alivePlayers.length > 0 && alivePlayers.every((p) => p.completed);

  const startedWithMultiple = allPlayers.length >= 2;
  const onlyOneSurvivorLeft = startedWithMultiple && alivePlayers.length <= 1;

  if (allAliveCompleted || onlyOneSurvivorLeft || alivePlayers.length === 0) {
    executeRoundResolution(state, ctx, now);
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
  now: number = Date.now(),
): void {
  state.currentRound.endedAt = now;

  // Only cleared floors count toward the time. A floor the player died on is
  // excluded, otherwise dying would improve a time-based tie-break.
  if (state.currentRound.completedPlayerIds.length > 0) {
    state.roundTimesMs.push(Math.max(0, now - state.currentRound.startedAt));
  }

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
  // "Last player standing" only decides the match if someone was actually
  // knocked out. In a solo game the single survivor is not a win after round 1.
  const decidedByElimination = allPlayers.length >= 2 && currentAlive.length <= 1;
  const everyoneDead = currentAlive.length === 0;

  if (decidedByElimination || everyoneDead || isFinalRound) {
    state.phase = 'GAME_OVER';

    if (isRankedVariant(state.variant)) {
      // The ranked result is built here, from state the server owns. Nothing in
      // it came from a client message, so it can be written to the leaderboard
      // without re-validating anything.
      state.rankedResult = buildRankedResult(state, currentAlive.length > 0);
    }

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

    // No 'game:finished' broadcast here: the socket handler emits it from
    // checkGameEnd() after broadcasting player views, so emitting it here too
    // delivered the same event to clients twice.
  } else {
    state.phase = 'ROUND_RESULT';

    ctx.broadcast('number_grid:round_ended', {
      roundNumber: state.currentRoundNumber,
      results: state.roundResults,
    });
  }
}

/**
 * Assembles the ranked result for a finished run. Pure function of server state.
 */
export function buildRankedResult(state: NumberGridMasterState, survived: boolean): RankedRunResult {
  const variant = state.variant;
  const player = Object.values(state.players)[0];
  const totalTimeMs = state.roundTimesMs.reduce((a, b) => a + b, 0);
  const mistakes = player?.wrongClicks ?? 0;
  const hpRemaining = player?.hp ?? 0;
  const direction = rankingDirectionFor(variant)!;

  if (variant === 'RANKED_TIME') {
    // No HP loss is possible in this mode, so a finished run always completed.
    const completed = survived && state.currentRoundNumber >= RANKED_TIME_STAGES;
    return {
      mode: 'TIME',
      stages: RANKED_TIME_STAGES,
      completedStages: state.roundTimesMs.length,
      totalTimeMs,
      mistakes,
      // Not a scoring metric for Time; the floor count is exposed for the UI only.
      highestFloor: state.roundTimesMs.length,
      hpRemaining,
      completed,
      status: completed ? 'COMPLETED' : 'ABANDONED',
      rankingValue: totalTimeMs,
      rankingDirection: direction,
    };
  }

  const mode = variant === 'RANKED_CHAOS' ? 'CHAOS' : 'TOWER';
  // "Highest floor" is the count of cleared floors. The floor a player died on
  // was reached but not completed, so it does not score.
  const highestFloor = state.roundTimesMs.length;
  return {
    mode,
    stages: 0,
    completedStages: highestFloor,
    totalTimeMs,
    mistakes,
    highestFloor,
    hpRemaining,
    completed: false,
    status: survived ? 'COMPLETED' : 'DIED',
    rankingValue: highestFloor,
    rankingDirection: direction,
  };
}

/** Picks the grid size for a round, honoring Chaos randomization. */
function gridSizeForRound(state: NumberGridMasterState, random: () => number): GridSize {
  if (usesChaosNumbers(state.variant)) {
    return ALL_GRID_SIZES[Math.floor(random() * ALL_GRID_SIZES.length)] ?? 3;
  }
  return state.roundGridSizes[state.currentRoundNumber - 1] ?? 3;
}

/**
 * Advances to the next round with a freshly shuffled board and resets active progress.
 */
export function startNextRound(
  state: NumberGridMasterState,
  ctx: GameContext,
  now: number = Date.now(),
): NumberGridMasterState {
  if (state.phase === 'GAME_OVER') return state;

  state.currentRoundNumber += 1;
  const nextGridSize = gridSizeForRound(state, ctx.random);
  const { cards, sequence } = buildBoard(nextGridSize, {
    numberRange: usesChaosNumbers(state.variant) ? 'CHAOS' : 'SEQUENTIAL',
    random: ctx.random,
  });

  state.currentRound = {
    roundNumber: state.currentRoundNumber,
    gridSize: nextGridSize,
    totalNumbers: nextGridSize * nextGridSize,
    cards,
    numberSequence: sequence,
    completedPlayerIds: [],
    startedAt: now,
  };

  // Reset player per-round progress while preserving persistent HP and elimination
  for (const player of Object.values(state.players)) {
    player.expectedIndex = 0;
    player.expectedNumber = sequence[0] ?? 1;
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
