import type {
  GameDefinition,
  GameContext,
  GameMove,
  MoveResult,
  GameSettingsField,
  GameEndResult,
} from '@party/game-engine';
import type {
  WerewolfMasterState,
  WerewolfPlayerView,
  WerewolfSettings,
} from './types/index.js';
import { RoleRegistry } from './roles/registry.js';
import { validateWerewolfMove } from './moves/validate.js';
import { processWerewolfMove, advanceNightStage } from './moves/process.js';
import { projectWerewolfPlayerView } from './projection/player-view.js';
import { getDefaultRoleCounts } from './engine/role-assignment.js';

export * from './types/index.js';
export * from './roles/registry.js';

export const DEFAULT_WEREWOLF_SETTINGS: WerewolfSettings = {
  minPlayers: 4,
  maxPlayers: 12,
  roleCounts: {
    werewolf: 2,
    seer: 1,
    witch: 1,
    defender: 1,
    constable: 0,
    villager: 6,
  },
  roleTimers: {
    werewolf: 20,
    witch: 20,
    defender: 15,
    constable: 15,
    seer: 10,
  },
  tieResolution: 'NO_KILL',
  audioMode: 'PRIVATE',
};

export const werewolfGame: GameDefinition<
  WerewolfMasterState,
  WerewolfPlayerView,
  WerewolfSettings
> = {
  id: 'werewolf',
  name: 'Werewolf',
  version: '1.0.0',
  minPlayers: 4,
  maxPlayers: 12,
  defaultSettings: DEFAULT_WEREWOLF_SETTINGS,

  settingsFields: [
    {
      key: 'werewolfCount',
      label: 'Werewolf Count',
      type: 'number',
      default: 2,
      min: 1,
      max: 4,
      description: 'Number of werewolf slots available.',
    },
    {
      key: 'seerEnabled',
      label: 'Enable Seer',
      type: 'boolean',
      default: true,
      description: 'Allows one player to choose the Seer role.',
    },
    {
      key: 'witchEnabled',
      label: 'Enable Witch',
      type: 'boolean',
      default: true,
      description: 'Allows one player to choose the Witch role.',
    },
    {
      key: 'defenderEnabled',
      label: 'Enable Defender',
      type: 'boolean',
      default: true,
      description: 'Allows one player to choose the Defender role.',
    },
    {
      key: 'constableEnabled',
      label: 'Enable Constable',
      type: 'boolean',
      default: false,
      description: 'Allows one player to choose the Constable role.',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: WerewolfSettings): WerewolfMasterState {
    const registry = RoleRegistry.getInstance();
    const allRoles = registry.list();
    const hostMode = (settings as any).hostMode !== false;
    const hostPlayerId = (settings as any).hostPlayerId;
    const playingPlayers = hostMode && hostPlayerId ? ctx.players.filter(p => p.id !== hostPlayerId) : ctx.players;
    const playerCount = playingPlayers.length;

    const defaultCounts = getDefaultRoleCounts(playerCount);
    const roleCounts: Record<string, number> = { ...defaultCounts, ...(settings.roleCounts || {}) };
    const roleAssignmentMode = (settings as any).roleAssignmentMode || 'PHYSICAL';
    const initialPhase = (settings as any).initialPhase || ((settings as any).roleAssignmentMode ? 'ROLE_CONFIGURATION' : 'ROLE_SELECTION');

    // Calculate role quotas based on player count and settings
    const availableRoles: WerewolfMasterState['availableRoles'] = {};
    for (const role of allRoles) {
      const maxCount = roleCounts[role.id] ?? 0;
      availableRoles[role.id] = {
        minCount: role.minCount,
        maxCount,
        currentCount: 0,
      };
    }

    const initialPlayers = ctx.players.map((p, index) => {
      const isHost = hostMode && p.id === hostPlayerId;
      return {
        id: p.id,
        seatNumber: p.seatNumber || index + 1,
        displayName: p.displayName,
        isConnected: p.isConnected,
        roleId: isHost ? 'host' : null,
        alignment: 'NEUTRAL' as const,
        team: 'VILLAGE' as const,
        isAlive: true,
        isHost,
        canPlay: !isHost,
        roleConfirmed: false,
        roleRevealedReady: false,
      };
    });

    return {
      phase: initialPhase,
      roundNumber: 0,
      hostPlayerId,
      hostMode,
      roleAssignmentMode,
      roleCounts,
      players: initialPlayers,
      availableRoles,
      allRolesSelected: false,
      allRolesConfirmed: false,
      allRolesReady: false,
      night: {
        queue: [],
        currentStageIndex: -1,
        currentStage: null,
        stageStartedAt: 0,
        stageEndsAt: 0,
        actions: [],
        lastResolution: null,
      },
      day: {
        votes: {},
        eliminatedPlayerId: null,
        isTie: false,
      },
      investigations: {},
      gameOverData: null,
    };
  },

  getCurrentPhase(state: WerewolfMasterState): string {
    return state.phase;
  },

  validateMove(
    state: WerewolfMasterState,
    move: GameMove,
    ctx: GameContext
  ): { valid: boolean; reason?: string } {
    return validateWerewolfMove(state, move);
  },

  processMove(
    state: WerewolfMasterState,
    move: GameMove,
    ctx: GameContext
  ): MoveResult<WerewolfMasterState> {
    return processWerewolfMove(state, move, ctx);
  },

  getPlayerView(
    state: WerewolfMasterState,
    playerId: string,
    ctx: GameContext
  ): WerewolfPlayerView {
    return projectWerewolfPlayerView(state, playerId);
  },

  checkGameEnd(state: WerewolfMasterState, ctx: GameContext): GameEndResult | null {
    if (state.phase !== 'GAME_OVER' || !state.gameOverData) {
      return null;
    }

    const winningPlayerIds = state.players
      .filter((p) => {
        if (state.gameOverData!.winner === 'VILLAGE') {
          return p.team === 'VILLAGE' || p.alignment === 'GOOD';
        }
        return p.team === 'WEREWOLF' || p.roleId === 'werewolf';
      })
      .map((p) => p.id);

    return {
      isEnded: true,
      winners: winningPlayerIds,
      data: state.gameOverData,
    };
  },

  onTimerExpired(
    state: WerewolfMasterState,
    timerType: string,
    ctx: GameContext
  ): MoveResult<WerewolfMasterState> {
    if (state.phase === 'NIGHT' && timerType.startsWith('NIGHT_STAGE_')) {
      const nextState = advanceNightStage(state, ctx);
      return {
        success: true,
        newState: nextState,
      };
    }
    return { success: false, error: 'Timer expired in unexpected state.' };
  },

  onPlayerDisconnected(
    state: WerewolfMasterState,
    playerId: string,
    ctx: GameContext
  ): MoveResult<WerewolfMasterState> {
    const updatedPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    );
    return {
      success: true,
      newState: { ...state, players: updatedPlayers },
    };
  },

  onPlayerReconnected(
    state: WerewolfMasterState,
    playerId: string,
    ctx: GameContext
  ): MoveResult<WerewolfMasterState> {
    const updatedPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: true } : p
    );
    return {
      success: true,
      newState: { ...state, players: updatedPlayers },
    };
  },
};

export default werewolfGame;
