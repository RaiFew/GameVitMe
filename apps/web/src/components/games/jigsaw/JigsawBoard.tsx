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
  onPointerDown: (e: React.PointerEvent, id: string, src: SrcRect) => void;
  onPointerMove: (e: React.PointerEvent, id: string, src: SrcRect) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Locked pieces render as plain rectangles, no `clip-path`. Because the tabs
 * interlock, the union of those rectangles is the whole picture with no gaps, so
 * a locked piece is indistinguishable from a clipped one. They also take
 * `pointer-events: none`, so the only grabbable things on the board are the
 * loose pieces and no overlap between two of them can ever be ambiguous.
 *
 * The crop cannot come from the `<image>` rect: an SVG `<image>` fits the whole
 * source into whatever x/y/width/height it is given, so a cell-sized rect drew a
 * shrunken copy of the entire picture in every cell. The picture is therefore
 * drawn once at full size and clipped to the union of the locked cells — one
 * `clipPath`, one `<image>`, whatever the piece count.
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
}: Props) {
  const cellW = imageWidth / cols;
  const cellH = imageHeight / rows;
  const amp = tabAmplitude(cellW, cellH);

  const locked = pieces.filter((p) => p.locked);
  const loose = pieces.filter((p) => p.zone === 'BOARD' && !p.locked);

  /**
   * Seams are drawn only where both sides are placed, so the grid grows with the
   * puzzle and the player can see what is done without comparing counts.
   */
  const seams = useMemo(() => {
    const placed = new Set(locked.map((p) => `${p.src.y / cellH}|${p.src.x / cellW}`));
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
  }, [locked, cols, rows, edgeSeed, cellW, cellH, amp]);

  return (
    <div
      data-jigsaw-board
      className="w-full max-w-3xl mx-auto select-none touch-none border border-rule rounded-xs bg-canvas-sunk overflow-hidden"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <svg
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        className="w-full h-full block text-ink/15"
      >
        {locked.length > 0 && (
          <>
            <clipPath id="clip-locked">
              {locked.map((p) => (
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
              clipPath="url(#clip-locked)"
              style={{ pointerEvents: 'none' }}
            />
          </>
        )}

        {seams.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={amp * 0.14} />
        ))}

        {loose.map((p) => (
          <g
            key={p.id}
            transform={`translate(${p.at!.c * cellW - amp} ${p.at!.r * cellH - amp})`}
            className="cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => onPointerDown(e, p.id, p.src)}
            onPointerMove={(e) => onPointerMove(e, p.id, p.src)}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
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