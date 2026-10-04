export type JigsawDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';

export const PIECES_BY_DIFFICULTY: Record<JigsawDifficulty, number> = {
  EASY: 12,
  NORMAL: 24,
  HARD: 48,
  EXPERT: 96,
};

import type { PieceEdges } from '../engine/edges.js';

export type JigsawPhase = 'READY' | 'PLAYING' | 'COMPLETED';

export type JigsawZone = 'TRAY' | 'BOARD';

/**
 * MASTER ONLY. `row`/`col` is the piece's home cell in the solved picture and is
 * never projected — it is the entire answer. The projection uses `at: { r, c }`
 * for where a player actually dropped the piece, so a view containing `row`
 * means the projection leaked.
 */
export interface JigsawPieceState {
  /** 'p0'..'pN-1', assigned in shuffled tray order — see `setup`. */
  id: string;
  row: number;
  col: number;
  zone: JigsawZone;
  at: { r: number; c: number } | null;
  locked: boolean;
  placedByPlayerId: string | null;
  placedAtMs: number | null;
}

export interface JigsawPlayerState {
  playerId: string;
  displayName: string;
  piecesPlaced: number;
  isReady: boolean;
  isConnected: boolean;
}

export interface JigsawSettings {
  imageId: string | null;
  /** Real decoded dimensions of the stored image, injected by the server at start. */
  imageWidth: number | null;
  imageHeight: number | null;
  difficulty: JigsawDifficulty;
  /** Resolved from `difficulty`; the server writes the same number. */
  pieceCount: number;
  hostMode?: boolean;
  hostPlayerId?: string;
}

export interface JigsawPosition {
  zone: JigsawZone;
  at: { r: number; c: number } | null;
}

/**
 * One undoable placement. MASTER ONLY — `previous` is the answer to "where did
 * this piece come from", which is exactly what a client needs to reconstruct it.
 * Only the derived `canUndo` flag goes out.
 */
export interface JigsawHistoryEntry {
  pieceId: string;
  previous: JigsawPosition;
  next: JigsawPosition;
  playerId: string;
  timestamp: number;
  actionType: 'PLACE_PIECE';
}

export interface JigsawMasterState {
  phase: JigsawPhase;
  settings: JigsawSettings;
  cols: number;
  rows: number;
  /** Regenerates identical tab geometry on every client. */
  edgeSeed: number;
  pieces: Record<string, JigsawPieceState>;
  players: Record<string, JigsawPlayerState>;
  /**
   * Newest last. An entry is dropped the moment it stops being undoable — when
   * its piece locks, or when the piece moves again — so the tail of this array
   * is always the live undo stack. ponytail: capped at HISTORY_LIMIT; a room
   * that needs deeper undo than that wants a redo log, not a bigger array.
   */
  history: JigsawHistoryEntry[];
  lockedCount: number;
  startedAtMs: number | null;
  finishedAtMs: number | null;
  result: { elapsedMs: number; piecesByPlayer: Record<string, number> } | null;
}

export interface JigsawPieceView {
  id: string;
  zone: JigsawZone;
  /** Where it currently sits. Deliberately `r`/`c`, not `row`/`col`. */
  at: { r: number; c: number } | null;
  locked: boolean;
  placedByPlayerId: string | null;
  /** Shape only — see the note on the projection. */
  edges: PieceEdges;
  /**
   * The patch of the picture this piece is cut from, in image pixels. A jigsaw
   * piece's face is visible in the real world; without it the tray would be
   * blank shapes and there would be nothing to match. `x`/`y`/`w`/`h`, never
   * `row`/`col`.
   */
  src: { x: number; y: number; w: number; h: number };
}

export interface JigsawPlayerView {
  phase: JigsawPhase;
  imageId: string | null;
  imageWidth: number;
  imageHeight: number;
  cols: number;
  rows: number;
  pieceCount: number;
  edgeSeed: number;
  /** Same for every player, by construction: tray order is the numeric part of the id. */
  pieces: Record<string, JigsawPieceView>;
  players: { playerId: string; displayName: string; piecesPlaced: number; isReady: boolean }[];
  lockedCount: number;
  totalToLock: number;
  /** True when this player has a placement of their own still undoable. */
  canUndo: boolean;
  me: JigsawPlayerState | null;
  /** Server clock, so elapsed time never depends on a client's own. */
  serverNow: number;
  startedAtMs: number | null;
  finishedAtMs: number | null;
  result: JigsawMasterState['result'];
}