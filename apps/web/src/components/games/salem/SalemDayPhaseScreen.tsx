import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Sun, AlertTriangle, Vote, ShieldCheck, Users } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemDayPhaseScreen({ playerView, onAction, isHost }: Props) {
  const { phase, day, roundNumber, me, players } = playerView;
  const isAnnouncement = phase === 'DAY_ANNOUNCEMENT';
  const eliminated = day?.eliminatedPlayerNames || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Day Banner */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
              Day {roundNumber}
            </span>
            <span className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Town Meeting
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-3">
            <Sun size={32} />
            Dawn Over Salem
          </h1>
        </div>

        {/* Discussion Controls */}
        <div>
          {isHost ? (
            isAnnouncement ? (
              <Button onClick={() => onAction('DAY_PROCEED')} className="text-xs font-bold">
                Begin Discussion
              </Button>
            ) : (
              <Button onClick={() => onAction('DAY_CALL_VOTE')} className="text-xs font-bold">
                <Vote size={14} className="mr-1.5" /> Call Town Tribunal
              </Button>
            )
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2 rounded-xs font-mono text-xs text-zinc-500">
              Waiting for Moderator to proceed...
            </div>
          )}
        </div>
      </div>

      {/* Dawn Casualties Notice */}
      <Card className="p-8 border-2 border-black dark:border-white">
        <div className="flex items-start gap-4">
          {eliminated.length > 0 ? (
            <AlertTriangle size={32} className="text-red-500 shrink-0 mt-1" />
          ) : (
            <ShieldCheck size={32} className="text-emerald-500 shrink-0 mt-1" />
          )}

          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
              {eliminated.length > 0 ? 'Casualties of the Night' : 'A Blessed Night in Salem'}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-1 leading-relaxed">
              {eliminated.length > 0
                ? `Tragedy struck the settlement. The following citizen(s) have fallen: ${eliminated.join(', ')}.`
                : 'The night passed without death. The Constable mallet or Doctor remedy protected the town.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Real Talk Discussion Guidance */}
      <Card className="p-8 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} />
          <h3 className="text-base font-black uppercase tracking-tight text-black dark:text-white">
            Town Discussion in Progress
          </h3>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed">
          Citizens of Salem: Speak aloud, challenge suspicions, and question unusual motives. There is no forced timer.
          When the town or magistrate is ready, call for a vote to hold a formal Witchcraft Tribunal.
        </p>
      </Card>
    </div>
  );
}
