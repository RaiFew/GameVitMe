import type { GridSize } from '@party/number-grid';

const GRID_SIZES = new Set<number>([2, 3, 4, 5, 6, 7, 8, 9, 10]);
const DIFFICULTY_MODES = new Set(['DEFAULT', 'CUSTOM', 'RANDOM']);
const DAMAGE_MODES = new Set(['LAST_PLAYER', 'EVERYONE_EXCEPT_FIRST']);
/** `provider:id`, the same key the preview endpoint hands the lobby card. */
const TRACK_KEY_RE = /^(deezer|itunes):\d{1,15}$/;

/**
 * Normal-room variants only. Ranked variants are server-chosen, so letting a
 * host write one into room settings would put a ranked mode in reach of the
 * game:start gate that is meant to be the only door.
 */
const ROOM_VARIANTS = new Set(['STANDARD', 'CHAOS']);

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
};

/**
 * The lobby card is not a trust boundary — anything can be posted straight at
 * `room:update_settings`. The engine normalizes a bad grid size with
 * `clampGridSize`, but only after the value has already been stored and
 * broadcast, so an out-of-range size would show in every player's preview and
 * then quietly disagree with the board they get. Reject here instead.
 *
 * Returns the accepted patch, or a message explaining what was rejected.
 */
export function validateNumberGridSettings(
  patch: Record<string, unknown>
): { ok: true; settings: Record<string, unknown> } | { ok: false; error: string } {
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(patch)) {
    const value = patch[key];

    switch (key) {
      case 'variant': {
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string' || !ROOM_VARIANTS.has(value)) {
          return { ok: false, error: 'That variant cannot be set on a normal room.' };
        }
        out.variant = value;
        break;
      }

      case 'difficultyMode': {
        if (typeof value !== 'string' || !DIFFICULTY_MODES.has(value)) {
          return { ok: false, error: 'Difficulty progression must be DEFAULT, CUSTOM or RANDOM.' };
        }
        out.difficultyMode = value;
        break;
      }

      case 'damageMode': {
        if (typeof value !== 'string' || !DAMAGE_MODES.has(value)) {
          return {
            ok: false,
            error: 'Damage mode must be LAST_PLAYER or EVERYONE_EXCEPT_FIRST.',
          };
        }
        out.damageMode = value;
        break;
      }

      case 'totalRounds':
        out.totalRounds = clamp(value, 1, 20, 9);
        break;

      case 'maxGridSize': {
        if (!GRID_SIZES.has(Number(value))) {
          return { ok: false, error: 'Grid size must be between 2x2 and 10x10.' };
        }
        out.maxGridSize = Number(value) as GridSize;
        break;
      }

      case 'maxHp':
        out.maxHp = clamp(value, 1, 10, 3);
        break;

      case 'customGridSizes': {
        if (!Array.isArray(value)) {
          return { ok: false, error: 'Custom round sizes must be a list.' };
        }
        if (value.length < 1 || value.length > 20) {
          return { ok: false, error: 'A run must have between 1 and 20 rounds.' };
        }
        if (value.some((s) => !GRID_SIZES.has(Number(s)))) {
          return { ok: false, error: 'Grid size must be between 2x2 and 10x10.' };
        }
        out.customGridSizes = value.map((s) => Number(s) as GridSize);
        break;
      }

      default:
        // Unknown keys are dropped rather than rejected: `gameSettings` also
        // carries settings for other games once the host changes game type.
        continue;
    }
  }

  // `totalRounds` has to agree with a custom list, or the engine would run past
  // the end of it and start padding with the last size.
  if (Array.isArray(out.customGridSizes)) {
    out.totalRounds = (out.customGridSizes as number[]).length;
  }

  return { ok: true, settings: out };
}
/**
 * Music Quiz. Same trust boundary as the two above: a hostile `query` would be
 * interpolated straight into a provider URL, and an out-of-range `answerSeconds`
 * would sit in the view as a deadline the engine does not honour.
 *
 * `pool` is deliberately absent. It is server-authored at `game:start` from the
 * provider search, and because unknown keys are dropped rather than rejected, a
 * client that posts one simply has it discarded — which is exactly what a client
 * would be trying to do by inventing its own songs.
 */
export function validateMusicQuizSettings(
  patch: Record<string, unknown>
): { ok: true; settings: Record<string, unknown> } | { ok: false; error: string } {
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(patch)) {
    const value = patch[key];

    switch (key) {
      case 'query': {
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string') {
          return { ok: false, error: 'The search must be plain text.' };
        }
        const q = value.trim();
        if (q.length > 80) return { ok: false, error: 'That search is too long.' };
        out.query = q;
        break;
      }

      case 'questionType': {
        if (value !== 'TITLE' && value !== 'ARTIST' && value !== 'BOTH') {
          return { ok: false, error: 'A question must ask for a title, an artist, or both.' };
        }
        out.questionType = value;
        break;
      }

      case 'rounds':
        out.rounds = clamp(value, 1, 50, 10);
        break;

      case 'excludedIds': {
        // Subtractive only. A client can drop tracks the server already fetched
        // but cannot add any, so this can never widen the pool past what the
        // provider search returned. Entries that are not `provider:id` on a known
        // provider are dropped rather than rejected — the same lenient rule the
        // unknown keys above follow.
        if (!Array.isArray(value)) {
          return { ok: false, error: 'The track list cannot be read.' };
        }
        const ids = value
          .filter((v): v is string => typeof v === 'string' && TRACK_KEY_RE.test(v))
          .slice(0, 200);
        out.excludedIds = ids;
        break;
      }

      case 'excerptSeconds':
        out.excerptSeconds = clamp(value, 5, 30, 10);
        break;

      case 'answerSeconds':
        out.answerSeconds = clamp(value, 5, 60, 20);
        break;

      case 'revealSeconds':
        // Accepted and ignored. The reveal is how long the answer stays up and
        // how long the clip plays on through it, so it is a constant of the game
        // rather than a knob — `normalizeSettings` overwrites whatever lands here.
        break;

      case 'maxPoints':
        out.maxPoints = clamp(value, 100, 5000, 1000);
        break;

      default:
        continue;
    }
  }

  return { ok: true, settings: out };
}

/**
 * Codenames turn timers. 0 means the host turned the timer off, which is a real
 * setting rather than a missing one, so the floor is 0 rather than 1 and the
 * clamped result is always a number the engine can divide into milliseconds.
 */
export const clampCodenamesTimer = (value: unknown, max: number): number =>
  clamp(value, 0, max, 0);
