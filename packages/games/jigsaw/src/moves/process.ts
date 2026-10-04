import type { GameContext, GameMove, MoveResult } from '@party/game-engine';
import { clusterOf } from '../engine/clusters.js';
import type {
  JigsawHistoryEntry,
  JigsawMasterState,
  JigsawPieceState,
  JigsawZone,
} from '../types/index.js';

/** ponytail: 100 entries is far more undo depth than anyone presses in a game. */
const HISTORY_LIMIT = 100;

/** Solved means home cell AND unrotated — both, or the picture does not read. */
const isSolved = (p: JigsawPieceState, zone: JigsawZone, at: { r: number; c: number } | null) =>
  zone === 'BOARD' && at !== null && at.r === p.row && at.c === p.col && p.rot === 0;

/**
 * The newest entry of `playerId`'s that still describes its pieces' current
 * position. An entry goes stale the moment any of its pieces moves again, and
 * restoring past that would teleport a piece over someone else's work — so the
 * scan skips those rather than guessing.
 *
 * Every member has to match, not just the grabbed one: undo has to put a whole
 * cluster back at once, and a partial restore would tear it in half.
 */
export function findUndoable(
  state: JigsawMasterState,
  playerId: string
): { entry: JigsawHistoryEntry; index: number } | null {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const entry = state.history[i]!;
    if (entry.playerId !== playerId) continue;
    const live = entry.moved.every(({ pieceId, next }) => {
      const piece = state.pieces[pieceId];
      if (!piece) return false;
      return (
        piece.zone === next.zone && piece.at?.r === next.at?.r && piece.at?.c === next.at?.c
      );
    });
    if (live) return { entry, index: i };
  }
  return null;
}

/** Older entries touching the same pieces are dead the moment this one lands. */
function pushHistory(
  history: JigsawHistoryEntry[],
  entry: JigsawHistoryEntry
): JigsawHistoryEntry[] {
  const touched = new Set(entry.moved.map((m) => m.pieceId));
  return [
    ...history.filter((h) => !h.moved.some((m) => touched.has(m.pieceId))),
    entry,
  ].slice(-HISTORY_LIMIT);
}

export function processJigsawMove(
  state: JigsawMasterState,
  move: GameMove,
  _ctx: GameContext
): MoveResult<JigsawMasterState> {
  const payload = (move.payload || {}) as Record<string, any>;
  const now = move.timestamp || Date.now();

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
          startedAtMs: allReady ? now : null,
        },
      };
    }

    case 'PLACE_PIECE': {
      const grabbed = state.pieces[payload.pieceId as string]!;
      const me = state.players[move.playerId]!;
      const toTray = payload.zone === 'TRAY';
      const row = toTray ? null : (payload.row as number);
      const col = toTray ? null : (payload.col as number);

      // Dragging a solved piece drags everything it is joined to. This is why
      // validate rejects a drop whose whole cluster would not fit: `at` is a
      // cell index, so a cluster hanging off the edge has no representation and
      // moving it partially would be the same as scrambling it.
      const cluster = clusterOf(state, grabbed.id);
      const dr = toTray || !grabbed.at ? 0 : row! - grabbed.at.r;
      const dc = toTray || !grabbed.at ? 0 : col! - grabbed.at.c;

      const pieces = { ...state.pieces };
      const moved: JigsawHistoryEntry['moved'] = [];
      let solvedDelta = 0;
      let newlySolved = 0;

      for (const id of cluster) {
        const piece = state.pieces[id]!;
        const at = toTray ? null : { r: (piece.at?.r ?? row!) + dr, c: (piece.at?.c ?? col!) + dc };
        const solved = isSolved(piece, toTray ? 'TRAY' : 'BOARD', at);
        if (solved !== piece.solved) {
          solvedDelta += solved ? 1 : -1;
          if (solved) newlySolved += 1;
        }
        pieces[id] = {
          ...piece,
          zone: toTray ? 'TRAY' : 'BOARD',
          at,
          solved,
          placedByPlayerId: solved ? move.playerId : piece.placedByPlayerId,
          placedAtMs: solved ? now : piece.placedAtMs,
        };
        moved.push({
          pieceId: id,
          previous: { zone: piece.zone, at: piece.at },
          next: { zone: toTray ? 'TRAY' : 'BOARD', at },
        });
      }

      const solvedCount = state.solvedCount + solvedDelta;
      const next: JigsawMasterState = {
        ...state,
        pieces,
        history: pushHistory(state.history, {
          moved,
          playerId: move.playerId,
          timestamp: now,
          actionType: 'PLACE_PIECE',
        }),
        solvedCount,
        players:
          newlySolved > 0
            ? { ...state.players, [move.playerId]: { ...me, piecesPlaced: me.piecesPlaced + newlySolved } }
            : state.players,
      };

      // processMove is synchronous, so exactly one move can reach this branch.
      if (solvedCount === state.cols * state.rows) {
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

    case 'ROTATE_PIECE': {
      const piece = state.pieces[payload.pieceId as string]!;
      const me = state.players[move.playerId]!;
      const rot = ((piece.rot + 1) % 4) as JigsawPieceState['rot'];
      // Turning a piece out of place is what makes it unsolved, which is what
      // takes it out of its cluster — the rest of the cluster stays put.
      const solved = isSolved({ ...piece, rot }, piece.zone, piece.at);
      const solvedDelta = solved === piece.solved ? 0 : solved ? 1 : -1;

      return {
        success: true,
        newState: {
          ...state,
          pieces: {
            ...state.pieces,
            [piece.id]: {
              ...piece,
              rot,
              solved,
              placedByPlayerId: solved ? move.playerId : piece.placedByPlayerId,
              placedAtMs: solved ? now : piece.placedAtMs,
            },
          },
          solvedCount: state.solvedCount + solvedDelta,
          players:
            solvedDelta > 0
              ? { ...state.players, [move.playerId]: { ...me, piecesPlaced: me.piecesPlaced + 1 } }
              : state.players,
          // Deliberately no history entry. An entry here would carry the piece's
          // position unchanged, so undoing it would visibly do nothing while
          // shadowing the placement underneath it that undo would actually want.
        },
      };
    }

    case 'UNDO': {
      // Same scan the validator ran. It cannot have gone stale in between:
      // processMove is synchronous, so nothing else touched the state.
      const found = findUndoable(state, move.playerId);
      if (!found) {
        return { success: false, error: 'Nothing to undo.' };
      }
      const { entry, index } = found;
      const pieces = { ...state.pieces };
      let solvedDelta = 0;
      for (const { pieceId, previous } of entry.moved) {
        const piece = pieces[pieceId]!;
        const solved = isSolved(piece, previous.zone, previous.at);
        if (solved !== piece.solved) solvedDelta += solved ? 1 : -1;
        pieces[pieceId] = { ...piece, zone: previous.zone, at: previous.at, solved };
      }
      return {
        success: true,
        newState: {
          ...state,
          pieces,
          // The tail is the live stack, so dropping the entry is the whole undo
          // bookkeeping. Player credit is not reversed: a piece someone placed
          // still counts as placed even when it is taken back.
          solvedCount: state.solvedCount + solvedDelta,
          history: state.history.filter((_, i) => i !== index),
        },
      };
    }

    default:
      return { success: false, error: `Unhandled move: ${move.type}` };
  }
}