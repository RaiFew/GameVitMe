import { useEffect, useState } from 'react';
import { Timer, Lock, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  ranked: {
    rankingDirection: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
    elapsedMs: number;
    stages: number;
    penaltyMs: number;
    lockedForMs: number;
  };
  currentRoundNumber: number;
  serverNow?: number;
  isTimeMode: boolean;
}

const formatTime = (ms: number) => {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((clamped % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
};

/**
 * The ranked run's own readouts: stage or floor, elapsed server time, and the
 * penalty countdown.
 *
 * Every value here is server-owned. The local clock only interpolates between
 * two server measurements — it decides nothing, and the penalty ends when the
 * server says it does, not when this reaches zero.
 */
export function RankedHud({ ranked, currentRoundNumber, serverNow, isTimeMode }: Props) {
  const [drift, setDrift] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      setDrift(serverNow ? Date.now() - serverNow : 0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [serverNow]);

  const lockedForMs = Math.max(0, ranked.lockedForMs - (now - (serverNow ?? now)));
  const lockedSeconds = Math.ceil(lockedForMs / 1000);
  const liveMs = ranked.elapsedMs + Math.max(0, drift);

  return (
    <div className="w-full max-w-[min(92vw,560px)] space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-xs border border-live bg-live text-live-ink">
            Ranked
          </span>
          <span className="text-xs font-bold text-ink-muted">
            {isTimeMode
              ? `Stage ${currentRoundNumber}/${ranked.stages}`
              : `Floor ${currentRoundNumber}`}
          </span>
        </div>

        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-ink">
          {isTimeMode ? (
            <Timer size={14} className="text-ink-muted" />
          ) : ranked.rankingDirection === 'LOWER_IS_BETTER' ? (
            <TrendingDown size={14} className="text-ink-muted" />
          ) : (
            <TrendingUp size={14} className="text-ink-muted" />
          )}
          {formatTime(liveMs)}
        </span>
      </div>

      {lockedSeconds > 0 && (
        <div className="p-2.5 rounded-xs border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-2">
          <Lock size={14} />
          <span>
            Locked out for {lockedSeconds}s — a wrong click costs {ranked.penaltyMs / 1000}s
          </span>
        </div>
      )}
    </div>
  );
}
