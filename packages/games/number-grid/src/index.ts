import type {
  GameDefinition,
  GameContext,
  GameMove,
  MoveResult,
  GameSettingsField,
  GameEndResult,
} from '@party/game-engine';
import type {
  NumberGridMasterState,
  NumberGridPlayerView,
  NumberGridSettings,
  NumberGridVariant,
  PlayerProgressState,
  GridSize,
} from './types/index.js';
import {
  ALL_GRID_SIZES,
  buildBoard,
  calculateRoundGridSizes,
} from './engine/board-generator.js';
import {
  validateNumberGridMove,
  processNumberGridMove,
  ENDLESS_TOTAL_ROUNDS,
  isEndless,
  usesChaosNumbers,
} from './moves/index.js';
import { projectNumberGridPlayerView } from './projection/player-view.js';
import { isRankedVariant, RANKED_TIME_STAGES } from './types/index.js';

export * from './types/index.js';
export * from './engine/board-generator.js';
export * from './moves/index.js';
export * from './projection/player-view.js';

export const DEFAULT_NUMBER_GRID_SETTINGS: NumberGridSettings = {
  difficultyMode: 'DEFAULT',
  totalRounds: 9,
  maxHp: 3,
  damageMode: 'LAST_PLAYER',
  hostMode: false,
  wrongClickDamage: true,
};

/**
 * Server-authored starting settings for a variant. Ranked modes are fixed by
 * design: a client may pick which mode to play, never how it is scored.
 */
export function settingsForVariant(
  variant: NumberGridVariant,
  overrides: Partial<NumberGridSettings> = {},
): NumberGridSettings {
  const base: NumberGridSettings = { ...DEFAULT_NUMBER_GRID_SETTINGS, variant: 'STANDARD' };

  switch (variant) {
    case 'CHAOS':
      return {
        ...base,
        variant,
        difficultyMode: 'RANDOM',
        // Guests may play Chaos, so nothing here touches ranking.
        totalRounds: Math.max(1, Math.min(20, overrides.totalRounds ?? 9)),
      };
    case 'RANKED_TIME':
      return {
        ...base,
        variant,
        totalRounds: RANKED_TIME_STAGES,
        maxHp: 999,
        // No HP: a wrong click costs 10 locked-out seconds, which shows up in
        // the clock rather than as a life.
        wrongClickDamage: false,
        hostMode: false,
        damageMode: 'LAST_PLAYER',
      };
    case 'RANKED_TOWER':
      return {
        ...base,
        variant,
        totalRounds: ENDLESS_TOTAL_ROUNDS,
        maxHp: 3,
        difficultyMode: 'DEFAULT',
        wrongClickDamage: true,
        hostMode: false,
      };
    case 'RANKED_CHAOS':
      return {
        ...base,
        variant,
        totalRounds: ENDLESS_TOTAL_ROUNDS,
        maxHp: 3,
        difficultyMode: 'RANDOM',
        wrongClickDamage: true,
        hostMode: false,
      };
    default:
      return { ...base, ...overrides, variant: 'STANDARD' };
  }
}

export const numberGridGame: GameDefinition<
  NumberGridMasterState,
  NumberGridPlayerView,
  NumberGridSettings
> = {
  id: 'number-grid',
  name: 'Number Grid',
  version: '2.0.0',
  minPlayers: 1,
  maxPlayers: 20,
  defaultSettings: DEFAULT_NUMBER_GRID_SETTINGS,

  settingsFields: [
    {
      key: 'difficultyMode',
      label: 'Difficulty Mode',
      type: 'select',
      default: 'DEFAULT',
      options: [
        { label: 'Default Progression (2x2 to 10x10)', value: 'DEFAULT' },
        { label: 'Custom (Host selects grid per round)', value: 'CUSTOM' },
        { label: 'Random (Server picks random sizes)', value: 'RANDOM' },
      ],
      description: 'Progression style of grid sizes across rounds',
    },
    {
      key: 'totalRounds',
      label: 'Total Rounds',
      type: 'number',
      default: 9,
      min: 1,
      max: 20,
      description: 'Number of rounds in the match',
    },
    {
      key: 'maxHp',
      label: 'Player Health (HP)',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      description: 'Starting HP per player (1 to 10)',
    },
    {
      key: 'damageMode',
      label: 'Wrong Click / Round Damage Mode',
      type: 'select',
      default: 'LAST_PLAYER',
      options: [
        { label: 'Last Player (Last player to finish takes damage)', value: 'LAST_PLAYER' },
        { label: 'Everyone Except First (Only 1st place escapes damage)', value: 'EVERYONE_EXCEPT_FIRST' },
      ],
      description: 'Damage rule applied when players complete or finish a round',
    },
    {
      key: 'wrongClickDamage',
      label: 'Wrong Click Damage',
      type: 'select',
      default: true,
      options: [
        { label: 'Lose 1 HP per wrong click', value: true },
        { label: 'No penalty for wrong clicks', value: false },
      ],
      description: 'Whether clicking the wrong number costs HP',
    },
    {
      key: 'hostMode',
      label: 'Screen Mode',
      type: 'select',
      default: false,
      options: [
        { label: 'Host / TV Mode (Host acts as big screen scoreboard)', value: true },
        { label: 'No Host Mode (Everyone plays directly)', value: false },
      ],
      description: 'Whether host device is a dedicated spectator TV screen',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: NumberGridSettings): NumberGridMasterState {
    const variant: NumberGridVariant = settings.variant ?? 'STANDARD';
    // A ranked run's scoring rules are not negotiable, so nothing the caller
    // passed can reach them. Normal rooms still take host settings as-is.
    const effectiveSettings: NumberGridSettings = isRankedVariant(variant)
      ? settingsForVariant(variant)
      : { ...settingsForVariant(variant, settings), ...settings, variant };

    const hostMode = !!effectiveSettings.hostMode;
    const hostPlayerId =
      effectiveSettings.hostPlayerId || (ctx as any).hostPlayerId || ctx.players[0]?.id;

    // Filter playing players if in TV Host Mode
    const activePlayers =
      hostMode && hostPlayerId
        ? ctx.players.filter((p) => p.id !== hostPlayerId)
        : ctx.players;

    // A Time run is 10 stages; the others round up to a configured count.
    const rawRounds = Number(effectiveSettings.totalRounds) || 9;
    const totalRounds = variant === 'RANKED_TIME'
      ? RANKED_TIME_STAGES
      : isEndless(variant)
      ? ENDLESS_TOTAL_ROUNDS
      : Math.max(1, Math.min(20, rawRounds));

    // Time has no HP. maxHp is kept at a large sentinel so the existing HP
    // guards can never fire; the penalty is the lock, not a life.
    const maxHp =
      variant === 'RANKED_TIME'
        ? Number.MAX_SAFE_INTEGER
        : Math.max(1, Math.min(10, Number(effectiveSettings.maxHp) || 3));

    const roundGridSizes = isEndless(variant) || usesChaosNumbers(variant)
      ? []
      : calculateRoundGridSizes(effectiveSettings.difficultyMode, totalRounds, effectiveSettings.customGridSizes);

    // Chaos randomizes from the very first round, including the size.
    const firstGridSize: GridSize = usesChaosNumbers(variant)
      ? (ALL_GRID_SIZES[Math.floor(ctx.random() * ALL_GRID_SIZES.length)] ?? 3)
      : roundGridSizes[0] || 2;

    const { cards, sequence } = buildBoard(firstGridSize, {
      numberRange: usesChaosNumbers(variant) ? 'CHAOS' : 'SEQUENTIAL',
      random: ctx.random,
    });

    const playersMap: Record<string, PlayerProgressState> = {};
    for (const p of activePlayers) {
      playersMap[p.id] = {
        playerId: p.id,
        displayName: p.displayName || 'Player',
        expectedIndex: 0,
        expectedNumber: sequence[0] ?? 1,
        hp: maxHp,
        maxHp,
        completed: false,
        finishOrder: null,
        eliminated: false,
        wrongClicks: 0,
        lockedUntil: null,
      };
    }

    const state: NumberGridMasterState = {
      roomId: ctx.roomId,
      sessionId: ctx.gameSessionId,
      phase: 'PLAYING',
      settings: effectiveSettings,
      variant,
      currentRoundNumber: 1,
      totalRounds,
      roundGridSizes,
      currentRound: {
        roundNumber: 1,
        gridSize: firstGridSize,
        totalNumbers: firstGridSize * firstGridSize,
        cards,
        numberSequence: sequence,
        completedPlayerIds: [],
        startedAt: Date.now(),
      },
      players: playersMap,
      winnerPlayerIds: [],
      roundTimesMs: [],
      // Kept even outside host mode: it is what identifies who may advance rounds.
      hostPlayerId,
    };

    return state;
  },

  getCurrentPhase(state: NumberGridMasterState): string {
    return state.phase;
  },

  validateMove(
    state: NumberGridMasterState,
    move: GameMove,
    _ctx: GameContext,
  ): { valid: boolean; reason?: string } {
    const result = validateNumberGridMove(state, move.playerId, move.type, move.payload);
    return {
      valid: result.valid,
      reason: result.error,
    };
  },

  processMove(
    state: NumberGridMasterState,
    move: GameMove,
    ctx: GameContext,
  ): MoveResult<NumberGridMasterState> {
    const validation = validateNumberGridMove(state, move.playerId, move.type, move.payload);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid move',
        newState: state,
      };
    }

    const newState = processNumberGridMove(state, move.playerId, move.type, move.payload, ctx);
    return {
      success: true,
      newState,
    };
  },

  getPlayerView(
    state: NumberGridMasterState,
    playerId: string,
    _ctx: GameContext,
  ): NumberGridPlayerView {
    return projectNumberGridPlayerView(state, playerId);
  },

  checkGameEnd(state: NumberGridMasterState): GameEndResult | null {
    if (state.phase === 'GAME_OVER') {
      const scoreSummary: Record<string, number> = {};
      for (const [id, p] of Object.entries(state.players)) {
        scoreSummary[id] = p.hp;
      }
      return {
        isEnded: true,
        winners: state.winnerPlayerIds,
        scoreSummary,
        data: {
          totalRounds: state.currentRoundNumber,
          results: state.roundResults,
          // Present only for ranked runs. The server writes this to the
          // leaderboard; the client only renders it.
          rankedResult: state.rankedResult,
        },
      };
    }
    return null;
  },
};

export default numberGridGame;
