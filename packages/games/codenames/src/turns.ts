import type { GameContext } from '@party/game-engine';
import type {
  CodenamesMasterState,
  CodenamesTurnLog,
  CodenamesPhase,
} from './types/index.js';

export type CodenamesTimerKind = 'CLUE' | 'GUESSING';

/**
 * Arm the timer for a phase and return the fields the caller folds into the new
 * state. A duration of 0 means the host turned the timer off, which is distinct
 * from a timer that has run out — the view renders "no deadline" for the former.
 */
export function armTimer(
  state: CodenamesMasterState,
  ctx: GameContext,
  kind: CodenamesTimerKind
): Pick<CodenamesMasterState, 'turnExpiresAt' | 'timerKind'> {
  const seconds = kind === 'CLUE' ? state.clueTimeSeconds : state.guessTimeSeconds;
  if (!seconds || seconds <= 0) {
    ctx.clearTimer();
    return { turnExpiresAt: null, timerKind: null };
  }

  ctx.clearTimer();
  // Named explicitly, not derived from `kind`: `onTimerExpired` matches on these
  // strings, and `${kind.toLowerCase()}_timer` yields "guessing_timer" while the
  // handler looks for "guess_timer".
  ctx.scheduleTimer(seconds * 1000, kind === 'CLUE' ? 'clue_timer' : 'guess_timer');
  return { turnExpiresAt: Date.now() + seconds * 1000, timerKind: kind };
}

/**
 * Fold the turn in progress into `history` and clear the per-turn scratch state.
 * The caller keeps advancing `turnNumber`; the log is stamped with the turn it
 * actually recorded so the two can't drift.
 */
export function closeTurn(
  state: CodenamesMasterState,
  endedReason: CodenamesTurnLog['endedReason']
): Pick<CodenamesMasterState, 'history' | 'currentGuesses' | 'currentClue'> {
  const log: CodenamesTurnLog = {
    turnNumber: state.turnNumber,
    team: state.currentTeam,
    clue: state.currentClue,
    guesses: state.currentGuesses,
    endedReason,
  };

  return {
    history: [...state.history, log],
    currentGuesses: [],
    currentClue: null,
  };
}

/** A phase that the run is now waiting on rather than acting in. */
export function isTurnBoundary(phase: CodenamesPhase): boolean {
  return phase === 'CLUE' || phase === 'GAME_OVER';
}
