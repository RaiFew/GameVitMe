import type { GameDefinition, GameContext, GameMove, MoveResult, GameSettingsField } from '@party/game-engine';
import type { SpyfallMasterState, SpyfallPlayerView, SpyfallSettings } from './state.js';
import { SpyfallPhase, DEFAULT_SPYFALL_SETTINGS } from './state.js';
import { LOCATIONS } from './data/locations.js';
import { validateSpyfallMove, processSpyfallMove } from './moves.js';
import { projectPlayerView } from './projection.js';

/**
 * Spyfall Game Definition plugin.
 * Strictly enforces 4–12 player counts, server-authoritative state,
 * host/no-host modes, and sequential unanimous voting.
 */
export const spyfallGame: GameDefinition<
  SpyfallMasterState,
  SpyfallPlayerView,
  SpyfallSettings
> = {
  id: 'spyfall',
  name: 'Spyfall',
  version: '1.0.0',
  minPlayers: 4,
  maxPlayers: 12,
  defaultSettings: DEFAULT_SPYFALL_SETTINGS,

  settingsFields: [
    {
      key: 'hostMode',
      label: 'Host Mode',
      type: 'select',
      default: true,
      options: [
        { label: 'Host Mode (Host has control panel & custom timer)', value: true },
        { label: 'No Host Mode (Autonomous round flow)', value: false },
      ],
      description: 'Whether the game creator acts as the Game Leader',
    },
    {
      key: 'roundDurationSeconds',
      label: 'Round Duration (Seconds)',
      type: 'number',
      default: 480,
      min: 30,
      max: 5999, // up to 99m 59s
      description: 'Timer duration for the questioning phase (MM:SS)',
    },
    {
      key: 'locationCount',
      label: 'Number of Reference Locations',
      type: 'number',
      default: 16,
      min: 8,
      max: 16,
      description: 'Number of locations shown in the reference grid',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: SpyfallSettings): SpyfallMasterState {
    const playerIds = ctx.players.map((p) => p.id);
    const isHostMode = !!settings.hostMode;
    const hostId = settings.hostPlayerId || (ctx as any).hostPlayerId || playerIds[0]!;

    // In Host Mode, the Host acts purely as Game Master and does NOT play
    const playingPlayerIds = isHostMode && playerIds.includes(hostId)
      ? playerIds.filter((pid) => pid !== hostId)
      : playerIds;
    const activePlayerIds = playingPlayerIds.length > 0 ? playingPlayerIds : playerIds;

    // Shuffle and select locations for the reference list
    const shuffledLocations = [...LOCATIONS].sort(() => ctx.random() - 0.5);
    const selectedLocations = shuffledLocations.slice(
      0,
      Math.min(settings.locationCount || 16, LOCATIONS.length),
    );

    // Pick one secret location for this round
    const roundLocationIndex = Math.floor(ctx.random() * selectedLocations.length);
    const roundLocation = selectedLocations[roundLocationIndex]!;

    // Pick exactly one Spy randomly from active playing players
    const spyIndex = Math.floor(ctx.random() * activePlayerIds.length);
    const spyPlayerId = activePlayerIds[spyIndex]!;

    // Assign roles to non-spy playing players (Host gets 'Host' role)
    const shuffledRoles = [...roundLocation.roles].sort(() => ctx.random() - 0.5);
    const playerRoles: Record<string, string> = {};
    let roleIndex = 0;
    for (const pid of playerIds) {
      if (isHostMode && pid === hostId) {
        playerRoles[pid] = 'Host';
      } else if (pid === spyPlayerId) {
        playerRoles[pid] = 'Spy';
      } else {
        playerRoles[pid] = shuffledRoles[roleIndex % shuffledRoles.length]!;
        roleIndex++;
      }
    }

    // First questioner is randomly chosen from active playing players (Host never asks)
    const firstIndex = Math.floor(ctx.random() * activePlayerIds.length);
    const firstQuestionerId = activePlayerIds[firstIndex]!;

    // Schedule round timer
    const durationSeconds = settings.roundDurationSeconds || 480;
    const roundDurationMs = durationSeconds * 1000;
    const now = Date.now();
    ctx.scheduleTimer(roundDurationMs, 'round_timer');

    return {
      phase: SpyfallPhase.ROLE_REVEAL,
      hostMode: !!settings.hostMode,
      hostPlayerId: settings.hostPlayerId || playerIds[0]!,
      selectedLocation: roundLocation.name,
      selectedLocationId: roundLocation.id,
      spyPlayerId,
      playerRoles,
      allLocations: selectedLocations.map((l) => l.name).sort(),
      currentQuestionerId: firstQuestionerId,
      currentAnswererId: null,
      previousQuestionerId: null,
      roundStartedAt: now,
      roundExpiresAt: now + roundDurationMs,
      accuserId: null,
      accusedPlayerId: null,
      indictmentUsed: {},
      voting: null,
      gameOverData: null,
      playerOrder: activePlayerIds,
    };
  },

  getCurrentPhase(state: SpyfallMasterState): string {
    return state.phase;
  },

  validateMove(
    state: SpyfallMasterState,
    move: GameMove,
    ctx: GameContext,
  ): { valid: boolean; reason?: string } {
    return validateSpyfallMove(state, move, ctx);
  },

  processMove(
    state: SpyfallMasterState,
    move: GameMove,
    ctx: GameContext,
  ): MoveResult<SpyfallMasterState> {
    return processSpyfallMove(state, move, ctx);
  },

  getPlayerView(
    state: SpyfallMasterState,
    playerId: string,
    ctx: GameContext,
  ): SpyfallPlayerView {
    return projectPlayerView(state, playerId, ctx);
  },

  checkGameEnd(
    state: SpyfallMasterState,
    _ctx: GameContext,
  ) {
    if (state.phase !== SpyfallPhase.GAME_OVER || !state.gameOverData) {
      return null;
    }

    const winners =
      state.gameOverData.winner === 'SPY'
        ? [state.spyPlayerId]
        : state.playerOrder.filter((pid) => pid !== state.spyPlayerId);

    return {
      isEnded: true as const,
      winners,
      data: state.gameOverData,
    };
  },

  onTimerExpired(
    state: SpyfallMasterState,
    timerType: string,
    _ctx: GameContext,
  ): MoveResult<SpyfallMasterState> {
    if (timerType === 'round_timer') {
      return {
        success: true,
        newState: {
          ...state,
          phase: SpyfallPhase.GAME_OVER,
          gameOverData: {
            spyPlayerId: state.spyPlayerId,
            location: state.selectedLocation,
            winner: 'SPY',
            reason: "Time's up! The round has ended and the Spy was not caught.",
            roles: state.playerRoles,
          },
        },
      };
    }
    return { success: false, error: `Unknown timer: ${timerType}` };
  },

  onPlayerDisconnected(
    state: SpyfallMasterState,
    _playerId: string,
    _ctx: GameContext,
  ): MoveResult<SpyfallMasterState> {
    // Round state is preserved on player disconnect to support reconnection
    return { success: true, newState: state };
  },
};

export default spyfallGame;

// Re-export types
export type {
  SpyfallMasterState,
  SpyfallPlayerView,
  SpyfallSettings,
  SpyfallVotingState,
  SpyfallPlayerViewVoting,
  SpyfallGameOverData,
} from './state.js';
export { SpyfallPhase, SpyfallMoveType, DEFAULT_SPYFALL_SETTINGS } from './state.js';
export { LOCATIONS, getAllLocationNames } from './data/locations.js';
