export type RPSChoice = 'ROCK' | 'PAPER' | 'SCISSORS';

export type RPSGameMode = 'DUEL' | 'BATTLE_ROYALE' | 'POINTS_RACE' | 'TOURNAMENT';

export type RPSPhase = 'CHOOSING' | 'REVEAL' | 'ROUND_RESULT' | 'GAME_OVER';

export type RPSPlayerRoundStatus =
  | 'PENDING'
  | 'LOCKED'
  | 'WON'
  | 'LOST'
  | 'TIED'
  | 'ELIMINATED';

export interface RPSPlayerState {
  id: string;
  displayName: string;
  seatNumber: number;
  score: number;
  isAlive: boolean; // For Battle Royale mode
  currentChoice: RPSChoice | null;
  choiceHistory: RPSChoice[];
  roundStatus: RPSPlayerRoundStatus;
  /** Tournament only: legs left before this player is out of the bracket. */
  lives: number;
}

// ─── Tournament ─────────────────────────────────────────────────

/**
 * One throw of a match. A tie resolves to a null winner and costs no lives,
 * so a match can run longer than the leg count its lives imply.
 */
export interface RPSMatchLeg {
  index: number;
  choices: Record<string, RPSChoice>;
  winnerId: string | null;
  isTie: boolean;
}

export type RPSMatchStatus =
  /** Both slots known, not started yet. */
  | 'PENDING'
  /** Legs are being thrown. */
  | 'LIVE'
  /** One slot was empty -- the seated player advanced without playing. */
  | 'BYE'
  | 'DONE';

export interface RPSMatch {
  id: string;
  roundIndex: number;
  playerAId: string | null;
  playerBId: string | null;
  legs: RPSMatchLeg[];
  status: RPSMatchStatus;
  winnerId: string | null;
}

export interface RPSBracket {
  /** `rounds[0]` is the first round; each later round is fed by the one before. */
  rounds: RPSMatch[][];
  currentRoundIndex: number;
  championId: string | null;
}

export interface RPSRoundOutcome {
  roundNumber: number;
  isTie: boolean;
  tieReason?: 'ALL_SAME' | 'ALL_THREE_PRESENT' | 'NO_CHOICES';
  winningChoice?: RPSChoice;
  losingChoice?: RPSChoice;
  winnerIds: string[];
  loserIds: string[];
  eliminatedIds: string[];
  choices: Record<string, RPSChoice | null>;
  description: string;
}

export interface RPSMasterState {
  gameMode: RPSGameMode;
  phase: RPSPhase;
  roundNumber: number;
  targetScore: number;
  roundDurationSeconds: number;
  roundExpiresAt: number | null;
  /** Tournament only: lives each fighter is refilled to at the start of a round. */
  livesPerMatch: number;
  hostMode: boolean;
  hostPlayerId?: string;
  players: Record<string, RPSPlayerState>;
  playerOrder: string[];
  history: RPSRoundOutcome[];
  lastRoundOutcome: RPSRoundOutcome | null;
  winnerIds: string[];
  winReason?: string;
  /** Tournament only. */
  bracket?: RPSBracket;
  /** The one match being thrown -- matches are played in bracket order. */
  currentMatchId?: string | null;
}

export interface RPSPlayerViewItem {
  id: string;
  displayName: string;
  seatNumber: number;
  score: number;
  isAlive: boolean;
  hasChosen: boolean;
  choice: RPSChoice | null; // Masked for opponents during CHOOSING
  roundStatus: RPSPlayerRoundStatus;
  choiceHistory: RPSChoice[];
  isHost?: boolean;
  canPlay?: boolean;
  lives: number;
}

export interface RPSPlayerView {
  gameMode: RPSGameMode;
  phase: RPSPhase;
  roundNumber: number;
  targetScore: number;
  roundDurationSeconds: number;
  roundExpiresAt: number | null;
  isHostMode: boolean;
  hostPlayerId?: string;
  me: RPSPlayerViewItem;
  players: RPSPlayerViewItem[];
  lastRoundOutcome: RPSRoundOutcome | null;
  winnerIds: string[];
  winReason?: string;
  /** Tournament only: the whole bracket, safe to show to everyone. */
  bracket?: RPSBracket;
  currentMatchId?: string | null;
  stats?: {
    totalRounds: number;
    mostCommonWeapon?: RPSChoice;
    leaderId?: string;
  };
}

export interface RPSSettings {
  gameMode?: RPSGameMode;
  targetScore?: number;
  roundDurationSeconds?: number;
  hostMode?: boolean;
  hostPlayerId?: string;
  /** Tournament only: legs a player can lose before dropping out of the bracket. */
  livesPerMatch?: number;
}
