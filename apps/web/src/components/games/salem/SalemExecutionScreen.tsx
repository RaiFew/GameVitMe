import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Moon, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemExecutionScreen({ playerView, onAction, isHost }: Props) {
  const { day, roundNumber } = playerView;
  const executed = day?.eliminatedThisDay;
  const isTie = day?.isTie;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
            Round {roundNumber}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
            Verdict of the Tribunal
          </h1>
        </div>

        {isHost ? (
          <Button onClick={() => onAction('DAY_PROCEED_TO_NIGHT')} className="text-xs font-bold">
            Proceed to Night <Moon size={14} className="ml-1.5" />
          </Button>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2 rounded-xs font-mono text-xs text-zinc-500">
            Waiting for Moderator to proceed...
          </div>
        )}
      </div>

      <Card className="p-10 border-2 border-black dark:border-white text-center space-y-4">
        {isTie ? (
          <>
            <ShieldCheck size={48} className="mx-auto text-amber-500" />
            <h2 className="text-2xl font-black uppercase text-black dark:text-white">
              The Tribunal Ended in a Stalemate
            </h2>
            <p className="text-xs font-mono text-zinc-500 max-w-md mx-auto">
              Equal accusations were levied against multiple citizens. No one has been condemned today.
            </p>
          </>
        ) : executed ? (
          <>
            <AlertTriangle size={48} className="mx-auto text-red-500" />
            <h2 className="text-2xl font-black uppercase text-black dark:text-white">
              {executed.displayName} Was Condemned
            </h2>
            <p className="text-xs font-mono text-zinc-500 max-w-md mx-auto">
              By plurality vote of the Salem Tribunal, {executed.displayName} has been eliminated from the settlement.
            </p>
          </>
        ) : (
          <>
            <ShieldCheck size={48} className="mx-auto text-zinc-400" />
            <h2 className="text-2xl font-black uppercase text-black dark:text-white">
              No Citizen Was Condemned
            </h2>
            <p className="text-xs font-mono text-zinc-500 max-w-md mx-auto">
              The court concluded without a condemning plurality.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
