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
  clue: CodenamesClue;
  guesses: CodenamesGuess[];
  endedReason: 'MAX_GUESSES' | 'WRONG_GUESS' | 'PASS' | 'ASSASSIN' | 'WIN';
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
}

export interface CodenamesSettings {
  hostMode?: boolean;
  gameMode?: CodenamesGameMode;
  hostPlayerId?: string;
  wordSource?: 'DEFAULT' | 'CUSTOM';
  wordFileId?: string;
  wordPoolSnapshot?: string[];
  roundDurationSeconds?: number;
}
