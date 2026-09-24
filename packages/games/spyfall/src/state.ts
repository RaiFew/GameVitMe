/**
 * Spyfall master game state (server-only — contains all secrets)
 * and player-specific projected view.
 */

// ─── Game Phases ───────────────────────────────────────────────

export const SpyfallPhase = {
  ROLE_REVEAL: 'ROLE_REVEAL',
  QUESTIONING: 'QUESTIONING',
  ACCUSATION_VOTE: 'ACCUSATION_VOTE',
  SPY_GUESS: 'SPY_GUESS',
  GAME_OVER: 'GAME_OVER',
} as const;

export type SpyfallPhase = (typeof SpyfallPhase)[keyof typeof SpyfallPhase];

// ─── Master State ──────────────────────────────────────────────

export interface SpyfallVotingState {
  accusedPlayerId: string;
  order: string[]; // Sequential order of eligible voters (clockwise)
  currentVoterIndex: number;
  votes: Record<string, 'YES' | 'NO'>;
}

export interface SpyfallMasterState {
  phase: SpyfallPhase;
  hostMode: boolean;
  hostPlayerId: string;
  selectedLocation: string;
  selectedLocationId: string;
  spyPlayerId: string;
  playerRoles: Record<string, string>;
  allLocations: string[];
  currentQuestionerId: string | null;
  currentAnswererId: string | null;
  previousQuestionerId: string | null;
  roundStartedAt: number;
  roundExpiresAt: number;
  accuserId: string | null;
  accusedPlayerId: string | null;
  /** Track whether each player has used their one indictment attempt this round */
  indictmentUsed: Record<string, boolean>;
  /** Sequential voting state */
  voting: SpyfallVotingState | null;
  gameOverData: SpyfallGameOverData | null;
  playerOrder: string[];
}

export interface SpyfallGameOverData {
  spyPlayerId: string;
  location: string;
  winner: 'SPY' | 'NON_SPIES';
  reason: string;
  spyGuess?: string;
  roles: Record<string, string>;
}

// ─── Player View (what clients actually see) ───────────────────

export interface SpyfallPlayerViewVoting {
  accusedPlayerId: string;
  currentVoterId: string | null;
  currentVoterIndex: number;
  totalVoters: number;
  votesCount: number;
  hasVoted: boolean;
  voterOrder: string[];
}

export interface SpyfallPlayerView {
  phase: SpyfallPhase;
  hostMode: boolean;
  isHost: boolean;
  /** Whether this client is an active player (false for Host in Host Mode) */
  canPlay: boolean;
  isSpy: boolean;
  location: string | null;
  myRole: string | null;
  allLocations: string[];
  currentQuestionerId: string | null;
  currentAnswererId: string | null;
  previousQuestionerId: string | null;
  roundStartedAt: number;
  roundExpiresAt: number;
  accuserId: string | null;
  accusedPlayerId: string | null;
  hasUsedIndictment: boolean;
  voting: SpyfallPlayerViewVoting | null;
  players: {
    id: string;
    displayName: string;
    isConnected: boolean;
    hasVoted: boolean;
    isCurrentVoter: boolean;
    isHost?: boolean;
    canPlay?: boolean;
  }[];
  gameOverData: SpyfallGameOverData | null;
}

// ─── Settings ──────────────────────────────────────────────────

export interface SpyfallSettings {
  hostMode: boolean;
  hostPlayerId?: string;
  roundDurationSeconds: number;
  locationCount: number;
}

export const DEFAULT_SPYFALL_SETTINGS: SpyfallSettings = {
  hostMode: true,
  roundDurationSeconds: 480, // 8 minutes
  locationCount: 16,
};

// ─── Move Types ────────────────────────────────────────────────

export const SpyfallMoveType = {
  READY_TO_PLAY: 'ready_to_play',
  ASK_QUESTION: 'ask_question',
  ANSWER_DONE: 'answer_done',
  ACCUSE: 'accuse',
  VOTE: 'vote',
  SPY_REVEAL: 'spy_reveal',
  SPY_GUESS_LOCATION: 'spy_guess_location',
  HOST_END_GAME: 'host_end_game',
} as const;

export type SpyfallMoveType = (typeof SpyfallMoveType)[keyof typeof SpyfallMoveType];
