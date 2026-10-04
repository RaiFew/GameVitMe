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
  /**
   * How long the reveal lasts, and therefore how long the clip keeps playing
   * into it. Fixed rather than host-tunable: the reveal is the answer screen,
   * and a countdown players can read is the whole point of it.
   */
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
  /**
   * Milliseconds from the round opening to the moment the move reached the
   * server. Both ends are server values: the round's own start stamp and the
   * arrival stamp on the move, so no client clock is involved.
   */
  elapsedMs: number;
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
  /**
   * When the reveal ends, stamped once by the server when the round closed. Null
   * while ANSWERING. The clip keeps playing until this instant, so every client
   * stops at the same moment without a second timer of its own.
   */
  revealEndsAtMs: number | null;
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
  /**
   * Every track already asked. Master-only: the player view does not carry it,
   * since what has already played says nothing about what is coming. The server
   * needs it so each round draws an unheard track rather than a recent one.
   */
  playedKeys: string[];
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
  /** REVEAL only — when the countdown to the next round hits zero. */
  revealEndsAtMs: number | null;
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
    /**
     * One row per player, in leaderboard order, including the players who did
     * not answer — an unanswered row is a result too.
     */
    results: {
      playerId: string;
      displayName: string;
      index: number | null;
      correct: boolean;
      points: number;
    }[];
  } | null;
  winners: string[];
}
