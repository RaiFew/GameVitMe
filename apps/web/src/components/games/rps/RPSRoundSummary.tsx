import type { RPSRoundOutcome, RPSGameMode } from '@party/rock-paper-scissors';
import { Button } from '../../ui/Button';

interface Props {
  outcome: RPSRoundOutcome;
  gameMode: RPSGameMode;
  onNextRound?: () => void;
  isHost?: boolean;
}

export function RPSRoundSummary({
  outcome,
  gameMode,
  onNextRound,
  isHost,
}: Props) {
  const { isTie, description, eliminatedIds } = outcome;

  return (
    <div
      className={`p-5 rounded-xs border-2 text-center space-y-3 transition-all ${
        isTie
          ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'
          : 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl">{isTie ? '🤝' : '⚡'}</span>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs border border-current">
          {isTie ? 'Round Result: Tie / Standoff' : 'Round Result: Clash!'}
        </span>
      </div>

      <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
        {description}
      </h3>

      {gameMode === 'BATTLE_ROYALE' && eliminatedIds.length > 0 && (
        <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
          ⚠️ {eliminatedIds.length} player(s) eliminated this round!
        </p>
      )}

      {onNextRound && (
        <div className="pt-2 flex justify-center">
          <Button
            size="sm"
            onClick={onNextRound}
            className="text-xs font-bold uppercase tracking-wider"
          >
            Next Round →
          </Button>
        </div>
      )}
    </div>
  );
}
