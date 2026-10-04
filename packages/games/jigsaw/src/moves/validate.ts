import type { GameMove } from '@party/game-engine';
import { clusterOf } from '../engine/clusters.js';
import type { JigsawMasterState } from '../types/index.js';
import { findUndoable } from './process.js';

export function validateJigsawMove(
  state: JigsawMasterState,
  move: GameMove
): { valid: boolean; reason?: string } {
  const player = state.players[move.playerId];
  if (!player) {
    return { valid: false, reason: 'Player not found in game.' };
  }

  const payload = (move.payload || {}) as Record<string, any>;

  switch (move.type) {
    case 'READY_UP': {
      if (state.phase !== 'READY') {
        return { valid: false, reason: 'The clock is already running.' };
      }
      if (player.isReady) {
        return { valid: false, reason: 'You are already ready.' };
      }
      return { valid: true };
    }

    case 'PLACE_PIECE': {
      if (state.phase !== 'PLAYING') {
        return { valid: false, reason: 'The puzzle is not being played yet.' };
      }
      const piece = state.pieces[payload.pieceId as string];
      if (!piece) {
        return { valid: false, reason: 'No such piece.' };
      }
      // Solved is not terminal. A correct piece can be picked up again — that
      // is what makes clusters worth building and what stops one mistaken drop
      // from permanently marring the picture.
      if (payload.zone === 'TRAY') return { valid: true };
      if (payload.zone !== 'BOARD') {
        return { valid: false, reason: 'Unknown drop zone.' };
      }
      const row = payload.row;
      const col = payload.col;
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return { valid: false, reason: 'Drop onto a board cell.' };
      }
      if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) {
        return { valid: false, reason: 'That cell is outside the board.' };
      }
      // The whole cluster travels with the grabbed piece, and `at` is a cell
      // index, so a cluster that would hang off the edge has nowhere to go. Refuse
      // the whole drop rather than move part of it and leave the rest behind.
      const dr = piece.at ? row - piece.at.r : 0;
      const dc = piece.at ? col - piece.at.c : 0;
      for (const id of clusterOf(state, piece.id)) {
        const member = state.pieces[id]!;
        if (!member.at) continue;
        const r = member.at.r + dr;
        const c = member.at.c + dc;
        if (r < 0 || c < 0 || r >= state.rows || c >= state.cols) {
          return { valid: false, reason: 'That group will not fit there.' };
        }
      }
      return { valid: true };
    }

    case 'ROTATE_PIECE': {
      if (state.phase !== 'PLAYING') {
        return { valid: false, reason: 'The puzzle is not being played yet.' };
      }
      const piece = state.pieces[payload.pieceId as string];
      if (!piece) {
        return { valid: false, reason: 'No such piece.' };
      }
      return { valid: true };
    }

    case 'UNDO': {
      if (state.phase !== 'PLAYING') {
        return { valid: false, reason: 'The puzzle is not being played yet.' };
      }
      // Scoped to the mover on purpose: undoing a placement is undoing your own
      // mistake, and one player silently reversing another's move in a co-op
      // puzzle is worse than leaving the mistake in place.
      if (!findUndoable(state, move.playerId)) {
        return { valid: false, reason: 'Nothing to undo.' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: `Unknown move type "${move.type}".` };
  }
}