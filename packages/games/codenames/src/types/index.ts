export type TeamColor = 'RED' | 'BLUE';
export type CodenamesRole = 'SPYMASTER' | 'OPERATIVE';
export type CardColor = 'RED' | 'BLUE' | 'NEUTRAL' | 'ASSASSIN';
export type CodenamesPhase = 'TEAM_SETUP' | 'CLUE' | 'GUESSING' | 'GAME_OVER';
export type CodenamesGameMode = 'CLASSIC' | 'TWO_PLAYER';

export interface CodenamesPlayerState {
  id: string;
  displayName: string;
  seatNumber: number;
  isConnected: boolean;
  team: TeamColor | null;
  role: CodenamesRole | null;
  isHost?: boolean;
}

export interface CodenamesCard {
  id: string;
  word: string;
  color: CardColor;
  revealed: boolean;
  revealedByTeam?: TeamColor;
}

export interface CodenamesPublicCard {
  id: string;
  word: string;
  color?: CardColor; // OMITTED for Operatives until revealed!
  revealed: boolean;
  revealedByTeam?: TeamColor;
}

export interface CodenamesClue {
  word: string;
  number: number;
  team: TeamColor;
  submittedAt: number;
}

export interface CodenamesGuess {
  cardId: string;
  word: string;
  color: CardColor;
  resultedIn: 'CORRECT' | 'OPPONENT' | 'NEUTRAL' | 'ASSASSIN';
  guessedBy: string;
}

export interface CodenamesTurnLog {
  turnNumber: number;
  team: TeamColor;
  /** Null when the turn was forfeited on the clue timer before any clue was given. */
  clue: CodenamesClue | null;
  guesses: CodenamesGuess[];
  endedReason:
    | 'MAX_GUESSES'
    | 'WRONG_GUESS'
    | 'PASS'
    | 'ASSASSIN'
    | 'WIN'
    | 'CLUE_TIMEOUT'
    /** The turn is still running; this entry is the live one, not a filed record. */
    | 'IN_PROGRESS';
}

export interface CodenamesMasterState {
  phase: CodenamesPhase;
  gameMode: CodenamesGameMode;
  roomId: string;
  hostPlayerId: string;
  players: CodenamesPlayerState[];
  startingTeam: TeamColor;
  currentTeam: TeamColor;
  currentClue: CodenamesClue | null;
  guessesRemaining: number;
  guessesMadeInTurn: number;
  /** Guesses made in the turn currently in progress; folded into `history` when it ends. */
  currentGuesses: CodenamesGuess[];
  cards: CodenamesCard[];
  redRemaining: number;
  blueRemaining: number;
  mistakesMade: number;
  winner: TeamColor | null;
  winReason?: 'ALL_CARDS_FOUND' | 'ASSASSIN_TRIGGERED';
  wordSource: 'DEFAULT' | 'CUSTOM';
  wordFileId?: string;
  wordPoolSnapshot: string[];
  turnNumber: number;
  history: CodenamesTurnLog[];
  /** Absolute timestamp the current phase's timer runs out, or null when timers are off. */
  turnExpiresAt: number | null;
  /** Which phase's timer `turnExpiresAt` belongs to. */
  timerKind: 'CLUE' | 'GUESSING' | null;
  clueTimeSeconds: number;
  guessTimeSeconds: number;
}

export interface CodenamesPlayerView {
  phase: CodenamesPhase;
  gameMode: CodenamesGameMode;
  roomId: string;
  hostPlayerId: string;
  me: {
    id: string;
    displayName: string;
    team: TeamColor | null;
    role: CodenamesRole | null;
    isHost: boolean;
    isMyTurn: boolean;
    canGiveClue: boolean;
    canGuess: boolean;
  };
  players: {
    id: string;
    displayName: string;
    seatNumber: number;
    isConnected: boolean;
    team: TeamColor | null;
    role: CodenamesRole | null;
    isHost?: boolean;
  }[];
  startingTeam: TeamColor;
  currentTeam: TeamColor;
  currentClue: CodenamesClue | null;
  guessesRemaining: number;
  guessesMadeInTurn: number;
  cards: CodenamesPublicCard[];
  redRemaining: number;
  blueRemaining: number;
  mistakesMade: number;
  cooperativeScore?: {
    found: number;
    total: number;
    mistakes: number;
    remaining: number;
  };
  winner: TeamColor | null;
  winReason?: 'ALL_CARDS_FOUND' | 'ASSASSIN_TRIGGERED';
  wordSource: 'DEFAULT' | 'CUSTOM';
  turnNumber: number;
  canStartMatch?: boolean;
  /**
   * Turns already finished, oldest first. An Operative sees the words it actually
   * saw guessed — the colour of a word that was never selected would leak the
   * key layout — so `CodenamesGuess` is masked per viewer before it goes out.
   */
  history: CodenamesTurnLogView[];
  turnExpiresAt: number | null;
  timerKind: 'CLUE' | 'GUESSING' | null;
}

export interface CodenamesTurnLogView extends Omit<CodenamesTurnLog, 'guesses'> {
  guesses: CodenamesGuessView[];
}

export interface CodenamesGuessView extends Omit<CodenamesGuess, 'color'> {
  /** Omitted for an Operative viewing a word that was never selected. */
  color?: CardColor;
}

export interface CodenamesSettings {
  hostMode?: boolean;
  gameMode?: CodenamesGameMode;
  hostPlayerId?: string;
  wordSource?: 'DEFAULT' | 'CUSTOM';
  wordFileId?: string;
  wordPoolSnapshot?: string[];
  roundDurationSeconds?: number;
  /** Seconds a Spymaster has to give a clue. 0 disables the timer. */
  clueTimeSeconds?: number;
  /** Seconds the Operatives have to guess. 0 disables the timer. */
  guessTimeSeconds?: number;
}
