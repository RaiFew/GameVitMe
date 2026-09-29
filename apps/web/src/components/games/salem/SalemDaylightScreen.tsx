import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Sunrise, ScrollText, Gavel, Moon } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

const COPY = {
  MORNING: {
    eyebrow: 'The night is over',
    title: 'Dawn breaks on Salem',
    body: 'The village wakes and counts its people. Whoever is missing did not survive the night.',
    action: 'Move to confession',
    icon: Sunrise,
  },
  CONFESSION: {
    eyebrow: 'Confession',
    title: 'Reveal your cards',
    body: 'Anyone holding a Witch or Constable card plays it face up now. The app trusts the cards in your hands — it cannot check them.',
    action: 'Resolve the night',
    icon: ScrollText,
  },
  RESOLUTION: {
    eyebrow: 'Resolution',
    title: 'The night is settled',
    body: 'The result is final. It cannot be changed, only carried into the next night.',
    action: 'Begin the next night',
    icon: Gavel,
  },
} as const;

export function SalemDaylightScreen({ playerView, onAction, isHost }: Props) {
  const phase = playerView.phase as keyof typeof COPY;
  const { eyebrow, title, body, action, icon: PhaseIcon } = COPY[phase];
  const outcome = playerView.outcome;

  const deadNames = playerView.players
    .filter((p) => outcome?.deadPlayerIds.includes(p.id))
    .map((p) => p.displayName);
  const survivors = playerView.players.filter((p) => !p.isHost && p.isAlive);

  const verdict =
    outcome?.result === 'NO_DEATH'
      ? 'The Constable stood guard over the Witch’s target. Nobody dies.'
      : outcome?.result === 'WITCH_TARGET_DIES'
        ? 'The Witch’s target was not guarded. One player is dead.'
        : 'No card was played tonight. The village is untouched.';

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <header className="border-b border-rule pb-6 text-center space-y-2">
        <span className="text-label font-mono uppercase tracking-widest text-ink-muted">
          {eyebrow}
        </span>
        <h1 className="text-display font-black tracking-tight text-ink flex items-center justify-center gap-3">
          <PhaseIcon size={32} /> {title}
        </h1>
      </header>

      {phase !== 'CONFESSION' && (
        <Card className="p-6 border border-rule space-y-4">
          <p className="text-body text-ink text-center">{verdict}</p>

          {deadNames.length > 0 ? (
            <div className="border-t border-rule pt-4 text-center space-y-1">
              <span className="text-label font-mono uppercase tracking-widest text-ink-muted block mb-2">
                Dead this night
              </span>
              <span className="text-title font-black tracking-tight text-danger">
                {deadNames.join(', ')}
              </span>
            </div>
          ) : (
            <div className="border-t border-rule pt-4 text-center">
              <span className="text-title font-black tracking-tight text-success">
                No one died
              </span>
            </div>
          )}

          {phase === 'MORNING' && (
            <div className="border-t border-rule pt-4">
              <span className="text-label font-mono uppercase tracking-widest text-ink-muted block mb-2">
                Still in the village ({survivors.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {survivors.map((p) => (
                  <span
                    key={p.id}
                    className="border border-rule rounded-xs px-2.5 py-1 text-label font-semibold text-ink"
                  >
                    {p.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 border border-rule">
        <p className="text-body text-ink-muted text-center">{body}</p>
      </Card>

      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {phase === 'RESOLUTION' && (
            <Button variant="secondary" onClick={() => onAction('END_GAME')}>
              End the trial
            </Button>
          )}
          <Button onClick={() => onAction('HOST_ADVANCE')}>
            {phase === 'RESOLUTION' && <Moon size={14} className="mr-2" />}
            {action}
          </Button>
        </div>
      ) : (
        <p className="text-center text-label font-mono text-ink-muted">Waiting for the Host.</p>
      )}
    </div>
  );
}
