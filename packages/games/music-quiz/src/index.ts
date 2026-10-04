import type {
  GameContext,
  GameDefinition,
  GameEndResult,
  GameMove,
  GameSettingsField,
  MoveResult,
} from '@party/game-engine';
import type {
  MusicQuizMasterState,
  MusicQuizPlayerState,
  MusicQuizPlayerView,
  MusicQuizSettings,
  QuizTrack,
} from './types/index.js';
import { buildRound } from './engine/quiz.js';
import { normalizeSettings, scoreAnswer, validateMusicQuizMove, REVEAL_SECONDS } from './moves/index.js';
import { projectMusicQuizPlayerView } from './projection/player-view.js';

export * from './types/index.js';
export * from './engine/quiz.js';
export * from './moves/index.js';
export * from './projection/player-view.js';

export const DEFAULT_MUSIC_QUIZ_SETTINGS: MusicQuizSettings = {
  rounds: 10,
  excerptSeconds: 10,
  answerSeconds: 20,
  revealSeconds: 5,
  maxPoints: 1000,
  questionType: 'TITLE',
  query: '',
};

/** Fewer than this and the server will not start a quiz — see buildFirstRound. */
export const MIN_POOL_SIZE = 8;

export const musicQuizGame: GameDefinition<
  MusicQuizMasterState,
  MusicQuizPlayerView,
  MusicQuizSettings
> = {
  id: 'music-quiz',
  name: 'Music Quiz',
  version: '1.0.0',
  // Rounds, scoring and the timers are per-player, so one player is a complete
  // game: a solo run is just a quiz nobody else is racing.
  minPlayers: 1,
  maxPlayers: 20,
  defaultSettings: DEFAULT_MUSIC_QUIZ_SETTINGS,

  settingsFields: [
    {
      key: 'query',
      label: 'Artist or genre',
      type: 'select',
      default: '',
      options: [],
      description: 'What the song pool is searched for. Leave blank for the chart.',
    },
    {
      key: 'rounds',
      label: 'Rounds',
      type: 'number',
      default: 10,
      min: 1,
      max: 50,
      description: 'How many questions to play',
    },
    {
      key: 'questionType',
      label: 'Ask for',
      type: 'select',
      default: 'TITLE',
      options: [
        { label: 'The song title', value: 'TITLE' },
        { label: 'The artist', value: 'ARTIST' },
        { label: 'Both', value: 'BOTH' },
      ],
      description: 'What the four choices are asking for',
    },
    {
      key: 'excerptSeconds',
      label: 'Clip length (s)',
      type: 'number',
      default: 10,
      min: 5,
      max: 30,
      description: 'How long the preview plays before the answer locks',
    },
    {
      key: 'answerSeconds',
      label: 'Answer time (s)',
      type: 'number',
      default: 20,
      min: 5,
      max: 60,
      description: 'Time to pick one of the four answers',
    },
    {
      key: 'maxPoints',
      label: 'Max points',
      type: 'number',
      default: 1000,
      min: 100,
      max: 5000,
      description: 'Points for answering the instant the clip starts',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: MusicQuizSettings): MusicQuizMasterState {
    const effective = normalizeSettings(settings);
    const pool: QuizTrack[] = (effective.pool ?? []).filter(
      (t) => t && t.providerId && t.title && t.artist
    );

    const players: Record<string, MusicQuizPlayerState> = {};
    for (const p of ctx.players) {
      players[p.id] = {
        playerId: p.id,
        displayName: p.displayName || 'Player',
        score: 0,
        correctCount: 0,
      };
    }

    const now = Date.now();
    // A pool too small to build the first round means the provider search came
    // back empty or the host's query matched nothing playable. An empty round
    // here would render a blank board, so the game ends immediately with nobody
    // winning and the lobby card explains why.
    const first = buildRound({
      pool,
      usedKeys: new Set(),
      questionType: effective.questionType,
      random: ctx.random,
      roundNumber: 1,
      nowMs: now,
      answerSeconds: effective.answerSeconds,
    });

    const state: MusicQuizMasterState = {
      roomId: ctx.roomId,
      sessionId: ctx.gameSessionId,
      phase: first ? 'ANSWERING' : 'GAME_OVER',
      settings: effective,
      totalRounds: Math.max(1, Math.min(50, effective.rounds)),
      roundNumber: 1,
      round: first ?? emptyRound(now, effective.answerSeconds),
      players,
      winnerPlayerIds: [],
    };

    if (first) ctx.scheduleTimer(effective.answerSeconds * 1000, 'answer_timer');
    return state;
  },

  getCurrentPhase(state) {
    return state.phase;
  },

  validateMove(state, move, ctx) {
    const result = validateMusicQuizMove(state, move, ctx, Date.now());
    return { valid: result.valid, reason: result.error };
  },

  processMove(state, move, ctx): MoveResult<MusicQuizMasterState> {
    const now = Date.now();
    const validation = validateMusicQuizMove(state, move, ctx, now);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid move', newState: state };
    }

    if (move.type === 'ANSWER') {
      const index = Number((move.payload as { index: number }).index);
      const correct = index === state.round.correctIndex;
      // Elapsed since the round opened, on the server's clock: `move.timestamp`
      // is stamped on arrival, so a client clock cannot buy a faster answer.
      // (Passing the time *remaining* here instead would invert the scoring —
      // the last player to answer would have scored the most.)
      const elapsedMs = Math.max(0, move.timestamp - state.round.questionStartedAtMs);
      const points = scoreAnswer(
        correct,
        elapsedMs,
        state.settings.maxPoints,
        state.settings.answerSeconds * 1000
      );

      const prev = state.players[move.playerId];
      // `validateMove` already refused a non-player; this only satisfies the
      // indexed access, which cannot know that.
      if (!prev) return { success: false, error: 'You are not in this quiz.', newState: state };
      const answers = { ...state.round.answers, [move.playerId]: { index, correct, elapsedMs, points } };
      // Fastest correct answer takes the round highlight. A tie keeps whoever
      // got there first; points are already stamped per player either way.
      const fastest = state.round.fastestPlayerId;
      const fastestPlayerId =
        correct && (fastest === null || elapsedMs < (answers[fastest]?.elapsedMs ?? Infinity))
          ? move.playerId
          : fastest;

      return {
        success: true,
        newState: {
          ...state,
          round: { ...state.round, answers, fastestPlayerId },
          players: {
            ...state.players,
            [move.playerId]: {
              ...prev,
              score: prev.score + points,
              correctCount: prev.correctCount + (correct ? 1 : 0),
            },
          },
        },
      };
    }

    // ADVANCE: open the reveal, which shows the answer and the standings. The
    // answer timer's arming is replaced, since the reveal is on the clock now.
    ctx.scheduleTimer(REVEAL_SECONDS * 1000, 'reveal_timer');
    return { success: true, newState: { ...state, phase: 'REVEAL', round: openReveal(state, now) } };
  },

  getPlayerView(state, _playerId, _ctx) {
    return projectMusicQuizPlayerView(state, _playerId, Date.now());
  },

  checkGameEnd(state): GameEndResult | null {
    if (state.phase !== 'GAME_OVER') return null;
    const scoreSummary: Record<string, number> = {};
    for (const [id, p] of Object.entries(state.players)) scoreSummary[id] = p.score;
    return {
      isEnded: true,
      winners: state.winnerPlayerIds,
      scoreSummary,
      data: {
        totalRounds: state.totalRounds,
        questionType: state.settings.questionType,
      },
    };
  },

  onTimerExpired(state, timerType, ctx): MoveResult<MusicQuizMasterState> {
    if (timerType === 'answer_timer') {
      if (state.phase !== 'ANSWERING') return { success: false, newState: state };
      ctx.scheduleTimer(REVEAL_SECONDS * 1000, 'reveal_timer');
      return {
        success: true,
        newState: { ...state, phase: 'REVEAL', round: openReveal(state, Date.now()) },
      };
    }

    if (timerType === 'reveal_timer') {
      if (state.phase !== 'REVEAL') return { success: false, newState: state };

      if (state.roundNumber >= state.totalRounds) return finishGame(state);

      const usedKeys = new Set<string>([`${state.round.track.provider}:${state.round.track.providerId}`]);
      const next = buildRound({
        pool: state.settings.pool ?? [],
        usedKeys,
        questionType: state.settings.questionType,
        random: ctx.random,
        roundNumber: state.roundNumber + 1,
        nowMs: Date.now(),
        answerSeconds: state.settings.answerSeconds,
      });
      // The pool ran out — often a short chart sample on a narrow query. Ending
      // with what was played beats offering a repeated song as if it were new.
      if (!next) return finishGame(state);

      ctx.scheduleTimer(state.settings.answerSeconds * 1000, 'answer_timer');
      return {
        success: true,
        newState: { ...state, phase: 'ANSWERING', roundNumber: next.roundNumber, round: next },
      };
    }

    return { success: false, newState: state };
  },
};

/** One stamp, shared by every client, so they all stop the clip at the same instant. */
function openReveal(state: MusicQuizMasterState, nowMs: number) {
  return { ...state.round, revealEndsAtMs: nowMs + REVEAL_SECONDS * 1000 };
}

function finishGame(state: MusicQuizMasterState): MoveResult<MusicQuizMasterState> {
  const scores = Object.values(state.players).map((p) => p.score);
  const top = scores.length ? Math.max(...scores) : 0;
  return {
    success: true,
    newState: {
      ...state,
      phase: 'GAME_OVER',
      // Everyone who tied for first wins. Ties are the normal case in a quiz.
      winnerPlayerIds:
        top > 0
          ? Object.values(state.players)
              .filter((p) => p.score === top)
              .map((p) => p.playerId)
          : [],
    },
  };
}

function emptyRound(nowMs: number, answerSeconds: number) {
  return {
    roundNumber: 1,
    track: { provider: 'deezer' as const, providerId: '', title: '', artist: '' },
    choices: ['', '', '', ''],
    correctIndex: 0,
    playbackStartAtMs: nowMs,
    questionStartedAtMs: nowMs,
    questionDeadlineMs: nowMs + answerSeconds * 1000,
    revealEndsAtMs: null,
    answers: {},
    fastestPlayerId: null,
  };
}

export default musicQuizGame;
