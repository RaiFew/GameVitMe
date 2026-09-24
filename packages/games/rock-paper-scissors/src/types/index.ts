export type RPSChoice = 'ROCK' | 'PAPER' | 'SCISSORS';

export type RPSGameMode = 'DUEL' | 'BATTLE_ROYALE' | 'POINTS_RACE';

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
  hostMode: boolean;
  hostPlayerId?: string;
  players: Record<string, RPSPlayerState>;
  playerOrder: string[];
  history: RPSRoundOutcome[];
  lastRoundOutcome: RPSRoundOutcome | null;
  winnerIds: string[];
  winReason?: string;
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
}
