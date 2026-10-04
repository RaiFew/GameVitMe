import { tabAmplitude } from './grid-layout.js';

/**
 * Tab geometry.
 *
 * The one rule that makes seams fit: a shared edge curve is generated once, per
 * boundary line, and read by both neighbours. Generating each piece's four edges
 * independently never fits, however carefully the mirroring is done.
 */
export interface EdgeTab {
  /** Peak bulge as a fraction of the cell's max amplitude. */
  depth: number;
  /** How late the curve leaves the edge line; controls the tab's roundness. */
  k: number;
}

/**
 * `vertical[i]` is the boundary line between columns i and i+1 and holds one tab
 * per row. `horizontal[i]` is between rows i and i+1 and holds one tab per column.
 */
export interface Boundaries {
  vertical: EdgeTab[][];
  horizontal: EdgeTab[][];
}

/** mulberry32 — the client regenerates identical geometry from `edgeSeed`. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildBoundaries(rows: number, cols: number, edgeSeed: number): Boundaries {
  const rand = seededRandom(edgeSeed);
  const make = (): EdgeTab => ({
    depth: 0.72 + rand() * 0.28,
    k: 0.28 + rand() * 0.18,
  });

  const vertical: EdgeTab[][] = [];
  for (let i = 0; i < cols - 1; i++) vertical.push(Array.from({ length: rows }, make));

  const horizontal: EdgeTab[][] = [];
  for (let i = 0; i < rows - 1; i++) horizontal.push(Array.from({ length: cols }, make));

  return { vertical, horizontal };
}

type Point = readonly [number, number];

/** Start, two controls, peak, two controls, end. Fixed length so both the
 *  indexing and the destructuring in `twoCubics` stay type-safe. */
export type TabCurve = [Point, Point, Point, Point, Point, Point, Point];

/**
 * The seven points of one tab (end, two controls, peak, two controls, end),
 * mapped onto the axis-aligned segment A→B and pushed `depth * amp` along
 * (nx, ny).
 *
 * `ts` is fixed at the midpoint peak and strictly increasing, and `offs` mirrors
 * it, so `ts[6-i] === 1 - ts[i]` and `offs[6-i] === offs[i]`. That symmetry is
 * load-bearing, not cosmetic: a closed outline makes two neighbours walk their
 * shared boundary in opposite directions, and only a symmetric parameterization
 * lands them on the identical curve. Asymmetric it would overlap on the tab and
 * gap beside it. The cost is that a tab is a symmetric knob; its irregularity
 * comes from per-tab `depth` and `k` instead.
 */
export function tabPoints(
  a: Point,
  b: Point,
  tab: EdgeTab,
  amp: number,
  nx: number,
  ny: number
): TabCurve {
  const { depth, k } = tab;
  const h = depth * amp;
  const ts = [0, 0.5 * k, k, 0.5, 1 - k, 1 - 0.5 * k, 1];
  const offs = [0, 0, 0.8 * h, h, 0.8 * h, 0, 0];

  const at = (i: number): Point => [
    a[0] + ts[i]! * (b[0] - a[0]) + nx * offs[i]!,
    a[1] + ts[i]! * (b[1] - a[1]) + ny * offs[i]!,
  ];

  return [at(0), at(1), at(2), at(3), at(4), at(5), at(6)];
}

function f(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Two cubics through the seven points of a tab. */
function twoCubics(pts: TabCurve): string {
  const [p0, c1, c2, m, c3, c4, p1] = pts;
  return (
    `M${f(p0[0])} ${f(p0[1])}` +
    `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(m[0])} ${f(m[1])}` +
    `C${f(c3[0])} ${f(c3[1])} ${f(c4[0])} ${f(c4[1])} ${f(p1[0])} ${f(p1[1])}`
  );
}

/** Straight segment, used for the picture's outer border. */
function line(a: Point, b: Point): string {
  return `L${f(b[0])} ${f(b[1])}`;
}

/**
 * The four edges of one piece. `null` means the picture's own border, which has
 * no neighbour and therefore no tab.
 *
 * This is projected to clients, because a piece's shape cannot be derived without
 * its solution cell — and the whole point of keeping `row`/`col` server-side is
 * that clients never get it. It leaks shape, not picture: the client still has to
 * work out where each piece belongs from the image itself.
 */
export interface PieceEdges {
  top: EdgeTab | null;
  right: EdgeTab | null;
  bottom: EdgeTab | null;
  left: EdgeTab | null;
}

export function pieceEdgesFor(
  b: Boundaries,
  r: number,
  c: number,
  rows: number,
  cols: number
): PieceEdges {
  return {
    top: r > 0 ? b.horizontal[r - 1]![c]! : null,
    right: c < cols - 1 ? b.vertical[c]![r]! : null,
    bottom: r < rows - 1 ? b.horizontal[r]![c]! : null,
    left: c > 0 ? b.vertical[c - 1]![r]! : null,
  };
}

/**
 * Outline of one piece in a box padded by `amp` on all four sides — the body sits
 * at [amp, amp, cellW, cellH]. Outward tabs reach the padding; a neighbour's tab
 * notches into the body, which is exactly the union of both pieces.
 */
export function pieceOutlinePath(
  edges: PieceEdges,
  cellWidth: number,
  cellHeight: number,
  amp: number
): string {
  const x0 = amp;
  const y0 = amp;
  const x1 = amp + cellWidth;
  const y1 = amp + cellHeight;

  const sides: { a: Point; b: Point; n: Point; tab: EdgeTab | null }[] = [
    // Clockwise from the top-left corner.
    //
    // The normal is canonical per boundary line — horizontal always pushes
    // +y, vertical always +x — rather than each piece's own outward direction.
    // A tab is a bump on the line, not a bump on the piece: giving both
    // neighbours their outward normal draws two opposing curves and the pieces
    // stop tiling.
    { a: [x0, y0], b: [x1, y0], n: [0, 1], tab: edges.top },
    { a: [x1, y0], b: [x1, y1], n: [1, 0], tab: edges.right },
    { a: [x1, y1], b: [x0, y1], n: [0, 1], tab: edges.bottom },
    { a: [x0, y1], b: [x0, y0], n: [1, 0], tab: edges.left },
  ];

  let d = '';
  let cursor: Point = [x0, y0];
  for (const side of sides) {
    d += `M${f(cursor[0])} ${f(cursor[1])}`;
    // twoCubics' own M becomes a L, so consecutive edges stay joined.
    if (side.tab) {
      d += twoCubics(tabPoints(side.a, side.b, side.tab, amp, side.n[0], side.n[1])).slice(1);
    } else {
      d += line(side.a, side.b);
    }
    cursor = side.b;
  }
  return d + 'Z';
}

/**
 * One stroke path per interior boundary span, for the board-level seam overlay.
 * The normal must be perpendicular to the boundary or the control points land on
 * the line and the "curve" collapses to a straight edge.
 */
export function seamPaths(
  rows: number,
  cols: number,
  cellWidth: number,
  cellHeight: number,
  amp: number,
  b: Boundaries
): string[] {
  const out: string[] = [];

  for (let i = 0; i < cols - 1; i++) {
    for (let r = 0; r < rows; r++) {
      const tab = b.vertical[i]?.[r];
      if (!tab) continue;
      const x = (i + 1) * cellWidth;
      out.push(
        twoCubics(
          tabPoints([x, r * cellHeight], [x, (r + 1) * cellHeight], tab, amp, 1, 0)
        )
      );
    }
  }

  for (let i = 0; i < rows - 1; i++) {
    for (let c = 0; c < cols; c++) {
      const tab = b.horizontal[i]?.[c];
      if (!tab) continue;
      const y = (i + 1) * cellHeight;
      out.push(
        twoCubics(
          tabPoints([c * cellWidth, y], [(c + 1) * cellWidth, y], tab, amp, 0, 1)
        )
      );
    }
  }

  return out;
}

export { tabAmplitude };

/** Tray slot of a piece id. Derived from the id, so it is never stored. */
export function traySlotOf(pieceId: string): number {
  return parseInt(pieceId.slice(1), 10);
}