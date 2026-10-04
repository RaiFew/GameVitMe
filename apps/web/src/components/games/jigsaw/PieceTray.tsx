import type { JigsawPieceView } from '@party/jigsaw';
import { JigsawPiece, pieceViewBox } from './JigsawPiece';
import type { SrcRect } from './usePieceDrag';

interface Props {
  pieces: JigsawPieceView[];
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onPointerDown: (e: React.PointerEvent, id: string, src: SrcRect, rot: number) => void;
  onPointerMove: (e: React.PointerEvent, id: string, src: SrcRect) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onRotate: (e: React.MouseEvent, id: string) => void;
}

/** Shrinks as the tray empties, so a nearly-solved puzzle does not scroll. */
const TRAY_SIZES = [72, 64, 56, 48, 40];

export function PieceTray({
  pieces,
  imageSrc,
  imageWidth,
  imageHeight,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRotate,
}: Props) {
  if (pieces.length === 0) {
    return (
      <div className="border border-rule rounded-xs bg-canvas-sunk px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-faint">
        Tray empty
      </div>
    );
  }

  const size = TRAY_SIZES[Math.min(TRAY_SIZES.length - 1, Math.floor(pieces.length / 12))]!;

  return (
    <div
      data-jigsaw-tray
      className="w-full max-w-3xl mx-auto border border-rule rounded-xs bg-canvas p-2 touch-none select-none"
    >
      <div className="flex flex-wrap gap-1 justify-center max-h-[30vh] overflow-y-auto">
        {pieces.map((p) => (
          <svg
            key={p.id}
            viewBox={pieceViewBox(p)}
            width={size}
            height={size}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 overflow-visible"
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
              clipId={`tray-${p.id}`}
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
