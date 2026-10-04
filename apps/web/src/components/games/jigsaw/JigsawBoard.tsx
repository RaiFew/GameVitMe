import { useMemo } from 'react';
import type { JigsawPieceView } from '@party/jigsaw';
import { buildBoundaries, seamPaths, tabAmplitude } from '@party/jigsaw';
import { JigsawPiece } from './JigsawPiece';
import type { SrcRect } from './usePieceDrag';

interface Props {
  pieces: JigsawPieceView[];
  cols: number;
  rows: number;
  edgeSeed: number;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onPointerDown: (e: React.PointerEvent, id: string, src: SrcRect, rot: number) => void;
  onPointerMove: (e: React.PointerEvent, id: string, src: SrcRect) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  /** Right-click turns a piece. Desktop only; touch uses the rotate button. */
  onRotate: (e: React.MouseEvent, id: string) => void;
}

/**
 * Solved pieces are drawn as one picture, not as pieces. Because the tabs
 * interlock, the union of their plain rectangles is the whole picture with no
 * gaps, so a solved piece is indistinguishable from a clipped one. What they
 * cannot be is `pointer-events: none` any more: a solved piece is grabbable, so
 * the puzzle can be taken apart and clusters can be slid around.
 *
 * Hence the invisible `<rect>` per solved cell. That keeps the cheap tier — one
 * `clipPath`, one `<image>`, whatever the piece count — and adds only a rect per
 * solved piece to make it draggable. The rect is its own cell rather than the
 * tabbed outline: an outline would need 192 more paths, and dragging by the
 * cell body is what a player aims at anyway.
 *
 * The crop cannot come from the `<image>` rect: an SVG `<image>` fits the whole
 * source into whatever x/y/width/height it is given, so a cell-sized rect drew a
 * shrunken copy of the entire picture in every cell. The picture is therefore
 * drawn once at full size and clipped to the union of the solved cells.
 */
export function JigsawBoard({
  pieces,
  cols,
  rows,
  edgeSeed,
  imageSrc,
  imageWidth,
  imageHeight,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRotate,
}: Props) {
  const cellW = imageWidth / cols;
  const cellH = imageHeight / rows;
  const amp = tabAmplitude(cellW, cellH);

  const solved = pieces.filter((p) => p.solved);
  const loose = pieces.filter((p) => p.zone === 'BOARD' && !p.solved);

  /**
   * Seams are drawn only where both sides are placed, so the grid grows with the
   * puzzle and the player can see what is done without comparing counts.
   */
  const seams = useMemo(() => {
    const placed = new Set(solved.map((p) => `${p.src.y / cellH}|${p.src.x / cellW}`));
    const done = (r: number, c: number) => placed.has(`${r}|${c}`);
    const all = seamPaths(rows, cols, cellW, cellH, amp, buildBoundaries(rows, cols, edgeSeed));
    // `seamPaths` emits the vertical spans first — `cols - 1` boundary lines of
    // `rows` each — then the horizontal. Reordering it would silently move every
    // seam, so this index arithmetic is bound to that contract.
    const vCount = (cols - 1) * rows;
    return all.filter((_, i) => {
      if (i < vCount) {
        const line = Math.floor(i / rows);
        const r = i % rows;
        return done(r, line) && done(r, line + 1);
      }
      const j = i - vCount;
      const line = Math.floor(j / cols);
      const c = j % cols;
      return done(line, c) && done(line + 1, c);
    });
  }, [solved, cols, rows, edgeSeed, cellW, cellH, amp]);

  return (
    <div
      data-jigsaw-board
      className="w-full max-w-3xl mx-auto select-none touch-none border border-rule rounded-xs bg-canvas-sunk overflow-hidden"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <svg
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        className="w-full h-full block text-ink/15 overflow-visible"
      >
        {solved.length > 0 && (
          <>
            <clipPath id="clip-solved">
              {solved.map((p) => (
                <rect key={p.id} x={p.src.x} y={p.src.y} width={p.src.w} height={p.src.h} />
              ))}
            </clipPath>
            <image
              href={imageSrc}
              x={0}
              y={0}
              width={imageWidth}
              height={imageHeight}
              preserveAspectRatio="none"
              clipPath="url(#clip-solved)"
              style={{ pointerEvents: 'none' }}
            />
          </>
        )}

        {seams.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={amp * 0.14} />
        ))}

        {/* Below the loose pieces so a piece lying over a solved cell wins the
            hit test, but above the picture so the solved cells are grabbable
            wherever nothing else covers them. */}
        {solved.map((p) => (
          <rect
            key={p.id}
            x={p.src.x}
            y={p.src.y}
            width={p.src.w}
            height={p.src.h}
            fill="transparent"
            pointerEvents="all"
            className="cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => onPointerDown(e, p.id, p.src, p.rot)}
            onPointerMove={(e) => onPointerMove(e, p.id, p.src)}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(e) => onRotate(e, p.id)}
          />
        ))}

        {loose.map((p) => (
          <g
            key={p.id}
            transform={`translate(${p.at!.c * cellW - amp} ${p.at!.r * cellH - amp})`}
            className="cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => onPointerDown(e, p.id, p.src, p.rot)}
            onPointerMove={(e) => onPointerMove(e, p.id, p.src)}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(e) => onRotate(e, p.id)}
          >
            <JigsawPiece
              piece={p}
              imageSrc={imageSrc}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              clipId={`clip-${p.id}`}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}