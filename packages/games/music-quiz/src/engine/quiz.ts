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
 * Builds one round: a track plus three distractors drawn from the same pool, so
 * the wrong answers are plausible rather than obviously wrong.
 *
 * `usedKeys` are the tracks already played — a quiz that repeats a song reads as
 * a bug to the players even when the repetition is legitimate.
 *
 * Returns null when the pool cannot supply four distinct labels. Four is not
 * negotiable: a shorter list is trivially guessable and a longer one is not the
 * game the brief asked for, so the caller degrades the question type instead.
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

  const fresh = pool.filter((t) => !usedKeys.has(`${t.provider}:${t.providerId}`));
  const candidates = fresh.length >= 4 ? fresh : pool;
  if (candidates.length < 4) return null;

  const shuffled = shuffle(candidates, random);
  const correct = shuffled[0]!;

  // Labels, not tracks, are what collide: two different songs by one artist are
  // two good TITLE distractors but the same string, which would show a duplicate
  // button. Walk the shuffled list until four distinct labels are found.
  const seen = new Set<string>([norm(labelFor(correct, questionType))]);
  const labels = [labelFor(correct, questionType)];
  for (const t of shuffled.slice(1)) {
    const label = labelFor(t, questionType);
    const key = norm(label);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length === 4) break;
  }
  if (labels.length < 4) return null;

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