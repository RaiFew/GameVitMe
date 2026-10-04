import type {
  GameContext,
  GameDefinition,
  GameMove,
  GameSettingsField,
  MoveResult,
} from '@party/game-engine';
import {
  PIECES_BY_DIFFICULTY,
  type JigsawDifficulty,
  type JigsawMasterState,
  type JigsawPieceState,
  type JigsawPlayerView,
  type JigsawSettings,
} from './types/index.js';
import { computeGridLayout } from './engine/grid-layout.js';
import { validateJigsawMove } from './moves/validate.js';
import { processJigsawMove } from './moves/process.js';
import { projectJigsawPlayerView } from './projection/player-view.js';

export * from './types/index.js';
export * from './engine/edges.js';
export { computeGridLayout, tabAmplitude } from './engine/grid-layout.js';

export const DEFAULT_JIGSAW_SETTINGS: JigsawSettings = {
  imageId: null,
  imageWidth: null,
  imageHeight: null,
  difficulty: 'NORMAL',
  pieceCount: PIECES_BY_DIFFICULTY.NORMAL,
};

export const jigsawGame: GameDefinition<
  JigsawMasterState,
  JigsawPlayerView,
  JigsawSettings
> = {
  id: 'jigsaw',
  name: 'Jigsaw Puzzle',
  version: '1.0.0',
  // Co-op against a clock, so a solo run is a legitimate game and there is no
  // upper bound worth enforcing.
  minPlayers: 1,
  maxPlayers: 20,
  defaultSettings: DEFAULT_JIGSAW_SETTINGS,
  settingsFields: [
    {
      key: 'difficulty',
      label: 'Pieces',
      type: 'select',
      default: 'NORMAL',
      options: (Object.keys(PIECES_BY_DIFFICULTY) as JigsawDifficulty[]).map((d) => ({
        label: `${d[0]}${d.slice(1).toLowerCase()} — ${PIECES_BY_DIFFICULTY[d]} pieces`,
        value: d,
      })),
    },
  ] satisfies GameSettingsField[],

  setup(ctx: GameContext, settings: JigsawSettings): JigsawMasterState {
    const pieceCount = settings.pieceCount || PIECES_BY_DIFFICULTY[settings.difficulty];
    const { cols, rows } = computeGridLayout(
      settings.imageWidth ?? 1200,
      settings.imageHeight ?? 800,
      pieceCount
    );

    // Shuffle FIRST, then number. Numbering the cells and shuffling the array
    // would make `p47` mean cell 47, and the client could render the whole
    // solution without ever being sent `row`/`col`.
    const cells = Array.from({ length: cols * rows }, (_, i) => ({
      row: Math.floor(i / cols),
      col: i % cols,
    }));
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(ctx.random() * (i + 1));
      const tmp = cells[i]!;
      cells[i] = cells[j]!;
      cells[j] = tmp;
    }

    const pieces: Record<string, JigsawPieceState> = {};
    cells.forEach((cell, i) => {
      pieces[`p${i}`] = { id: `p${i}`, ...cell, zone: 'TRAY', at: null, locked: false, placedByPlayerId: null, placedAtMs: null };
    });

    return {
      phase: 'READY',
      settings,
      cols,
      rows,
      edgeSeed: Math.floor(ctx.random() * 2 ** 31),
      pieces,
      players: Object.fromEntries(
        ctx.players.map((p) => [
          p.id,
          {
            playerId: p.id,
            displayName: p.displayName,
            piecesPlaced: 0,
            isReady: false,
            isConnected: p.isConnected,
          },
        ])
      ),
      lockedCount: 0,
      startedAtMs: null,
      finishedAtMs: null,
      result: null,
    };
  },

  getCurrentPhase(state) {
    return state.phase;
  },

  validateMove(state, move: GameMove) {
    return validateJigsawMove(state, move);
  },

  processMove(state, move, ctx): MoveResult<JigsawMasterState> {
    return processJigsawMove(state, move, ctx);
  },

  getPlayerView(state, playerId) {
    return projectJigsawPlayerView(state, playerId);
  },

  checkGameEnd(state) {
    if (state.phase !== 'COMPLETED' || !state.result) return null;
    return {
      isEnded: true as const,
      // Co-op: everyone who sat the puzzle down is a winner.
      winners: Object.keys(state.players),
      scoreSummary: state.result.piecesByPlayer,
      data: { elapsedMs: state.result.elapsedMs, pieceCount: state.cols * state.rows },
    };
  },
};

export default jigsawGame;