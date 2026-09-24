export type GridSize = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type DifficultyMode = 'DEFAULT' | 'CUSTOM' | 'RANDOM';

export type DamageMode = 'LAST_PLAYER' | 'EVERYONE_EXCEPT_FIRST';

export type GamePhase =
  | 'LOBBY'
  | 'ROUND_STARTING'
  | 'PLAYING'
  | 'ROUND_RESULT'
  | 'GAME_OVER';

export interface NumberCircleCard {
  id: string;
  number: number;
  index: number;
}

export interface PlayerProgressState {
  playerId: string;
  displayName: string;
  expectedNumber: number; // starts at 1, goes up to totalNumbers + 1
  hp: number;
  maxHp: number;
  completed: boolean;
  finishOrder: number | null; // 1, 2, 3...
  eliminated: boolean;
  wrongClicks: number;
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
  completedPlayerIds: string[];
  startedAt: number;
  endedAt?: number;
}

export interface NumberGridSettings {
  difficultyMode: DifficultyMode;
  totalRounds: number;
  customGridSizes?: GridSize[];
  maxHp: number; // 1 to 10 (default: 3)
  damageMode: DamageMode; // 'LAST_PLAYER' | 'EVERYONE_EXCEPT_FIRST'
  hostMode?: boolean;
  hostPlayerId?: string;
  wrongClickDamage?: boolean; // default true: 1 HP per wrong click
}

export interface NumberGridMasterState {
  roomId: string;
  sessionId: string;
  phase: GamePhase;
  settings: NumberGridSettings;
  currentRoundNumber: number;
  totalRounds: number;
  roundGridSizes: GridSize[];
  currentRound: RoundState;
  players: Record<string, PlayerProgressState>;
  winnerPlayerIds: string[];
  hostPlayerId?: string;
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
  roundResults?: {
    roundNumber: number;
    finishOrder: { playerId: string; displayName: string; finishOrder: number }[];
    damagedPlayerIds: string[];
    eliminatedPlayerIds: string[];
  };
  winners?: string[];
}
