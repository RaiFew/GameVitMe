import type { OpponentSummary } from '@party/number-grid';
import { Skull, CheckCircle2, User } from 'lucide-react';

interface RoundLeaderboardProps {
  opponents: OpponentSummary[];
  totalNumbers: number;
}

export function RoundLeaderboard({ opponents, totalNumbers }: RoundLeaderboardProps) {
  if (!opponents || opponents.length === 0) {
    return null;
  }

  // Sort opponents: finished first (by finishOrder), then alive (by progress % desc), then eliminated
  const sorted = [...opponents].sort((a, b) => {
    if (a.completed && b.completed) {
      return (a.finishOrder || 999) - (b.finishOrder || 999);
    }
    if (a.completed) return -1;
    if (b.completed) return 1;

    if (a.eliminated && !b.eliminated) return 1;
    if (!a.eliminated && b.eliminated) return -1;

    return b.progressPercent - a.progressPercent;
  });

  return (
    <div className="w-full max-w-[min(92vw,560px)] border border-rule bg-canvas/70 backdrop-blur-xs rounded-sm p-3 font-mono">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-muted border-b border-rule pb-2 mb-2">
        <span>Opponents ({opponents.length})</span>
        <span>Progress</span>
      </div>

      <div className="space-y-2">
        {sorted.map((opp) => {
          const currentCleared = Math.max(0, opp.expectedNumber - 1);

          return (
            <div
              key={opp.id}
              className={`p-2 rounded-xs border text-xs flex items-center justify-between transition-colors ${
                opp.eliminated
                  ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 opacity-60'
                  : opp.completed
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-rule bg-canvas-sunk/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    opp.eliminated
                      ? 'bg-red-100 dark:bg-red-900/60 text-red-600'
                      : opp.completed
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600'
                      : 'bg-surface-hover text-ink'
                  }`}
                >
                  {opp.eliminated ? (
                    <Skull size={11} />
                  ) : opp.completed ? (
                    <CheckCircle2 size={11} />
                  ) : (
                    <User size={11} />
                  )}
                </div>

                <div className="truncate">
                  <span
                    className={`font-bold block truncate text-xs ${
                      opp.eliminated
                        ? 'text-ink-faint line-through'
                        : 'text-ink'
                    }`}
                  >
                    {opp.displayName}
                  </span>
                  <span className="text-[10px] text-ink-muted font-normal">
                    HP: {Math.max(0, opp.hp)}/{opp.maxHp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {opp.eliminated ? (
                  <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-1.5 py-0.5 rounded-xs">
                    Eliminated
                  </span>
                ) : opp.completed ? (
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-xs">
                    Finished #{opp.finishOrder}
                  </span>
                ) : (
                  <div className="text-right">
                    <span className="text-xs font-bold text-ink">
                      {currentCleared}/{totalNumbers}
                    </span>
                    <div className="w-16 h-1 bg-surface-hover rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-ink rounded-full transition-all duration-300"
                        style={{ width: `${opp.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
