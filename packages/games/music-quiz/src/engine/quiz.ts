import { shuffle } from '@party/game-engine';
import type { QuestionType, QuizRound, QuizTrack } from '../types/index.js';

/** Enough lead for every client to buffer the clip before it is meant to start. */
export const PLAYBACK_LEAD_MS = 1500;

export function labelFor(track: QuizTrack, questionType: QuestionType): string {
  if (questionType === 'ARTIST') return track.artist;
  if (questionType === 'BOTH') return `${track.title} — ${track.artist}`;
  return track.title;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-–—_'".,()!]+/g, '');

/**
 * Builds one round: the answer plus up to three distractors drawn from the same
 * pool, so the wrong answers are plausible rather than obviously wrong.
 *
 * `usedKeys` are the tracks already played. The *answer* is always an unplayed
 * one, so a pool of three yields exactly three rounds; only a distractor may
 * repeat, which is far less noticeable than the same song being asked twice.
 *
 * Returns null when the pool cannot supply two distinct labels — one choice is
 * not a question. Four is a ceiling, not a requirement: a narrow pool asks what
 * it can rather than refusing to start.
 */
export function buildRound(opts: {
  pool: readonly QuizTrack[];
  usedKeys: ReadonlySet<string>;
  questionType: QuestionType;
  random: () => number;
  roundNumber: number;
  nowMs: number;
  answerSeconds: number;
}): QuizRound | null {
  const { pool, usedKeys, questionType, random, roundNumber, nowMs, answerSeconds } = opts;

  const wanted = Math.min(4, pool.length);
  if (wanted < 2) return null;

  const fresh = pool.filter((t) => !usedKeys.has(`${t.provider}:${t.providerId}`));
  if (!fresh.length) return null;

  const correct = shuffle(fresh, random)[0]!;

  // Labels, not tracks, are what collide: two different songs by one artist are
  // two good TITLE distractors but the same string, which would show a duplicate
  // button. Draw distractors from the whole pool, since a repeat there is
  // harmless next to repeating the answer.
  const seen = new Set<string>([norm(labelFor(correct, questionType))]);
  const labels = [labelFor(correct, questionType)];
  for (const t of shuffle(pool, random)) {
    const label = labelFor(t, questionType);
    const key = norm(label);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length === wanted) break;
  }
  if (labels.length < 2) return null;

  const choices = shuffle(labels, random);
  return {
    roundNumber,
    track: correct,
    choices,
    correctIndex: choices.indexOf(labelFor(correct, questionType)),
    playbackStartAtMs: nowMs + PLAYBACK_LEAD_MS,
    questionStartedAtMs: nowMs,
    questionDeadlineMs: nowMs + answerSeconds * 1000,
    revealEndsAtMs: null,
    answers: {},
    fastestPlayerId: null,
  };
}