/**
 * The difficulty picker promises an exact piece count, so the count is
 * non-negotiable and cell squareness is only a preference: a 4000x300 panorama at
 * 96 pieces has no square answer (13.33 aspect AND cols*rows=96 are jointly
 * unsatisfiable) and legitimately gets 32x3 cells.
 *
 * So enumerate the divisor pairs of the target and pick the one whose aspect is
 * closest to the image's, in log space so over- and under-shooting cost the same.
 */
export function computeGridLayout(
  imageWidth: number,
  imageHeight: number,
  targetPieces: number
): { cols: number; rows: number } {
  const n = Math.max(1, Math.round(targetPieces));
  const aspect = Math.log(imageWidth / Math.max(1, imageHeight));

  let best = { cols: n, rows: 1 };
  let bestCost = Infinity;

  for (let d = 1; d * d <= n; d++) {
    if (n % d !== 0) continue;
    const e = n / d;
    // Both orientations are candidates; the first one tried at a given cost is
    // the one with cols >= rows, so a square image lands on the wider one.
    for (const [cols, rows] of [
      [e, d],
      [d, e],
    ] as const) {
      const cost = Math.abs(Math.log(cols / rows) - aspect);
      if (cost < bestCost - 1e-12) {
        bestCost = cost;
        best = { cols, rows };
      }
    }
  }

  return best;
}

/**
 * Tabs stay inside a single cell, so the clip-path box is inflated by one
 * amplitude on every side. Kept at or below a quarter of the short cell side.
 */
export function tabAmplitude(cellWidth: number, cellHeight: number): number {
  return 0.22 * Math.min(cellWidth, cellHeight);
}