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
  PlayerProgressState,
  GridSize,
} from './types/index.js';
import {
  generateBoard,
  calculateRoundGridSizes,
} from './engine/board-generator.js';
import {
  validateNumberGridMove,
  processNumberGridMove,
} from './moves/index.js';
import { projectNumberGridPlayerView } from './projection/player-view.js';

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

export const numberGridGame: GameDefinition<
  NumberGridMasterState,
  NumberGridPlayerView,
  NumberGridSettings
> = {
  id: 'number-grid',
  name: 'Number Grid',
  version: '1.0.0',
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
    const effectiveSettings: NumberGridSettings = {
      ...DEFAULT_NUMBER_GRID_SETTINGS,
      ...settings,
    };

    const hostMode = !!effectiveSettings.hostMode;
    const hostPlayerId =
      effectiveSettings.hostPlayerId || (ctx as any).hostPlayerId || ctx.players[0]?.id;

    // Filter playing players if in TV Host Mode
    const activePlayers =
      hostMode && hostPlayerId
        ? ctx.players.filter((p) => p.id !== hostPlayerId)
        : ctx.players;

    const maxHp = Math.max(1, Math.min(10, Number(effectiveSettings.maxHp) || 3));
    const totalRounds = Math.max(1, Math.min(20, Number(effectiveSettings.totalRounds) || 9));

    const roundGridSizes = calculateRoundGridSizes(
      effectiveSettings.difficultyMode,
      totalRounds,
      effectiveSettings.customGridSizes,
    );

    const firstGridSize = roundGridSizes[0] || 2;
    const cards = generateBoard(firstGridSize);

    const playersMap: Record<string, PlayerProgressState> = {};
    for (const p of activePlayers) {
      playersMap[p.id] = {
        playerId: p.id,
        displayName: p.displayName || 'Player',
        expectedNumber: 1,
        hp: maxHp,
        maxHp,
        completed: false,
        finishOrder: null,
        eliminated: false,
        wrongClicks: 0,
      };
    }

    const state: NumberGridMasterState = {
      roomId: ctx.roomId,
      sessionId: ctx.gameSessionId,
      phase: 'PLAYING',
      settings: effectiveSettings,
      currentRoundNumber: 1,
      totalRounds,
      roundGridSizes,
      currentRound: {
        roundNumber: 1,
        gridSize: firstGridSize,
        totalNumbers: firstGridSize * firstGridSize,
        cards,
        completedPlayerIds: [],
        startedAt: Date.now(),
      },
      players: playersMap,
      winnerPlayerIds: [],
      hostPlayerId: hostMode ? hostPlayerId : undefined,
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
        },
      };
    }
    return null;
  },
};

export default numberGridGame;
