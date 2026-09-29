import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Moon, Play, EyeOff } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemSetupScreen({ playerView, onAction, isHost }: Props) {
  const players = playerView.players.filter((p) => !p.isHost);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <header className="border-b border-rule pb-6 text-center space-y-2">
        <span className="text-label font-mono uppercase tracking-widest text-ink-muted">
          Before the first night
        </span>
        <h1 className="text-display font-black tracking-tight text-ink">Prepare the cards</h1>
        <p className="text-body text-ink-muted max-w-lg mx-auto">
          Salem runs on physical cards. The app only tracks the night — the cards decide who
          holds what.
        </p>
      </header>

      <Card className="p-6 border border-rule space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-rule rounded-xs p-4 space-y-1">
            <h2 className="text-title font-black tracking-tight text-ink">1 Witch card</h2>
            <p className="text-label text-ink-muted">
              Held by one player. At night they name one player to kill.
            </p>
          </div>
          <div className="border border-rule rounded-xs p-4 space-y-1">
            <h2 className="text-title font-black tracking-tight text-ink">1 Constable card</h2>
            <p className="text-label text-ink-muted">
              Held by another player. At night they guard one player from harm.
            </p>
          </div>
        </div>

        <p className="text-label text-ink-muted flex items-start gap-2 border-t border-rule pt-4">
          <EyeOff size={16} className="mt-0.5 shrink-0" />
          <span>
            Deal the cards face down and keep your card private. Nobody — including the
            Host — can see who is holding what on screen.
          </span>
        </p>
      </Card>

      <Card className="p-6 border border-rule">
        <h2 className="text-label font-mono uppercase tracking-widest text-ink-muted mb-3">
          In the village ({players.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="border border-rule rounded-xs px-3 py-2 text-label font-semibold text-ink truncate"
            >
              {p.displayName}
            </div>
          ))}
        </div>
      </Card>

      {isHost ? (
        <div className="text-center">
          <Button size="lg" onClick={() => onAction('HOST_ADVANCE')}>
            <Moon size={16} className="mr-2" /> Call the first night
          </Button>
        </div>
      ) : (
        <p className="text-center text-label font-mono text-ink-muted flex items-center justify-center gap-2">
          <Play size={14} /> Waiting for the Host to begin.
        </p>
      )}
    </div>
  );
}
