import type { GameContext, GameMove, MoveResult } from '@party/game-engine';
import type { JigsawMasterState } from '../types/index.js';

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

      const next: JigsawMasterState = {
        ...state,
        pieces,
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

    default:
      return { success: false, error: `Unhandled move: ${move.type}` };
  }
}
