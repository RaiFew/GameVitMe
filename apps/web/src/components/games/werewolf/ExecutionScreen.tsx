import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Skull, Moon, ShieldCheck, Scale } from 'lucide-react';

interface ExecutionScreenProps {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function ExecutionScreen({ playerView, onAction, isHost }: ExecutionScreenProps) {
  const { roundNumber, day, players } = playerView;
  const executed = day?.eliminatedThisDay;
  const isTie = day?.isTie;

  const handleProceedToNight = () => {
    onAction('DAY_PROCEED_TO_NIGHT');
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-8">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block mb-2">
          Round {roundNumber} Trial Verdict
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-ink flex items-center justify-center gap-3">
          <Scale size={32} />
          The Town Has Spoken
        </h1>
      </div>

      {/* Verdict Announcement Card */}
      <Card className="p-8 border-2 border-rule-strong text-center space-y-4">
        {executed ? (
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full border-2 border-red-600 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Skull size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-ink">
              {executed.displayName} Was Executed
            </h2>
            {executed.roleName && (
              <p className="text-xs font-mono text-ink-muted">
                Their secret role was revealed to be: <strong className="text-ink uppercase">{executed.roleName}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full border-2 border-ink/40 bg-surface text-ink-muted flex items-center justify-center mx-auto">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-ink">
              {isTie ? 'Tie Vote — No Execution' : 'No One Was Executed'}
            </h2>
            <p className="text-xs font-mono text-ink-muted">
              {isTie
                ? 'Votes resulted in a tie. The town failed to reach a consensus.'
                : 'The citizens voted to abstain. Everyone lives to see nightfall.'}
            </p>
          </div>
        )}
      </Card>

      {/* Controller Button to advance to Night */}
      <div className="pt-4">
        {isHost ? (
          <Button size="lg" onClick={handleProceedToNight} className="w-full sm:w-auto min-w-[240px]">
            Proceed to Night {roundNumber + 1} <Moon size={16} className="ml-2" />
          </Button>
        ) : (
          <div className="border border-rule bg-canvas-sunk px-6 py-3 rounded-xs font-mono text-xs text-ink-muted inline-block">
            Waiting for Moderator to proceed...
          </div>
        )}
      </div>
    </div>
  );
}
