import type {
  GameDefinition,
  GameContext,
  GameMove,
  MoveResult,
  GameSettingsField,
  GameEndResult,
} from '@party/game-engine';
import type {
  CodenamesMasterState,
  CodenamesPlayerView,
  CodenamesSettings,
  TeamColor,
} from './types/index.js';
import { DEFAULT_CODENAMES_DICTIONARY } from './data/default-words.js';
import { validateCodenamesMove, processCodenamesMove } from './moves/index.js';
import { projectCodenamesPlayerView } from './projection/player-view.js';

export * from './types/index.js';
export * from './data/default-words.js';
export * from './data/word-file-parser.js';
export * from './engine/board-generator.js';

export const DEFAULT_CODENAMES_SETTINGS: CodenamesSettings = {
  hostMode: false,
  gameMode: 'CLASSIC',
  wordSource: 'DEFAULT',
  roundDurationSeconds: 120,
};

export const codenamesGame: GameDefinition<
  CodenamesMasterState,
  CodenamesPlayerView,
  CodenamesSettings
> = {
  id: 'codenames',
  name: 'Codenames',
  version: '1.0.0',
  minPlayers: 2,
  maxPlayers: 20,
  defaultSettings: DEFAULT_CODENAMES_SETTINGS,

  settingsFields: [
    {
      key: 'wordSource',
      label: 'Word Source',
      type: 'select',
      default: 'DEFAULT',
      options: [
        { label: 'Default Words (Built-in)', value: 'DEFAULT' },
        { label: 'My Word Files (Custom)', value: 'CUSTOM' },
      ],
      description: 'Choose whether to play with built-in words or an uploaded custom word file',
    },
    {
      key: 'roundDurationSeconds',
      label: 'Turn Timer (Seconds)',
      type: 'number',
      default: 120,
      min: 30,
      max: 600,
      description: 'Time limit per turn (clue and guessing)',
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: CodenamesSettings): CodenamesMasterState {
    const hostPlayerId = settings.hostPlayerId || (ctx as any).hostPlayerId || ctx.players[0]?.id || '';
    const gameMode = settings.gameMode === 'TWO_PLAYER' ? 'TWO_PLAYER' : 'CLASSIC';
    const isTwoPlayer = gameMode === 'TWO_PLAYER';

    // Snapshot the word pool:
    // If settings has a custom wordPoolSnapshot with >= 25 words, use it.
    // Otherwise, copy the built-in dictionary.
    const wordPoolSnapshot =
      Array.isArray(settings.wordPoolSnapshot) && settings.wordPoolSnapshot.length >= 25
        ? [...settings.wordPoolSnapshot]
        : [...DEFAULT_CODENAMES_DICTIONARY.words];

    const players = ctx.players.map((p, idx) => ({
      id: p.id,
      displayName: p.displayName,
      seatNumber: p.seatNumber,
      isConnected: p.isConnected,
      team: isTwoPlayer ? ('RED' as TeamColor) : (null as TeamColor | null),
      role: isTwoPlayer
        ? (idx === 0 ? ('SPYMASTER' as any) : ('OPERATIVE' as any))
        : (null as any),
      isHost: p.id === hostPlayerId,
    }));

    return {
      phase: 'TEAM_SETUP',
      gameMode,
      roomId: ctx.roomId,
      hostPlayerId,
      players,
      startingTeam: 'RED',
      currentTeam: 'RED',
      currentClue: null,
      guessesRemaining: 0,
      guessesMadeInTurn: 0,
      cards: [],
      redRemaining: 9,
      blueRemaining: 8,
      mistakesMade: 0,
      winner: null,
      wordSource: settings.wordSource || 'DEFAULT',
      wordFileId: settings.wordFileId,
      wordPoolSnapshot,
      turnNumber: 1,
      history: [],
    };
  },

  getCurrentPhase(state: CodenamesMasterState): string {
    return state.phase;
  },

  validateMove(state: CodenamesMasterState, move: GameMove, ctx: GameContext) {
    return validateCodenamesMove(state, move, ctx);
  },

  processMove(
    state: CodenamesMasterState,
    move: GameMove,
    ctx: GameContext
  ): MoveResult<CodenamesMasterState> {
    return processCodenamesMove(state, move, ctx);
  },

  getPlayerView(
    state: CodenamesMasterState,
    playerId: string,
    ctx: GameContext
  ): CodenamesPlayerView {
    return projectCodenamesPlayerView(state, playerId, ctx);
  },

  checkGameEnd(state: CodenamesMasterState, ctx: GameContext): GameEndResult | null {
    if (state.phase !== 'GAME_OVER' && state.winner === null && !state.winReason) {
      return null;
    }

    if (state.gameMode === 'TWO_PLAYER') {
      const isWon = state.winner === 'RED' || state.winReason === 'ALL_CARDS_FOUND';
      const winners = isWon ? state.players.map((p) => p.id) : [];

      return {
        isEnded: true,
        winners,
        data: {
          gameMode: 'TWO_PLAYER',
          isWon,
          winnerTeam: state.winner,
          winReason: state.winReason,
          friendlyRemaining: state.redRemaining,
          mistakesMade: state.mistakesMade,
          turnsPlayed: state.turnNumber,
        },
      };
    }

    const winnerPlayers = state.players
      .filter((p) => p.team === state.winner)
      .map((p) => p.id);

    return {
      isEnded: true,
      winners: winnerPlayers,
      data: {
        gameMode: 'CLASSIC',
        winnerTeam: state.winner,
        winReason: state.winReason,
        redRemaining: state.redRemaining,
        blueRemaining: state.blueRemaining,
        turnsPlayed: state.turnNumber,
      },
    };
  },
};

export default codenamesGame;
