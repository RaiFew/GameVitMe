import { useEffect, useMemo, useRef, useState } from 'react';
import type { JigsawPlayerView } from '@party/jigsaw';
import { api } from '../../../lib/api';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { JigsawBoard } from './JigsawBoard';
import { PieceTray } from './PieceTray';
import { usePieceDrag, type DropTarget } from './usePieceDrag';

interface Props {
  playerView: JigsawPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

export function JigsawGame({ playerView, onAction, onReturnLobby, onPlayAgain }: Props) {
  const { phase, imageId, imageWidth, imageHeight, cols, rows, edgeSeed, pieces, lockedCount, totalToLock, canUndo, me } =
    playerView;

  const [imageSrc, setImageSrc] = useState('');
  const [imageError, setImageError] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!imageId) {
      setImageError('This room has no picture.');
      return;
    }
    let live = true;
    setImageSrc('');
    setImageError('');
    api
      .get<{ image: { data: string } }>(`/api/jigsaw/images/${imageId}`)
      .then((res) => live && setImageSrc(res.image.data))
      .catch((e: Error) => live && setImageError(e.message));
    return () => {
      live = false;
    };
  }, [imageId]);

  const list = useMemo(() => Object.values(pieces), [pieces]);
  const trayPieces = list.filter((p) => p.zone === 'TRAY' && !p.locked);

  // The clock is the score, so it has to move between broadcasts too. It cannot
  // read `serverNow` directly: that is a snapshot frozen at the last broadcast,
  // so a re-render alone would redisplay the same frozen number. Measure the
  // offset once per broadcast, then run the stopwatch on the local clock.
  const skew = useRef(0);
  useEffect(() => {
    skew.current = playerView.serverNow - Date.now();
  }, [playerView.serverNow]);

  const [, tick] = useState(0);
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [phase]);

  const handleDrop = (pieceId: string, target: DropTarget) => {
    onAction(
      'PLACE_PIECE',
      target.zone === 'BOARD'
        ? { pieceId, zone: 'BOARD', row: target.row, col: target.col }
        : { pieceId, zone: 'TRAY' }
    );
  };

  // A drag is not always possible — a thumb on a small screen, a trackpad quirk —
  // so a tap on a loose board piece is the recovery path: it goes home.
  const handleTap = (pieceId: string) => {
    if (pieces[pieceId]?.zone === 'BOARD') onAction('PLACE_PIECE', { pieceId, zone: 'TRAY' });
  };

  const { onPointerDown, onPointerMove, endDrag, ghostNode } = usePieceDrag({
    cols,
    rows,
    imageSrc,
    imageWidth,
    imageHeight,
    onDrop: handleDrop,
    onTap: handleTap,
  });

  if (phase === 'COMPLETED') {
    return (
      <JigsawComplete
        playerView={playerView}
        onPlayAgain={onPlayAgain}
        onReturnLobby={onReturnLobby}
      />
    );
  }

  const playable = phase === 'PLAYING' && !!imageSrc;

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-3 sm:p-5 max-w-3xl mx-auto w-full font-mono select-none">
      <div className="w-full flex items-center justify-between gap-2 border-b border-rule pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-xs border border-rule-strong bg-ink text-canvas">
            {lockedCount}/{totalToLock}
          </span>
          <span className="text-xs font-bold text-ink-muted">
            {cols}×{rows}
          </span>
          {phase === 'PLAYING' && (
            <Button
              data-jigsaw-undo
              variant="secondary"
              disabled={!canUndo}
              onClick={() => onAction('UNDO')}
              className="text-[10px] font-bold uppercase tracking-wider py-1 px-2"
            >
              Undo
            </Button>
          )}
        </div>
        {phase === 'PLAYING' && (
          <div className="flex items-center gap-3">
            <button
              data-jigsaw-original
              onClick={() => setShowOriginal((v) => !v)}
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              {showOriginal ? 'Hide picture' : 'Show picture'}
            </button>
            <span className="text-sm font-black tabular-nums text-ink">
              {formatElapsed(elapsedMs(playerView, skew.current))}
            </span>
          </div>
        )}
      </div>

      {/* Slicing never revokes the original: it is the one thing a player who has
          lost the thread can check a piece against. Only shown on request, and
          only over the board — it is a reference, not the puzzle. */}
      {showOriginal && imageSrc && (
        <div
          data-jigsaw-original-view
          className="w-full max-w-3xl border border-rule rounded-xs bg-canvas-sunk p-2"
        >
          <img
            src={imageSrc}
            alt="The picture this puzzle was cut from"
            className="w-full max-h-64 object-contain"
          />
        </div>
      )}

      {imageError ? (
        <Card className="p-6 border border-rule text-xs font-mono text-red-600 dark:text-red-400 w-full">
          {imageError}
        </Card>
      ) : !imageSrc ? (
        <div className="w-full aspect-video max-w-3xl border border-rule rounded-xs bg-canvas-sunk flex items-center justify-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">
            Loading picture...
          </span>
        </div>
      ) : phase === 'READY' ? (
        <ReadyPanel playerView={playerView} onAction={onAction} imageSrc={imageSrc} />
      ) : (
        <>
          <JigsawBoard
            pieces={list}
            cols={cols}
            rows={rows}
            edgeSeed={edgeSeed}
            imageSrc={imageSrc}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
          />
          <PieceTray
            pieces={trayPieces}
            imageSrc={imageSrc}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
          />
          <p className="text-[10px] font-mono text-ink-faint text-center">
            Drag pieces onto the board. Tap one on the board to send it back.
          </p>
        </>
      )}

      {playable && ghostNode}
    </div>
  );
}

/**
 * The clock starts at READY, not at `game:start`. Nobody is timed while a
 * multi-megabyte picture decodes, and this panel doubles as that decode barrier:
 * the picture is already rendered above it by the time anyone can press it.
 */
function ReadyPanel({
  playerView,
  onAction,
  imageSrc,
}: {
  playerView: JigsawPlayerView;
  onAction: Props['onAction'];
  imageSrc: string;
}) {
  const { players, me } = playerView;
  return (
    <Card className="p-6 border border-rule w-full space-y-4">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
          Cooperative Puzzle
        </span>
        <h2 className="text-lg font-black uppercase tracking-tight text-ink mt-0.5">
          Assemble it together
        </h2>
        <p className="text-xs font-mono text-ink-muted mt-1">
          {playerView.pieceCount} pieces · {playerView.cols}×{playerView.rows}. The clock starts
          when the last player is ready.
        </p>
      </div>

      <img
        src={imageSrc}
        alt=""
        className="w-full max-h-40 object-contain border border-rule rounded-xs bg-canvas-sunk"
      />

      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <div key={p.playerId} className="flex items-center justify-between text-xs font-mono">
            <span className={p.playerId === me?.playerId ? 'text-ink font-bold' : 'text-ink-muted'}>
              {p.displayName}
            </span>
            <span className={p.isReady ? 'text-ink font-bold' : 'text-ink-faint'}>
              {p.isReady ? 'READY' : 'waiting'}
            </span>
          </div>
        ))}
      </div>

      <Button
        className="w-full text-xs font-bold uppercase"
        variant={me?.isReady ? 'secondary' : 'primary'}
        disabled={me?.isReady}
        onClick={() => onAction('READY_UP')}
      >
        {me?.isReady ? 'Waiting for others...' : 'Start Puzzle'}
      </Button>
    </Card>
  );
}

function JigsawComplete({
  playerView,
  onPlayAgain,
  onReturnLobby,
}: {
  playerView: JigsawPlayerView;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}) {
  const { result, players, pieceCount } = playerView;
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <Card className="p-8 border border-rule w-full max-w-md space-y-5 text-center font-mono">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Puzzle complete
          </span>
          <div className="text-4xl font-black tabular-nums text-ink mt-1">
            {formatElapsed(result?.elapsedMs ?? 0)}
          </div>
          <p className="text-xs text-ink-muted mt-1">{pieceCount} pieces, assembled together.</p>
        </div>

        <div className="space-y-1.5 border-t border-rule pt-4">
          {players.map((p) => (
            <div key={p.playerId} className="flex items-center justify-between text-xs">
              <span className="text-ink">{p.displayName}</span>
              <span className="font-bold text-ink-muted">
                {result?.piecesByPlayer?.[p.playerId] ?? p.piecesPlaced} placed
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 text-xs" onClick={onReturnLobby}>
            Lobby
          </Button>
          <Button className="flex-1 text-xs font-bold uppercase" onClick={onPlayAgain}>
            New Puzzle
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * `serverNow` and `Date.now()` come off the same clock, so their difference
 * cancels the client's skew exactly and only transit latency is left — invisible
 * on a stopwatch readout. `skew` must be a value captured at the last broadcast
 * rather than recomputed from the frozen `serverNow` in the view.
 */
function elapsedMs(view: JigsawPlayerView, skew: number): number {
  if (view.startedAtMs == null) return 0;
  return Math.max(0, Date.now() + skew - view.startedAtMs);
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}