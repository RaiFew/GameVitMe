export type MusicQuizPhase = 'ANSWERING' | 'REVEAL' | 'GAME_OVER';

export type QuestionType = 'TITLE' | 'ARTIST' | 'BOTH';

/** Who supplies the pool and the preview. Only tracks from these two are used. */
export type TrackProvider = 'deezer' | 'itunes';

/**
 * A pool entry. Deliberately carries no preview URL: the provider's signed link
 * expires about fifteen minutes after it is issued, so a stored one is a dead
 * link by the second round. The URL is fetched when the round starts.
 */
export interface QuizTrack {
  provider: TrackProvider;
  /** The provider's own id for this track. The key a preview is looked up by. */
  providerId: string;
  title: string;
  artist: string;
}

export interface MusicQuizSettings {
  rounds: number;
  /** How long the clip plays before the answer locks, in seconds. */
  excerptSeconds: number;
  /** How long players have to answer once the clip is audible. */
  answerSeconds: number;
  /** Seconds the correct answer stays on screen before the next round. */
  revealSeconds: number;
  maxPoints: number;
  questionType: QuestionType;
  /** The host's free-text artist or genre, used only to build the pool. */
  query: string;
  /**
   * Server-authored at `game:start` from the provider search. It is never read
   * from a client: the settings validator drops the key, so this is only ever
   * the list the server itself fetched.
   */
  pool?: QuizTrack[];
}

export interface QuizAnswer {
  index: number;
  correct: boolean;
  /** Milliseconds left on the clock when the move reached the server. */
  responseMs: number;
  points: number;
}

export interface MusicQuizPlayerState {
  playerId: string;
  displayName: string;
  score: number;
  correctCount: number;
}

export interface QuizRound {
  roundNumber: number;
  track: QuizTrack;
  /** Exactly four labels, shuffled. The same four for everyone. */
  choices: string[];
  /** MASTER ONLY during ANSWERING. */
  correctIndex: number;
  /** When the clip becomes audible — an absolute server timestamp. */
  playbackStartAtMs: number;
  questionStartedAtMs: number;
  questionDeadlineMs: number;
  answers: Record<string, QuizAnswer>;
  /** The fastest correct answer this round, or null if nobody got it. */
  fastestPlayerId: string | null;
}

export interface MusicQuizMasterState {
  roomId: string;
  sessionId: string;
  phase: MusicQuizPhase;
  settings: MusicQuizSettings;
  totalRounds: number;
  roundNumber: number;
  round: QuizRound;
  players: Record<string, MusicQuizPlayerState>;
  winnerPlayerIds: string[];
}

export interface MusicQuizPlayerView {
  roomId: string;
  phase: MusicQuizPhase;
  roundNumber: number;
  totalRounds: number;
  serverNow: number;
  questionType: QuestionType;
  excerptSeconds: number;
  choices: string[];
  playbackStartAtMs: number;
  questionDeadlineMs: number;
  /** Enough to fetch the audio and nothing more — never the title. */
  audio: { provider: TrackProvider; providerId: string } | null;
  /** The player's own locked-in answer, so a late re-render can grey the buttons. */
  myAnswerIndex: number | null;
  myScore: number;
  scoreboard: { playerId: string; displayName: string; score: number; correctCount: number }[];
  /** REVEAL only. */
  revealed: {
    correctIndex: number;
    title: string;
    artist: string;
    fastestPlayerId: string | null;
  } | null;
  winners: string[];
}
