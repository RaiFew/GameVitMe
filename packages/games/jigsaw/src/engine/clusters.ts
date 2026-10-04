import type { JigsawMasterState, JigsawPieceState } from '../types/index.js';

/**
 * Every piece that travels with `pieceId` when it is picked up: itself plus any
 * solved piece touching it orthogonally, transitively.
 *
 * A piece is in a cluster exactly when it is solved, which means membership *is*
 * the solution — so this runs on the server and never goes into a player view.
 * The client is told which single piece it grabbed; what follows is the
 * broadcast.
 *
 * Solved pieces sit on their home cells, so walking `solved` pieces by grid
 * adjacency is walking the assembled picture. No piece geometry is involved, and
 * a diagonal neighbour does not count: two pieces meeting at a corner are held
 * together by neither tab nor clip.
 */
export function clusterOf(state: JigsawMasterState, pieceId: string): string[] {
  const start = state.pieces[pieceId];
  if (!start?.at || !start.solved) return [pieceId];

  // Cell index over every solved piece, so the walk is a hash lookup per
  // neighbour rather than a scan of all 192 pieces.
  const byCell = new Map<string, JigsawPieceState>();
  for (const piece of Object.values(state.pieces)) {
    if (piece.solved && piece.at) byCell.set(`${piece.at.r}|${piece.at.c}`, piece);
  }

  const found = new Set<string>([pieceId]);
  const queue: JigsawPieceState[] = [start];
  while (queue.length > 0) {
    const at = queue.pop()!.at!;
    for (const [r, c] of [
      [at.r - 1, at.c],
      [at.r + 1, at.c],
      [at.r, at.c - 1],
      [at.r, at.c + 1],
    ]) {
      const next = byCell.get(`${r}|${c}`);
      if (next && !found.has(next.id)) {
        found.add(next.id);
        queue.push(next);
      }
    }
  }
  return [...found];
}