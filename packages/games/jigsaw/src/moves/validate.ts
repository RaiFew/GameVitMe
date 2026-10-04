import type { GameMove } from '@party/game-engine';
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
      // Locked is terminal: once two neighbours are correct this piece can never
      // move again, so a rejected drop has to be refused rather than applied.
      if (piece.locked) {
        return { valid: false, reason: 'That piece is already locked in place.' };
      }
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