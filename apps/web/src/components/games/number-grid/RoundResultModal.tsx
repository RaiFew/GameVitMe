import type { NumberGridPlayerView } from '@party/number-grid';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Award, ArrowRight, Skull } from 'lucide-react';

interface RoundResultModalProps {
  playerView: NumberGridPlayerView;
  onNextRound: () => void;
  isHost: boolean;
}

export function RoundResultModal({
  playerView,
  onNextRound,
  isHost,
}: RoundResultModalProps) {
  const { roundResults, currentRoundNumber, totalRounds, me } = playerView;

  if (!roundResults) return null;

  const didTakeDamage = me ? roundResults.damagedPlayerIds.includes(me.playerId) : false;
  const wasEliminated = me ? roundResults.eliminatedPlayerIds.includes(me.playerId) : false;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <Card className="w-full max-w-md p-6 border-2 border-black dark:border-white bg-white dark:bg-zinc-950 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
            Round {roundResults.roundNumber} of {totalRounds} Complete
          </span>
          <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
            Round Results
          </h2>
        </div>

        {/* Personal outcome banner */}
        {me && (
          <div
            className={`p-3 rounded-xs border text-xs font-bold text-center ${
              wasEliminated
                ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300'
                : didTakeDamage
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {wasEliminated
              ? '💀 You took round damage and have been eliminated!'
              : didTakeDamage
              ? '⚠️ You took 1 round damage!'
              : '✨ You survived this round safely!'}
          </div>
        )}

        {/* Finish Order */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Completion Order
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {roundResults.finishOrder.map((entry) => {
              const tookDmg = roundResults.damagedPlayerIds.includes(entry.playerId);
              const gotElim = roundResults.eliminatedPlayerIds.includes(entry.playerId);

              return (
                <div
                  key={entry.playerId}
                  className="p-2 rounded-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black font-black text-[10px] flex items-center justify-center">
                      #{entry.finishOrder}
                    </span>
                    <span className="font-bold text-black dark:text-white">
                      {entry.displayName} {entry.playerId === me?.playerId && '(You)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    {gotElim ? (
                      <span className="text-red-500 flex items-center gap-1">
                        <Skull size={11} /> Eliminated
                      </span>
                    ) : tookDmg ? (
                      <span className="text-amber-500">-1 HP (Round Dmg)</span>
                    ) : (
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <Award size={11} /> Safe
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Damage Mode Note */}
        <p className="text-[10px] text-zinc-400 text-center">
          Damage Rule:{' '}
          {playerView.damageMode === 'EVERYONE_EXCEPT_FIRST'
            ? 'Everyone except 1st finisher takes round damage'
            : 'Last player to finish takes round damage'}
        </p>

        {/* Advance button */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            variant="primary"
            onClick={onNextRound}
            className="w-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>{currentRoundNumber >= totalRounds ? 'View Final Results' : 'Next Round'}</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
