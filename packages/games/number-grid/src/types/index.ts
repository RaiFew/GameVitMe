export type GridSize = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type DifficultyMode = 'DEFAULT' | 'CUSTOM' | 'RANDOM';

export type DamageMode = 'LAST_PLAYER' | 'EVERYONE_EXCEPT_FIRST';

export type GamePhase =
  | 'LOBBY'
  | 'ROUND_STARTING'
  | 'PLAYING'
  | 'ROUND_RESULT'
  | 'GAME_OVER';

/**
 * STANDARD  Normal room, sequential 1..N numbers, existing progression.
 * CHAOS     Normal room, random size 2x2-10x10 per round, unique numbers drawn
 *           from 1-1000. Playable by guests, awards no ranking points.
 * RANKED_*  Solo runs. Same mechanic as above but scored and leaderboarded.
 */
export type NumberGridVariant =
  | 'STANDARD'
  | 'CHAOS'
  | 'RANKED_TIME'
  | 'RANKED_TOWER'
  | 'RANKED_CHAOS';

export const RANKED_VARIANTS: NumberGridVariant[] = [
  'RANKED_TIME',
  'RANKED_TOWER',
  'RANKED_CHAOS',
];

export function isRankedVariant(variant?: string): boolean {
  return RANKED_VARIANTS.includes(variant as NumberGridVariant);
}

/** Higher rank value wins. Only ranked variants have one. */
export function rankingDirectionFor(variant?: string): 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | null {
  if (variant === 'RANKED_TIME') return 'LOWER_IS_BETTER';
  if (variant === 'RANKED_TOWER' || variant === 'RANKED_CHAOS') return 'HIGHER_IS_BETTER';
  return null;
}

/** The leaderboard a variant writes to, or null when it is not ranked. */
export function leaderboardKeyFor(variant?: string): string | null {
  switch (variant) {
    case 'RANKED_TIME':
      return 'number-rush.time';
    case 'RANKED_TOWER':
      return 'number-rush.tower-climb';
    case 'RANKED_CHAOS':
      return 'number-rush.chaos';
    default:
      return null;
  }
}

/** RANKED_TIME is a fixed 10-stage run. */
export const RANKED_TIME_STAGES = 10;

/** Wrong-click lock applied by the server, in ms. */
export const RANKED_TIME_PENALTY_MS = 10_000;

export interface NumberCircleCard {
  id: string;
  number: number;
  index: number;
}

export interface PlayerProgressState {
  playerId: string;
  displayName: string;
  /**
   * The number the player must click next. Derived from the round's
   * `numberSequence`, not from `previous + 1`, because Chaos boards hold
   * arbitrary values from 1-1000.
   */
  expectedNumber: number;
  /** How many of the current board the player has cleared. */
  expectedIndex: number;
  hp: number;
  maxHp: number;
  completed: boolean;
  finishOrder: number | null; // 1, 2, 3...
  eliminated: boolean;
  wrongClicks: number;
  /**
   * Server timestamp before which clicks are rejected. Only set by RANKED_TIME.
   * Reconnect-safe by construction: the lock is compared against the server
   * clock on every move, so a refresh cannot shorten or clear it.
   */
  lockedUntil?: number | null;
  lastClickResult?: {
    cardId: string;
    number: number;
    correct: boolean;
    timestamp: number;
  };
}

export interface RoundState {
  roundNumber: number;
  gridSize: GridSize;
  totalNumbers: number; // gridSize * gridSize
  cards: NumberCircleCard[];
  /**
   * Ascending click order for this board. STANDARD is 1..N; Chaos is the sorted
   * draw from 1-1000. Held on the round so the expected number is always a
   * lookup rather than arithmetic.
   */
  numberSequence: number[];
  completedPlayerIds: string[];
  startedAt: number;
  endedAt?: number;
}

export interface NumberGridSettings {
  variant?: NumberGridVariant;
  difficultyMode: DifficultyMode;
  totalRounds: number;
  /** Default progression's ceiling: the run scales 2x2 up to this and holds. */
  maxGridSize?: GridSize;
  customGridSizes?: GridSize[];
  maxHp: number; // 1 to 10 (default: 3)
  damageMode: DamageMode; // 'LAST_PLAYER' | 'EVERYONE_EXCEPT_FIRST'
  hostMode?: boolean;
  hostPlayerId?: string;
  wrongClickDamage?: boolean; // default true: 1 HP per wrong click
}

/** Server-calculated outcome of a ranked run. Never assembled from client input. */
export interface RankedRunResult {
  mode: 'TIME' | 'TOWER' | 'CHAOS';
  stages: number;
  completedStages: number;
  totalTimeMs: number;
  mistakes: number;
  highestFloor: number;
  hpRemaining: number;
  completed: boolean;
  status: 'COMPLETED' | 'DIED' | 'ABANDONED';
  rankingValue: number;
  rankingDirection: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
}

export interface NumberGridMasterState {
  roomId: string;
  sessionId: string;
  phase: GamePhase;
  settings: NumberGridSettings;
  variant: NumberGridVariant;
  currentRoundNumber: number;
  totalRounds: number;
  roundGridSizes: GridSize[];
  currentRound: RoundState;
  players: Record<string, PlayerProgressState>;
  winnerPlayerIds: string[];
  hostPlayerId?: string;
  /** Per-stage durations in ms, appended as each round resolves. */
  roundTimesMs: number[];
  /** Set once the final stage of a ranked run resolves. */
  rankedResult?: RankedRunResult;
  roundResults?: {
    roundNumber: number;
    finishOrder: { playerId: string; displayName: string; finishOrder: number }[];
    damagedPlayerIds: string[];
    eliminatedPlayerIds: string[];
  };
}

export interface OpponentSummary {
  id: string;
  displayName: string;
  hp: number;
  maxHp: number;
  completed: boolean;
  finishOrder: number | null;
  eliminated: boolean;
  progressPercent: number;
  expectedNumber: number;
}

export interface NumberGridPlayerView {
  phase: GamePhase;
  variant: NumberGridVariant;
  currentRoundNumber: number;
  totalRounds: number;
  gridSize: GridSize;
  totalNumbers: number;
  cards: NumberCircleCard[];
  me: PlayerProgressState | null;
  isHost: boolean;
  canPlay: boolean;
  damageMode: DamageMode;
  opponents: OpponentSummary[];
  /** Server clock, so the client countdown cannot drift or be forged. */
  serverNow?: number;
  /** Ranked runs only. */
  ranked?: {
    leaderboardKey: string;
    rankingDirection: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
    elapsedMs: number;
    stages: number;
    penaltyMs: number;
    /** Penalty seconds still to burn off. Display only. */
    lockedForMs: number;
    /** Present once the run has ended. */
    result?: RankedRunResult;
  };
  roundResults?: {
    roundNumber: number;
    finishOrder: { playerId: string; displayName: string; finishOrder: number }[];
    damagedPlayerIds: string[];
    eliminatedPlayerIds: string[];
  };
  winners?: string[];
}
