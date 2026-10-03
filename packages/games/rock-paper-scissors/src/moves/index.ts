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
import {
  advanceBracket,
  applyLegOutcome,
  buildFirstRound,
  currentMatchPlayers,
  findMatch,
  recordLeg,
  resolveByes,
  startNextMatch,
} from '../engine/tournament.js';
import type { RPSMatch } from '../types/index.js';

/** The players allowed to act this round: the whole lobby, or one match's two. */
function activePlayerIds(state: RPSMasterState): string[] {
  if (state.gameMode === 'TOURNAMENT') return currentMatchPlayers(state);
  return state.playerOrder.filter((id) => {
    const p = state.players[id];
    return p ? (state.gameMode === 'BATTLE_ROYALE' ? p.isAlive : true) : false;
  });
}

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
      // In the bracket only the two fighters in the live match may throw; anyone
      // else picking would be choosing for a match they are not in.
      if (state.gameMode === 'TOURNAMENT' && !activePlayerIds(state).includes(move.playerId)) {
        return { valid: false, reason: 'You are not in the current match' };
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
  const activeIds = activePlayerIds(state);

  const outcome = resolveRound(
    state.roundNumber,
    state.gameMode,
    state.players,
    activeIds,
  );

  let newPlayers: Record<string, RPSPlayerState> = { ...state.players };

  for (const id of state.playerOrder) {
    const existing = newPlayers[id];
    if (!existing) continue;

    const p: RPSPlayerState = {
      ...existing,
      choiceHistory: existing.currentChoice
        ? [...existing.choiceHistory, existing.currentChoice]
        : [...existing.choiceHistory],
    };

    if (activeIds.includes(id)) {
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
      // A tournament seat not in the live match is out of the tournament, not
      // out of the game -- the host still has to keep throwing to be seen.
      p.roundStatus = state.gameMode === 'TOURNAMENT' ? 'PENDING' : 'ELIMINATED';
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
        winnerIds = outcome.winnerIds.length > 0 ? outcome.winnerIds : activeIds;
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
  } else if (state.gameMode === 'TOURNAMENT') {
    // Book the leg onto the live match, charge the loser a life, and close the
    // match out if that emptied them. The bracket itself only rolls forward once
    // the whole round is done, so `startNextRound` picks up from here.
    const match = findMatch(state);
    if (!match) {
      isGameOver = true;
      winReason = 'No match in progress';
    } else {
      const leg = recordLeg(
        match,
        { ...outcome.choices } as Record<string, RPSChoice>,
        outcome.isTie ? null : outcome.winnerIds[0] ?? null
      );
      const withLeg: RPSMatch = { ...match, legs: [...match.legs, leg] };
      const applied = applyLegOutcome(state, withLeg, leg);
      newPlayers = applied.state.players;

      let nextBracket = { ...state.bracket!, rounds: state.bracket!.rounds.map((r) =>
        r.map((m) => (m.id === match.id ? withLeg : m))
      ) };

      if (applied.matchOver) {
        const survivor = [match.playerAId, match.playerBId].find(
          (id) => !!id && newPlayers[id]!.lives > 0
        ) ?? null;
        nextBracket = {
          ...nextBracket,
          rounds: nextBracket.rounds.map((r) =>
            r.map((m) =>
              m.id === match.id ? { ...m, status: 'DONE' as const, winnerId: survivor } : m
            )
          ),
        };
        nextBracket = advanceBracket({ ...state, bracket: nextBracket });
      }

      state = { ...state, bracket: nextBracket };
      // A finished match is not a finished tournament; `startNextRound` decides.
      isGameOver = false;
      winReason = undefined;
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
  if (state.gameMode === 'TOURNAMENT') {
    return startNextTournamentMatch(state, ctx);
  }

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

/**
 * Ends a leg and moves on. Either the same match throws again (both fighters
 * still have lives), the bracket hands over to the next match, or one entrant is
 * left and the tournament is over.
 */
function startNextTournamentMatch(state: RPSMasterState, ctx: GameContext): RPSMasterState {
  let next: RPSMasterState = {
    ...state,
    players: Object.fromEntries(
      Object.entries(state.players).map(([id, p]) => [
        id,
        { ...p, currentChoice: null, roundStatus: 'PENDING' as const },
      ])
    ),
    roundNumber: state.roundNumber + 1,
    // Back to throwing either way: the match continues or hands over below. Only
    // a crowned champion leaves this in GAME_OVER.
    phase: 'CHOOSING',
  };

  const live = findMatch(next);
  const matchIsOver = !live || live.status !== 'LIVE';
  if (matchIsOver) {
    // The finished match is DONE; hand the room to whatever plays next, or
    // crown the champion when the bracket has nobody left to feed a match.
    const championId = next.bracket?.championId ?? null;
    next = {
      ...startNextMatch(next),
      players: next.players,
      winnerIds: championId ? [championId] : [],
      winReason: championId
        ? `${next.players[championId]?.displayName ?? 'Player'} wins the tournament! 🏆`
        : undefined,
    };
  }

  // Top lives back up only when the bracket moves to a *different* match -- the
  // legs inside one match have to accumulate, or lives never run out. A player on
  // zero is out of the tournament and stays on zero.
  if (matchIsOver && next.currentMatchId !== state.currentMatchId) {
    next = {
      ...next,
      players: Object.fromEntries(
        Object.entries(next.players).map(([id, p]) => [
          id,
          { ...p, lives: p.lives > 0 ? state.livesPerMatch : 0 },
        ])
      ),
    };
  }

  const durationMs = state.roundDurationSeconds > 0 ? state.roundDurationSeconds * 1000 : 0;
  const roundExpiresAt = next.phase === 'CHOOSING' && durationMs > 0 ? Date.now() + durationMs : null;

  ctx.clearTimer();
  if (roundExpiresAt) ctx.scheduleTimer(durationMs, 'CHOOSING_TIMEOUT');

  return { ...next, roundExpiresAt };
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

      // Both fighters must be locked in before the leg can resolve, which is
      // what keeps a choice from being revealed to the opponent.
      const activeIds = activePlayerIds(intermediateState);
      const allChosen =
        activeIds.length > 0 && activeIds.every((id) => updatedPlayers[id]?.currentChoice != null);

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
