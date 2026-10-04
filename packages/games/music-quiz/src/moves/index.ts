import type { GameContext, GameMove } from '@party/game-engine';
import type { MusicQuizMasterState, MusicQuizSettings } from '../types/index.js';

export interface MoveValidation {
  valid: boolean;
  error?: string;
}

/** How long the answer stays up, and how long the clip plays on into it. */
export const REVEAL_SECONDS = 5;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeSettings(raw: Partial<MusicQuizSettings>): MusicQuizSettings {
  return {
    rounds: clampInt(raw.rounds, 1, 50, 10),
    excerptSeconds: clampInt(raw.excerptSeconds, 5, 30, 10),
    answerSeconds: clampInt(raw.answerSeconds, 5, 60, 20),
    // Not read from the room: the reveal is the answer screen and the clip plays
    // on through it, so its length is the game's, not the host's.
    revealSeconds: REVEAL_SECONDS,
    maxPoints: clampInt(raw.maxPoints, 100, 5000, 1000),
    questionType: raw.questionType === 'ARTIST' || raw.questionType === 'BOTH' ? raw.questionType : 'TITLE',
    query: typeof raw.query === 'string' ? raw.query.slice(0, 80) : '',
    pool: Array.isArray(raw.pool) ? raw.pool : undefined,
  };
}

/**
 * Points decay linearly to zero at the deadline, so being fast is worth real
 * points and being last is worth none. Both ends of the subtraction come from
 * the server: `move.timestamp` is stamped on arrival and the deadline was stamped
 * when the round opened, so a client clock cannot buy itself a faster answer.
 */
export function scoreAnswer(
  correct: boolean,
  elapsedMs: number,
  maxPoints: number,
  answerWindowMs: number
): number {
  if (!correct || answerWindowMs <= 0) return 0;
  // Clamped at both ends rather than trusted: a negative elapsed time would
  // otherwise scale the score above `maxPoints`, and one past the deadline would
  // scale it below zero.
  const elapsed = Math.min(answerWindowMs, Math.max(0, elapsedMs));
  return Math.max(0, Math.round(maxPoints * (1 - elapsed / answerWindowMs)));
}

/**
 * Everyone still connected has to answer for a round to end early. A player who
 * walked away would otherwise hold the whole quiz open until the deadline.
 */
function connectedIds(state: MusicQuizMasterState, ctx: GameContext): string[] {
  return ctx.players.filter((p) => p.isConnected !== false).map((p) => p.id);
}

export function validateMusicQuizMove(
  state: MusicQuizMasterState,
  move: GameMove,
  ctx: GameContext,
  nowMs: number
): MoveValidation {
  if (state.phase === 'GAME_OVER') return { valid: false, error: 'The game is already over.' };

  if (move.type === 'ANSWER') {
    if (state.phase !== 'ANSWERING') {
      return { valid: false, error: 'That round is not accepting answers.' };
    }
    if (!state.players[move.playerId]) {
      return { valid: false, error: 'You are not in this quiz.' };
    }
    if (state.round.answers[move.playerId]) {
      // One answer per round. Without this a reconnect mid-round would let the
      // same player answer twice and take the faster of the two scores.
      return { valid: false, error: 'You have already answered this round.' };
    }
    const index = Number((move.payload as { index?: unknown } | undefined)?.index);
    if (!Number.isInteger(index) || index < 0 || index >= state.round.choices.length) {
      return { valid: false, error: 'Pick one of the four answers.' };
    }
    // Defence in depth: the timer is the normal end of a round, but a move that
    // arrives after the deadline is refused even if the timer has not fired yet.
    if (nowMs > state.round.questionDeadlineMs) {
      return { valid: false, error: 'Time is up for that round.' };
    }
    return { valid: true };
  }

  if (move.type === 'ADVANCE') {
    if (state.phase !== 'ANSWERING') {
      return { valid: false, error: 'Nothing to advance.' };
    }
    // Anyone may trigger it, but only once the round is actually decided, so it
    // is idempotent and cannot skip ahead of an unanswered question.
    const live = connectedIds(state, ctx);
    const everyoneAnswered = live.length > 0 && live.every((id) => state.round.answers[id]);
    if (!everyoneAnswered && nowMs <= state.round.questionDeadlineMs) {
      return { valid: false, error: 'Wait for the round to finish.' };
    }
    return { valid: true };
  }

  return { valid: false, error: `Unknown action: ${move.type}` };
}