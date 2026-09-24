import type {
  GameDefinition,
  GameContext,
  GameMove,
  MoveResult,
  GameSettingsField,
  GameEndResult,
} from '@party/game-engine';
import type {
  SalemMasterState,
  SalemPlayerView,
  SalemSettings,
} from './types/index.js';
import { SalemRoleRegistry } from './roles/registry.js';
import { validateSalemMove } from './moves/validate.js';
import { processSalemMove, advanceNightStage } from './moves/process.js';
import { projectSalemPlayerView } from './projection/player-view.js';
import { getDefaultSalemRoleCounts } from './engine/role-assignment.js';

export * from './types/index.js';
export * from './roles/registry.js';

export const DEFAULT_SALEM_SETTINGS: SalemSettings = {
  minPlayers: 4,
  maxPlayers: 12,
  roleCounts: {
    witch: 2,
    constable: 1,
    town_crier: 1,
    doctor: 1,
    puritan: 6,
  },
  roleTimers: {
    witch: 20,
    constable: 15,
    town_crier: 12,
    doctor: 15,
  },
  tieResolution: 'NO_KILL',
  audioMode: 'PRIVATE',
};

export const salemGame: GameDefinition<
  SalemMasterState,
  SalemPlayerView,
  SalemSettings
> = {
  id: 'salem',
  name: 'Salem 1692',
  version: '1.0.0',
  minPlayers: 4,
  maxPlayers: 12,
  defaultSettings: DEFAULT_SALEM_SETTINGS,

  settingsFields: [
    {
      key: 'witchCount',
      label: 'Witch Coven Slots',
      type: 'number',
      default: 2,
      min: 1,
      max: 4,
      description: 'Number of witches hidden in Salem.',
    },
    {
      key: 'constableEnabled',
      label: 'Enable Constable',
      type: 'boolean',
      default: true,
      description: 'Allows one player to choose Constable with Town Mallet.',
    },
    {
      key: 'townCrierEnabled',
      label: 'Enable Town Crier',
      type: 'boolean',
      default: true,
      description: 'Allows one player to choose Town Crier for investigations.',
    },
    {
      key: 'doctorEnabled',
      label: 'Enable Doctor',
      type: 'boolean',
      default: true,
      description: 'Allows one player to choose Doctor with Life Salve & Hemlock.',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: SalemSettings): SalemMasterState {
    const registry = SalemRoleRegistry.getInstance();
    const allRoles = registry.list();
    const hostPlayerId = (settings as any).hostPlayerId;
    const playingPlayers = hostPlayerId ? ctx.players.filter((p) => p.id !== hostPlayerId) : ctx.players;
    const playerCount = playingPlayers.length;

    const defaultCounts = getDefaultSalemRoleCounts(playerCount);
    const roleCounts: Record<string, number> = { ...defaultCounts, ...(settings.roleCounts || {}) };
    const roleAssignmentMode = (settings as any).roleAssignmentMode || 'PHYSICAL';
    const initialPhase = (settings as any).initialPhase || ((settings as any).roleAssignmentMode ? 'ROLE_CONFIGURATION' : 'ROLE_SELECTION');

    const availableRoles: SalemMasterState['availableRoles'] = {};
    for (const role of allRoles) {
      const maxCount = roleCounts[role.id] ?? 0;
      availableRoles[role.id] = {
        minCount: role.minCount,
        maxCount,
        currentCount: 0,
      };
    }

    const initialPlayers = ctx.players.map((p, index) => {
      const isHost = p.id === hostPlayerId;
      return {
        id: p.id,
        seatNumber: p.seatNumber || index + 1,
        displayName: p.displayName,
        isConnected: p.isConnected,
        roleId: isHost ? 'host' : null,
        alignment: 'NEUTRAL' as const,
        team: 'TOWN' as const,
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
      hostMode: true,
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

  getCurrentPhase(state: SalemMasterState): string {
    return state.phase;
  },

  validateMove(
    state: SalemMasterState,
    move: GameMove,
    ctx: GameContext
  ): { valid: boolean; reason?: string } {
    return validateSalemMove(state, move);
  },

  processMove(
    state: SalemMasterState,
    move: GameMove,
    ctx: GameContext
  ): MoveResult<SalemMasterState> {
    return processSalemMove(state, move, ctx);
  },

  getPlayerView(
    state: SalemMasterState,
    playerId: string,
    ctx: GameContext
  ): SalemPlayerView {
    return projectSalemPlayerView(state, playerId);
  },

  checkGameEnd(state: SalemMasterState): GameEndResult | null {
    if (state.phase === 'GAME_OVER' && state.gameOverData) {
      const winners = state.players
        .filter((p) => p.team === state.gameOverData!.winner)
        .map((p) => p.id);

      return {
        isEnded: true,
        winners,
        data: {
          winnerTeam: state.gameOverData.winner,
          reason: state.gameOverData.reason,
          nightsSurvived: state.gameOverData.nightsSurvived,
        },
      };
    }
    return null;
  },

  onTimerExpired(
    state: SalemMasterState,
    timerId: string,
    ctx: GameContext
  ): MoveResult<SalemMasterState> {
    if (state.phase === 'NIGHT' && timerId.startsWith('NIGHT_STAGE_')) {
      return {
        success: true,
        newState: advanceNightStage(state, ctx),
      };
    }
    return { success: false, error: 'Timer expired in unexpected state.' };
  },
};

export default salemGame;
