import type {
  GameDefinition,
  GameContext,
  GameMove,
  MoveResult,
  GameSettingsField,
  GameEndResult,
} from '@party/game-engine';
import type {
  RPSChoice,
  RPSMasterState,
  RPSPlayerState,
  RPSPlayerView,
  RPSSettings,
} from './types/index.js';
import {
  validateRPSMove,
  processRPSMove,
  executeRoundResolution,
  startNextRound,
} from './moves/index.js';
import { projectRPSPlayerView } from './projection/player-view.js';

export * from './types/index.js';
export * from './engine/resolver.js';
export * from './moves/index.js';
export * from './projection/player-view.js';

export const DEFAULT_RPS_SETTINGS: RPSSettings = {
  gameMode: 'DUEL',
  targetScore: 3,
  roundDurationSeconds: 10,
  hostMode: false,
};

const CHOICES: RPSChoice[] = ['ROCK', 'PAPER', 'SCISSORS'];

export const rockPaperScissorsGame: GameDefinition<
  RPSMasterState,
  RPSPlayerView,
  RPSSettings
> = {
  id: 'rock-paper-scissors',
  name: 'Rock Paper Scissors',
  version: '1.0.0',
  minPlayers: 2,
  maxPlayers: 20,
  defaultSettings: DEFAULT_RPS_SETTINGS,

  settingsFields: [
    {
      key: 'gameMode',
      label: 'Game Mode',
      type: 'select',
      default: 'DUEL',
      options: [
        { label: 'Duel (1v1 First to N Points)', value: 'DUEL' },
        { label: 'Battle Royale (Survival Elimination)', value: 'BATTLE_ROYALE' },
        { label: 'Points Race (First to Target Score)', value: 'POINTS_RACE' },
      ],
      description: 'Choose the battle format for Rock Paper Scissors',
    },
    {
      key: 'targetScore',
      label: 'Target Score (Points)',
      type: 'number',
      default: 3,
      min: 1,
      max: 15,
      description: 'Points needed to win in Duel or Points Race mode',
    },
    {
      key: 'hostMode',
      label: 'Screen Mode',
      type: 'select',
      default: false,
      options: [
        { label: 'Host / TV Mode (Host acts as TV screen & scoreboard)', value: true },
        { label: 'No Host Mode (Everyone plays directly)', value: false },
      ],
      description: 'Whether the game creator acts as the TV/Screen display for everyone',
    },
    {
      key: 'roundDurationSeconds',
      label: 'Turn Timer (Seconds)',
      type: 'number',
      default: 10,
      min: 5,
      max: 60,
      description: 'Time limit to choose your weapon before auto-selection',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: RPSSettings): RPSMasterState {
    const hostMode = !!settings.hostMode;
    const hostPlayerId = settings.hostPlayerId || (ctx as any).hostPlayerId || ctx.players[0]?.id;

    // Filter playing players: In Host Mode, host acts purely as TV/Screen and does NOT play
    const playingPlayers = hostMode && hostPlayerId
      ? ctx.players.filter((p) => p.id !== hostPlayerId)
      : ctx.players;

    const activePlaying = playingPlayers.length > 0 ? playingPlayers : ctx.players;
    const playerCount = activePlaying.length;

    // Auto-select mode if unspecified: 2 players -> DUEL, 3+ players -> BATTLE_ROYALE
    let gameMode = settings.gameMode;
    if (!gameMode) {
      gameMode = playerCount === 2 ? 'DUEL' : 'BATTLE_ROYALE';
    }

    const targetScore = Math.max(1, Number(settings.targetScore) || 3);
    const roundDurationSeconds = Number(settings.roundDurationSeconds) ?? 10;
    const durationMs = roundDurationSeconds > 0 ? roundDurationSeconds * 1000 : 0;
    const roundExpiresAt = durationMs > 0 ? Date.now() + durationMs : null;

    const players: Record<string, RPSPlayerState> = {};
    const playerOrder: string[] = [];

    for (const p of activePlaying) {
      playerOrder.push(p.id);
      players[p.id] = {
        id: p.id,
        displayName: p.displayName,
        seatNumber: p.seatNumber,
        score: 0,
        isAlive: true,
        currentChoice: null,
        choiceHistory: [],
        roundStatus: 'PENDING',
      };
    }

    if (durationMs > 0) {
      ctx.scheduleTimer(durationMs, 'CHOOSING_TIMEOUT');
    }

    return {
      gameMode,
      phase: 'CHOOSING',
      roundNumber: 1,
      targetScore,
      roundDurationSeconds,
      roundExpiresAt,
      hostMode,
      hostPlayerId,
      players,
      playerOrder,
      history: [],
      lastRoundOutcome: null,
      winnerIds: [],
    };
  },

  getCurrentPhase(state: RPSMasterState): string {
    return state.phase;
  },

  validateMove(
    state: RPSMasterState,
    move: GameMove,
    ctx: GameContext,
  ): { valid: boolean; reason?: string } {
    return validateRPSMove(state, move, ctx);
  },

  processMove(
    state: RPSMasterState,
    move: GameMove,
    ctx: GameContext,
  ): MoveResult<RPSMasterState> {
    return processRPSMove(state, move, ctx);
  },

  getPlayerView(
    state: RPSMasterState,
    playerId: string,
    ctx: GameContext,
  ): RPSPlayerView {
    return projectRPSPlayerView(state, playerId, ctx);
  },

  checkGameEnd(state: RPSMasterState, _ctx: GameContext): GameEndResult | null {
    if (state.phase !== 'GAME_OVER') {
      return null;
    }

    const scoreSummary: Record<string, number> = {};
    for (const [id, p] of Object.entries(state.players)) {
      scoreSummary[id] = p.score;
    }

    return {
      isEnded: true,
      winners: state.winnerIds,
      scoreSummary,
      data: {
        winReason: state.winReason,
        totalRounds: state.roundNumber,
        history: state.history,
      },
    };
  },

  onTimerExpired(
    state: RPSMasterState,
    timerType: string,
    ctx: GameContext,
  ): MoveResult<RPSMasterState> {
    if (timerType === 'CHOOSING_TIMEOUT' && state.phase === 'CHOOSING') {
      // Auto-assign random weapon for any active player who has not chosen
      const updatedPlayers: Record<string, RPSPlayerState> = { ...state.players };

      for (const id of state.playerOrder) {
        const p = updatedPlayers[id];
        if (!p) continue;
        const isActive = state.gameMode === 'BATTLE_ROYALE' ? p.isAlive : true;
        if (isActive && p.currentChoice === null) {
          const randomIndex = Math.floor(ctx.random() * CHOICES.length);
          const autoChoice: RPSChoice = CHOICES[randomIndex] || 'ROCK';
          updatedPlayers[id] = {
            ...p,
            currentChoice: autoChoice,
            roundStatus: 'LOCKED',
          };
        }
      }

      const intermediateState: RPSMasterState = {
        ...state,
        players: updatedPlayers,
      };

      const resolvedState = executeRoundResolution(intermediateState, ctx);
      return {
        success: true,
        newState: resolvedState,
        events: [
          {
            type: 'ROUND_RESOLVED',
            payload: { outcome: resolvedState.lastRoundOutcome },
            recipient: 'all',
          },
        ],
      };
    }

    if (timerType === 'ROUND_RESULT_AUTO_NEXT' && state.phase === 'ROUND_RESULT') {
      const nextState = startNextRound(state, ctx);
      return {
        success: true,
        newState: nextState,
      };
    }

    return { success: true, newState: state };
  },
};

export default rockPaperScissorsGame;
