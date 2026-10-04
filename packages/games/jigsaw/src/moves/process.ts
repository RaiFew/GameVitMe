import type { GameContext, GameMove, MoveResult } from '@party/game-engine';
import type { JigsawHistoryEntry, JigsawMasterState, JigsawPosition } from '../types/index.js';

/** ponytail: 100 entries is far more undo depth than anyone presses in a game. */
const HISTORY_LIMIT = 100;

const samePosition = (a: JigsawPosition, b: JigsawPosition) =>
  a.zone === b.zone && a.at?.r === b.at?.r && a.at?.c === b.at?.c;

/**
 * The newest entry of `playerId`'s that still describes the piece's current
 * position. An entry goes stale the moment its piece locks or moves again, and
 * restoring past that would teleport a piece over someone else's work — so the
 * scan skips them rather than guessing.
 */
export function findUndoable(
  state: JigsawMasterState,
  playerId: string
): { entry: JigsawHistoryEntry; index: number } | null {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const entry = state.history[i]!;
    if (entry.playerId !== playerId) continue;
    const piece = state.pieces[entry.pieceId];
    if (!piece || piece.locked) continue;
    if (!samePosition({ zone: piece.zone, at: piece.at }, entry.next)) continue;
    return { entry, index: i };
  }
  return null;
}

export function processJigsawMove(
  state: JigsawMasterState,
  move: GameMove,
  _ctx: GameContext
): MoveResult<JigsawMasterState> {
  const payload = (move.payload || {}) as Record<string, any>;

  switch (move.type) {
    case 'READY_UP': {
      const me = state.players[move.playerId]!;
      const players = { ...state.players, [move.playerId]: { ...me, isReady: true } };
      const allReady = Object.values(players).every((p) => p.isReady);
      return {
        success: true,
        newState: {
          ...state,
          players,
          // The last player in starts the clock. setup() already ran, so the
          // image is on the server and every client has decoded it by now.
          phase: allReady ? 'PLAYING' : 'READY',
          startedAtMs: allReady ? move.timestamp || Date.now() : null,
        },
      };
    }

    case 'PLACE_PIECE': {
      const piece = state.pieces[payload.pieceId as string]!;
      const me = state.players[move.playerId]!;
      const toTray = payload.zone === 'TRAY';
      const row = toTray ? null : (payload.row as number);
      const col = toTray ? null : (payload.col as number);
      const locked = !toTray && row === piece.row && col === piece.col;
      const now = move.timestamp || Date.now();

      const pieces = {
        ...state.pieces,
        [piece.id]: {
          ...piece,
          zone: toTray ? ('TRAY' as const) : ('BOARD' as const),
          at: toTray ? null : { r: row!, c: col! },
          locked,
          placedByPlayerId: locked ? move.playerId : piece.placedByPlayerId,
          placedAtMs: locked ? now : piece.placedAtMs,
        },
      };
      const lockedCount = state.lockedCount + (locked && !piece.locked ? 1 : 0);

      const previous: JigsawPosition = { zone: piece.zone, at: piece.at };

      // A move never records an undo for itself when it locks: locked is
      // terminal, so a placement that locks has nothing to take back. Any older
      // entry for the same piece is dropped for the same reason.
      const history = locked
        ? state.history.filter((h) => h.pieceId !== piece.id)
        : [
            ...state.history.filter((h) => h.pieceId !== piece.id),
            {
              pieceId: piece.id,
              previous,
              next: { zone: toTray ? ('TRAY' as const) : ('BOARD' as const), at: toTray ? null : { r: row!, c: col! } },
              playerId: move.playerId,
              timestamp: now,
              actionType: 'PLACE_PIECE' as const,
            },
          ].slice(-HISTORY_LIMIT);

      const next: JigsawMasterState = {
        ...state,
        pieces,
        history,
        lockedCount,
        players: locked
          ? { ...state.players, [move.playerId]: { ...me, piecesPlaced: me.piecesPlaced + 1 } }
          : state.players,
      };

      // processMove is synchronous, so exactly one move can reach this branch.
      if (lockedCount === state.cols * state.rows) {
        const finishedAtMs = now;
        return {
          success: true,
          newState: {
            ...next,
            phase: 'COMPLETED',
            finishedAtMs,
            result: {
              elapsedMs: finishedAtMs - (state.startedAtMs ?? finishedAtMs),
              piecesByPlayer: Object.fromEntries(
                Object.values(next.players).map((p) => [p.playerId, p.piecesPlaced])
              ),
            },
          },
        };
      }

      return { success: true, newState: next };
    }

    case 'UNDO': {
      // Same scan the validator ran. It cannot have gone stale in between:
      // processMove is synchronous, so nothing else touched the state.
      const found = findUndoable(state, move.playerId);
      if (!found) {
        return { success: false, error: 'Nothing to undo.' };
      }
      const { entry, index } = found;
      const piece = state.pieces[entry.pieceId]!;
      return {
        success: true,
        newState: {
          ...state,
          pieces: {
            ...state.pieces,
            [piece.id]: { ...piece, zone: entry.previous.zone, at: entry.previous.at },
          },
          history: state.history.filter((_, i) => i !== index),
        },
      };
    }

    default:
      return { success: false, error: `Unhandled move: ${move.type}` };
  }
}
