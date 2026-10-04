import { memo, useMemo } from 'react';
import type { JigsawPieceView } from '@party/jigsaw';
import { pieceOutlinePath, tabAmplitude } from '@party/jigsaw';

/**
 * One loose piece in its own SVG box.
 *
 * The picture is drawn as the *whole* image, offset so this piece's own patch
 * lands on the body and the neighbouring content fills the tab — a real tab
 * carries the picture on past the cut line. Only the outline clips the rest away.
 *
 * A piece's outline never extends left or up: `pieceOutlinePath` gives every
 * boundary a canonical normal, so a piece's top and left edges are sockets cut
 * into it and only its right and bottom edges carry tabs outward. The board
 * leans on that — it can use the picture's own rectangle as the viewBox and let
 * the picture's straight outer border clip everything.
 */
export const JigsawPiece = memo(function JigsawPiece({
  piece,
  imageSrc,
  imageWidth,
  imageHeight,
  clipId,
}: {
  piece: JigsawPieceView;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  clipId: string;
}) {
  const amp = tabAmplitude(piece.src.w, piece.src.h);
  const d = useMemo(
    () => pieceOutlinePath(piece.edges, piece.src.w, piece.src.h, amp),
    [piece.edges, piece.src.w, piece.src.h, amp]
  );

  // Quarter turns, about the middle of the body. The body sits at `[amp, amp]`
  // in both the board's `<g>` and the tray's viewBox, so this one transform
  // serves both and needs no per-parent adjustment. `computeGridLayout` returns
  // near-square cells, so a 90° turn lands in about the same box.
  const cx = amp + piece.src.w / 2;
  const cy = amp + piece.src.h / 2;

  return (
    <g transform={piece.rot ? `rotate(${90 * piece.rot} ${cx} ${cy})` : undefined}>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <image
        href={imageSrc}
        x={amp - piece.src.x}
        y={amp - piece.src.y}
        width={imageWidth}
        height={imageHeight}
        preserveAspectRatio="none"
        clipPath={`url(#${clipId})`}
      />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={amp * 0.14} />
    </g>
  );
});

/**
 * ViewBox for a standalone (tray) piece: the padded box, with the piece's body
 * centred in it. `pieceOutlinePath` places the body at `[amp, amp]`, hence the
 * `amp -` offset.
 */
export function pieceViewBox(piece: JigsawPieceView): string {
  const amp = tabAmplitude(piece.src.w, piece.src.h);
  const pad = amp * 1.1;
  return `${amp - pad} ${amp - pad} ${piece.src.w + 2 * pad} ${piece.src.h + 2 * pad}`;
}
