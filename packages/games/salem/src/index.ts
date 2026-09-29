import type {
  GameContext,
  GameDefinition,
  GameEndResult,
  GameMove,
  GameSettingsField,
  MoveResult,
} from '@party/game-engine';
import type { SalemMasterState, SalemPlayerView, SalemSettings } from './types/index.js';
import { validateSalemMove } from './moves/validate.js';
import { processSalemMove } from './moves/process.js';
import { projectSalemPlayerView } from './projection/player-view.js';

export * from './types/index.js';
export { resolveNight, type NightResolution } from './engine/night-resolution.js';

export const DEFAULT_SALEM_SETTINGS: SalemSettings = {
  minPlayers: 4,
  maxPlayers: 12,
};

export const salemGame: GameDefinition<
  SalemMasterState,
  SalemPlayerView,
  SalemSettings
> = {
  id: 'salem',
  name: 'Salem 1692',
  version: '2.0.0',
  minPlayers: 4,
  maxPlayers: 12,
  defaultSettings: DEFAULT_SALEM_SETTINGS,

  // Nothing is configurable: the Host prepares physical cards, so the app has
  // no role counts to calculate and no role slots to fill.
  settingsFields: [] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: SalemSettings): SalemMasterState {
    const hostPlayerId = (settings as any).hostPlayerId as string | undefined;

    return {
      phase: 'LOBBY',
      roundNumber: 0,
      hostPlayerId,
      hostMode: true,
      players: ctx.players.map((p, index) => {
        const isHost = !!hostPlayerId && p.id === hostPlayerId;
        return {
          id: p.id,
          seatNumber: p.seatNumber || index + 1,
          displayName: p.displayName,
          isConnected: p.isConnected,
          isAlive: true,
          isHost,
          canPlay: !isHost,
        };
      }),
      night: {
        witchTargetPlayerId: null,
        constableProtectionPlayerId: null,
        claims: {},
        result: null,
        deadPlayerIds: [],
      },
      deaths: [],
      gameOverData: null,
    };
  },

  getCurrentPhase(state: SalemMasterState): string {
    return state.phase;
  },

  validateMove(
    state: SalemMasterState,
    move: GameMove,
    _ctx: GameContext
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
    _ctx: GameContext
  ): SalemPlayerView {
    return projectSalemPlayerView(state, playerId);
  },

  checkGameEnd(state: SalemMasterState): GameEndResult | null {
    if (state.phase !== 'GAME_OVER' || !state.gameOverData) return null;
    return {
      isEnded: true,
      winners: state.gameOverData.survivors,
      data: {
        roundsPlayed: state.gameOverData.roundsPlayed,
        deaths: state.deaths.length,
      },
    };
  },
};

export default salemGame;
