import { buildBoundaries, pieceEdgesFor, type PieceEdges } from '../engine/edges.js';
import type { JigsawMasterState, JigsawPieceView, JigsawPlayerView } from '../types/index.js';

/**
 * Strips the solution. `row` and `col` exist only in master state — the client
 * learns where a piece *is* from `at: { r, c }`, never where it belongs.
 *
 * What does go out per piece is its jigsaw outline and its patch of the picture.
 * Neither is optional: an outline cannot be built without the piece's cell, and
 * a real jigsaw piece shows you its own face. A client holding these can
 * reassemble the picture — which is what playing jigsaw *is* — but it still has
 * to do the assembly, and placement stays server-owned: nothing here lets a
 * client place a piece without the server agreeing.
 */
export function projectJigsawPlayerView(
  state: JigsawMasterState,
  playerId: string,
  now: number = Date.now()
): JigsawPlayerView {
  const boundaries = buildBoundaries(state.rows, state.cols, state.edgeSeed);
  const imageWidth = state.settings.imageWidth ?? 1200;
  const imageHeight = state.settings.imageHeight ?? 800;
  const cellW = imageWidth / state.cols;
  const cellH = imageHeight / state.rows;

  const pieces: Record<string, JigsawPieceView> = {};
  for (const [id, p] of Object.entries(state.pieces)) {
    pieces[id] = {
      id: p.id,
      zone: p.zone,
      at: p.at,
      locked: p.locked,
      placedByPlayerId: p.placedByPlayerId,
      edges: pieceEdgesFor(boundaries, p.row, p.col, state.rows, state.cols),
      src: { x: p.col * cellW, y: p.row * cellH, w: cellW, h: cellH },
    };
  }

  return {
    phase: state.phase,
    imageId: state.settings.imageId,
    imageWidth: state.settings.imageWidth ?? 1200,
    imageHeight: state.settings.imageHeight ?? 800,
    cols: state.cols,
    rows: state.rows,
    pieceCount: state.cols * state.rows,
    edgeSeed: state.edgeSeed,
    pieces,
    players: Object.values(state.players).map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      piecesPlaced: p.piecesPlaced,
      isReady: p.isReady,
    })),
    lockedCount: state.lockedCount,
    totalToLock: state.cols * state.rows,
    me: state.players[playerId] ?? null,
    serverNow: now,
    startedAtMs: state.startedAtMs,
    finishedAtMs: state.finishedAtMs,
    result: state.result,
  };
}