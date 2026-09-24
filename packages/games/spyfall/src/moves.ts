import type { GameMove, MoveResult, GameContext } from '@party/game-engine';
import type { SpyfallMasterState } from './state.js';
import { SpyfallPhase, SpyfallMoveType } from './state.js';

/**
 * Validate and process Spyfall game moves.
 */

// ─── Validation ────────────────────────────────────────────────

export function validateSpyfallMove(
  state: SpyfallMasterState,
  move: GameMove,
  _ctx: GameContext,
): { valid: boolean; reason?: string } {
  switch (move.type) {
    case SpyfallMoveType.READY_TO_PLAY:
      return { valid: true };
    case SpyfallMoveType.ASK_QUESTION:
      return validateAskQuestion(state, move);
    case SpyfallMoveType.ANSWER_DONE:
      return validateAnswerDone(state, move);
    case SpyfallMoveType.ACCUSE:
      return validateAccuse(state, move);
    case SpyfallMoveType.VOTE:
      return validateVote(state, move);
    case SpyfallMoveType.SPY_REVEAL:
      return validateSpyReveal(state, move);
    case SpyfallMoveType.SPY_GUESS_LOCATION:
      return validateSpyGuessLocation(state, move);
    case SpyfallMoveType.HOST_END_GAME:
      return validateHostEndGame(state, move);
    default:
      return { valid: false, reason: `Unknown move type: ${move.type}` };
  }
}

function validateAskQuestion(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (state.phase !== SpyfallPhase.QUESTIONING) {
    return { valid: false, reason: 'Not in questioning phase' };
  }
  if (state.hostMode && move.playerId === state.hostPlayerId) {
    return { valid: false, reason: 'Host cannot participate as a questioner' };
  }
  if (move.playerId !== state.currentQuestionerId) {
    return { valid: false, reason: 'Not your turn to ask' };
  }
  const payload = move.payload as { targetPlayerId: string };
  if (!payload?.targetPlayerId) {
    return { valid: false, reason: 'Must specify target player' };
  }
  if (payload.targetPlayerId === move.playerId) {
    return { valid: false, reason: 'Cannot ask yourself' };
  }
  if (state.previousQuestionerId && payload.targetPlayerId === state.previousQuestionerId) {
    return { valid: false, reason: 'Cannot ask the person who just asked you' };
  }
  if (!state.playerOrder.includes(payload.targetPlayerId)) {
    return { valid: false, reason: 'Target player not in game' };
  }
  return { valid: true };
}

function validateAnswerDone(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (state.phase !== SpyfallPhase.QUESTIONING) {
    return { valid: false, reason: 'Not in questioning phase' };
  }
  if (move.playerId !== state.currentAnswererId) {
    return { valid: false, reason: 'Not your turn to answer' };
  }
  return { valid: true };
}

function validateAccuse(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (state.phase !== SpyfallPhase.QUESTIONING) {
    return { valid: false, reason: 'Not in questioning phase' };
  }
  if (state.hostMode && move.playerId === state.hostPlayerId) {
    return { valid: false, reason: 'Host cannot accuse players' };
  }
  if (state.indictmentUsed[move.playerId]) {
    return { valid: false, reason: 'You have already used your one indictment attempt this round' };
  }
  const payload = move.payload as { targetPlayerId: string };
  if (!payload?.targetPlayerId) {
    return { valid: false, reason: 'Must specify who to accuse' };
  }
  if (payload.targetPlayerId === move.playerId) {
    return { valid: false, reason: 'Cannot accuse yourself' };
  }
  if (!state.playerOrder.includes(payload.targetPlayerId)) {
    return { valid: false, reason: 'Target player not in game' };
  }
  return { valid: true };
}

function validateVote(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (state.phase !== SpyfallPhase.ACCUSATION_VOTE || !state.voting) {
    return { valid: false, reason: 'Not in voting phase' };
  }
  if (state.hostMode && move.playerId === state.hostPlayerId) {
    return { valid: false, reason: 'Host cannot participate in voting' };
  }
  if (move.playerId === state.voting.accusedPlayerId) {
    return { valid: false, reason: 'Accused player cannot vote' };
  }
  const currentEligibleVoter = state.voting.order[state.voting.currentVoterIndex];
  if (move.playerId !== currentEligibleVoter) {
    return { valid: false, reason: 'It is not your turn to vote' };
  }
  if (state.voting.votes[move.playerId] !== undefined) {
    return { valid: false, reason: 'Already voted' };
  }
  const payload = move.payload as { vote?: 'YES' | 'NO'; guilty?: boolean };
  const hasVote = payload?.vote === 'YES' || payload?.vote === 'NO' || typeof payload?.guilty === 'boolean';
  if (!hasVote) {
    return { valid: false, reason: 'Must specify YES or NO vote' };
  }
  return { valid: true };
}

function validateSpyReveal(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (state.phase !== SpyfallPhase.QUESTIONING) {
    return { valid: false, reason: 'Can only reveal during questioning phase' };
  }
  if (move.playerId !== state.spyPlayerId) {
    return { valid: false, reason: 'Only the spy can reveal' };
  }
  return { valid: true };
}

function validateSpyGuessLocation(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (state.phase !== SpyfallPhase.SPY_GUESS) {
    return { valid: false, reason: 'Not in spy guess phase' };
  }
  if (move.playerId !== state.spyPlayerId) {
    return { valid: false, reason: 'Only the spy can guess' };
  }
  const payload = move.payload as { locationName?: string; location?: string };
  if (!payload?.locationName && !payload?.location) {
    return { valid: false, reason: 'Must specify a location' };
  }
  return { valid: true };
}

function validateHostEndGame(
  state: SpyfallMasterState,
  move: GameMove,
): { valid: boolean; reason?: string } {
  if (!state.hostMode) {
    return { valid: false, reason: 'Host end game is only available in Host Mode' };
  }
  if (move.playerId !== state.hostPlayerId) {
    return { valid: false, reason: 'Only the Host can manually end the game' };
  }
  if (state.phase === SpyfallPhase.GAME_OVER) {
    return { valid: false, reason: 'Game is already over' };
  }
  return { valid: true };
}

// ─── Move Processing ──────────────────────────────────────────

export function processSpyfallMove(
  state: SpyfallMasterState,
  move: GameMove,
  ctx: GameContext,
): MoveResult<SpyfallMasterState> {
  switch (move.type) {
    case SpyfallMoveType.READY_TO_PLAY:
      return processReadyToPlay(state);
    case SpyfallMoveType.ASK_QUESTION:
      return processAskQuestion(state, move);
    case SpyfallMoveType.ANSWER_DONE:
      return processAnswerDone(state, move);
    case SpyfallMoveType.ACCUSE:
      return processAccuse(state, move, ctx);
    case SpyfallMoveType.VOTE:
      return processVote(state, move, ctx);
    case SpyfallMoveType.SPY_REVEAL:
      return processSpyReveal(state);
    case SpyfallMoveType.SPY_GUESS_LOCATION:
      return processSpyGuessLocation(state, move);
    case SpyfallMoveType.HOST_END_GAME:
      return processHostEndGame(state);
    default:
      return { success: false, error: `Unknown move: ${move.type}` };
  }
}

function processReadyToPlay(
  state: SpyfallMasterState,
): MoveResult<SpyfallMasterState> {
  if (state.phase === SpyfallPhase.ROLE_REVEAL) {
    return {
      success: true,
      newState: {
        ...state,
        phase: SpyfallPhase.QUESTIONING,
      },
    };
  }
  return { success: true, newState: state };
}

function processAskQuestion(
  state: SpyfallMasterState,
  move: GameMove,
): MoveResult<SpyfallMasterState> {
  const payload = move.payload as { targetPlayerId: string };
  return {
    success: true,
    newState: {
      ...state,
      currentAnswererId: payload.targetPlayerId,
      previousQuestionerId: move.playerId,
    },
  };
}

function processAnswerDone(
  state: SpyfallMasterState,
  move: GameMove,
): MoveResult<SpyfallMasterState> {
  return {
    success: true,
    newState: {
      ...state,
      currentQuestionerId: move.playerId,
      currentAnswererId: null,
    },
  };
}

function processAccuse(
  state: SpyfallMasterState,
  move: GameMove,
  _ctx: GameContext,
): MoveResult<SpyfallMasterState> {
  const payload = move.payload as { targetPlayerId: string };
  const accusedPlayerId = payload.targetPlayerId;

  // Build sequential voter order clockwise around the table starting from accuser, excluding accused
  const accuserIndex = state.playerOrder.indexOf(move.playerId);
  const n = state.playerOrder.length;
  const voterOrder: string[] = [];

  for (let i = 0; i < n; i++) {
    const pid = state.playerOrder[(accuserIndex + i) % n]!;
    if (pid !== accusedPlayerId) {
      voterOrder.push(pid);
    }
  }

  return {
    success: true,
    newState: {
      ...state,
      phase: SpyfallPhase.ACCUSATION_VOTE,
      accuserId: move.playerId,
      accusedPlayerId,
      indictmentUsed: {
        ...state.indictmentUsed,
        [move.playerId]: true,
      },
      voting: {
        accusedPlayerId,
        order: voterOrder,
        currentVoterIndex: 0,
        votes: {},
      },
    },
  };
}

function processVote(
  state: SpyfallMasterState,
  move: GameMove,
  _ctx: GameContext,
): MoveResult<SpyfallMasterState> {
  if (!state.voting) {
    return { success: false, error: 'No active voting' };
  }

  const payload = move.payload as { vote?: 'YES' | 'NO'; guilty?: boolean };
  const vote: 'YES' | 'NO' = payload.vote ?? (payload.guilty ? 'YES' : 'NO');
  const newVotes = { ...state.voting.votes, [move.playerId]: vote };

  // Rule: Indictment requires UNANIMOUS YES.
  // If ANY player votes NO, the indictment fails immediately!
  if (vote === 'NO') {
    return {
      success: true,
      newState: {
        ...state,
        phase: SpyfallPhase.QUESTIONING,
        accuserId: null,
        accusedPlayerId: null,
        voting: null,
      },
    };
  }

  // Current vote was YES. Advance to next voter.
  const nextVoterIndex = state.voting.currentVoterIndex + 1;

  if (nextVoterIndex < state.voting.order.length) {
    // Waiting for next player in sequence
    return {
      success: true,
      newState: {
        ...state,
        voting: {
          ...state.voting,
          currentVoterIndex: nextVoterIndex,
          votes: newVotes,
        },
      },
    };
  }

  // ALL eligible voters have voted YES! Unanimous conviction!
  const accusedIsSpy = state.voting.accusedPlayerId === state.spyPlayerId;

  if (accusedIsSpy) {
    // The spy was caught! Normal players win!
    return {
      success: true,
      newState: {
        ...state,
        phase: SpyfallPhase.GAME_OVER,
        voting: {
          ...state.voting,
          currentVoterIndex: nextVoterIndex,
          votes: newVotes,
        },
        gameOverData: {
          spyPlayerId: state.spyPlayerId,
          location: state.selectedLocation,
          winner: 'NON_SPIES',
          reason: 'The Spy was caught! Normal players win.',
          roles: state.playerRoles,
        },
      },
    };
  }

  // Accused was innocent! Spy escaped and wins!
  return {
    success: true,
    newState: {
      ...state,
      phase: SpyfallPhase.GAME_OVER,
      voting: {
        ...state.voting,
        currentVoterIndex: nextVoterIndex,
        votes: newVotes,
      },
      gameOverData: {
        spyPlayerId: state.spyPlayerId,
        location: state.selectedLocation,
        winner: 'SPY',
        reason: 'An innocent player was indicted! The Spy escaped and won.',
        roles: state.playerRoles,
      },
    },
  };
}

function processSpyReveal(
  state: SpyfallMasterState,
): MoveResult<SpyfallMasterState> {
  return {
    success: true,
    newState: {
      ...state,
      phase: SpyfallPhase.SPY_GUESS,
    },
  };
}

function processSpyGuessLocation(
  state: SpyfallMasterState,
  move: GameMove,
): MoveResult<SpyfallMasterState> {
  const payload = move.payload as { locationName?: string; location?: string };
  const locationGuess = (payload?.locationName || payload?.location || '').trim();
  const correctGuess =
    locationGuess.toLowerCase() === state.selectedLocation.trim().toLowerCase();

  return {
    success: true,
    newState: {
      ...state,
      phase: SpyfallPhase.GAME_OVER,
      gameOverData: {
        spyPlayerId: state.spyPlayerId,
        location: state.selectedLocation,
        winner: correctGuess ? 'SPY' : 'NON_SPIES',
        reason: correctGuess
          ? `The Spy correctly guessed: ${state.selectedLocation}!`
          : `The Spy guessed incorrectly (${locationGuess}). The location was: ${state.selectedLocation}.`,
        spyGuess: locationGuess,
        roles: state.playerRoles,
      },
    },
  };
}

function processHostEndGame(
  state: SpyfallMasterState,
): MoveResult<SpyfallMasterState> {
  return {
    success: true,
    newState: {
      ...state,
      phase: SpyfallPhase.GAME_OVER,
      gameOverData: {
        spyPlayerId: state.spyPlayerId,
        location: state.selectedLocation,
        winner: 'NON_SPIES',
        reason: 'The round was ended manually by the Host.',
        roles: state.playerRoles,
      },
    },
  };
}
