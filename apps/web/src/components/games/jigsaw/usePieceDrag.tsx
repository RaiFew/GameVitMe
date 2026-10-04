import { useCallback, useRef, useState } from 'react';

export type DropTarget = { zone: 'BOARD'; row: number; col: number } | { zone: 'TRAY' };

export interface SrcRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** ~6px: below this a gesture is a tap, and a tap must not emit a move. */
const ARM_THRESHOLD = 6;

interface GhostState {
  id: string;
  src: SrcRect;
  /** Rendered size of the piece, in px. `scale` maps image px → that size. */
  width: number;
  height: number;
  scale: number;
}

interface DragState {
  id: string;
  rot: number;
  x0: number;
  y0: number;
  offX: number;
  offY: number;
  armed: boolean;
}

interface Options {
  cols: number;
  rows: number;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onDrop: (pieceId: string, target: DropTarget) => void;
  /** A gesture that never left the threshold — used to send a piece back to the tray. */
  onTap: (pieceId: string) => void;
  /** Fires the moment a piece is grabbed, before any threshold — this is what
   *  the rotate button acts on, since a touch user cannot right-click. */
  onGrab?: (pieceId: string) => void;
}

/**
 * The drag never enters React state. `pointermove` fires ~60 times a second and
 * a setter per event re-renders every piece in the puzzle; instead one
 * `setState` mounts the ghost and every subsequent frame is a single transform
 * mutation on one ref-held node.
 *
 * The drop target is hit-tested under the pointer rather than computed from the
 * board rect captured at drag start: another player can drop a piece onto the
 * board mid-drag, and a stale rect puts this one in the wrong cell.
 */
export function usePieceDrag({
  cols,
  rows,
  imageSrc,
  imageWidth,
  imageHeight,
  onDrop,
  onTap,
  onGrab,
}: Options) {
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<DragState | null>(null);
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const latest = useRef({ onDrop, onTap, cols, rows });
  latest.current = { onDrop, onTap, cols, rows };

  const resolveTarget = useCallback((x: number, y: number): DropTarget => {
    const under = document.elementFromPoint(x, y);
    const board = under?.closest('[data-jigsaw-board]') as HTMLElement | null;
    if (board) {
      const rect = board.getBoundingClientRect();
      const u = (x - rect.left) / rect.width;
      const v = (y - rect.top) / rect.height;
      // Past the edge of the board but still over it — the padded SVG border,
      // which a finger reaches easily on a phone. That is a send-back, not a
      // placement, however close it looks to the corner piece.
      if (u < 0 || u > 1 || v < 0 || v > 1) return { zone: 'TRAY' };
      const { cols: c, rows: r } = latest.current;
      return {
        zone: 'BOARD',
        col: Math.min(c - 1, Math.max(0, Math.floor(u * c))),
        row: Math.min(r - 1, Math.max(0, Math.floor(v * r))),
      };
    }
    return { zone: 'TRAY' };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, id: string, src: SrcRect, rot = 0) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    onGrab?.(id);
    drag.current = {
      id,
      rot,
      x0: e.clientX,
      y0: e.clientY,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      armed: false,
    };
    setGhost({ id, src, width: rect.width, height: rect.height, scale: rect.width / src.w });
  }, [onGrab]);

  const onPointerMove = useCallback((e: React.PointerEvent, id: string, src: SrcRect) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    if (!d.armed) {
      // One pixel of jitter on a tap would otherwise turn every tap into a
      // move, and a tap is the only way to send a piece back to the tray.
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < ARM_THRESHOLD) return;
      d.armed = true;
    }
    e.preventDefault();
    const el = ghostRef.current;
    // Turned here, not in JSX: this is the only thing written per frame, and a
    // re-render would reset the position to 0,0 mid-drag.
    if (el) {
      el.style.transform = `translate3d(${e.clientX - d.offX}px, ${e.clientY - d.offY}px, 0) rotate(${90 * d.rot}deg)`;
    }
  }, []);

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      setGhost(null);
      if (!d) return;
      if (!d.armed) latest.current.onTap(d.id);
      else latest.current.onDrop(d.id, resolveTarget(e.clientX, e.clientY));
    },
    [resolveTarget]
  );

  /** Drawn above everything while a piece is in flight. */
  const ghostNode = ghost ? (
    <div
      ref={ghostRef}
      className="fixed top-0 left-0 pointer-events-none z-50 opacity-90 rounded-xs shadow-lg ring-1 ring-black/30"
      style={{
        width: ghost.width,
        height: ghost.height,
        // ponytail: a plain square rather than the piece's real jigsaw outline —
        // `clip-path: path()` would need the bezier rescaled from image pixels
        // to ghost pixels, and the drag reads the same either way.
        backgroundImage: `url(${imageSrc})`,
        backgroundSize: `${imageWidth * ghost.scale}px ${imageHeight * ghost.scale}px`,
        backgroundPosition: `${-ghost.src.x * ghost.scale}px ${-ghost.src.y * ghost.scale}px`,
      }}
    />
  ) : null;

  return { onPointerDown, onPointerMove, endDrag, ghostNode };
}