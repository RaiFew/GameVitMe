import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Gavel, Users, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
  isHost: boolean;
}

export function SalemGameOverScreen({ playerView, onReturnLobby, onPlayAgain, isHost }: Props) {
  const { gameOverData } = playerView;
  const survivors = playerView.players.filter((p) => p.isAlive && !p.isHost);
  const fallen = playerView.players.filter((p) => !p.isAlive);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="border-b border-rule pb-6 text-center">
        <span className="text-label font-mono uppercase tracking-widest font-bold text-ink-muted">
          The trial has ended
        </span>
        <h1 className="text-display sm:text-5xl font-black tracking-tight text-ink mt-2 flex items-center justify-center gap-3">
          <Gavel size={36} />
          {gameOverData?.roundsPlayed ?? playerView.roundNumber} night
          {(gameOverData?.roundsPlayed ?? playerView.roundNumber) === 1 ? '' : 's'} in Salem
        </h1>
      </div>

      <Card className="p-6 border border-rule">
        <h3 className="text-label font-mono font-bold uppercase tracking-widest text-ink flex items-center gap-2 mb-4 border-b border-rule pb-3">
          <Users size={16} />
          The village
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {playerView.players
            .filter((p) => !p.isHost)
            .map((p) => (
              <div
                key={p.id}
                className={`p-3 border rounded-xs flex items-center justify-between ${
                  p.isAlive ? 'border-rule' : 'border-danger/40 bg-danger/5'
                }`}
              >
                <span className="text-label font-bold text-ink truncate">{p.displayName}</span>
                <span
                  className={`text-label font-mono uppercase font-bold ${
                    p.isAlive ? 'text-success' : 'text-danger'
                  }`}
                >
                  {p.isAlive ? 'Survived' : 'Died'}
                </span>
              </div>
            ))}
        </div>

        <p className="text-label text-ink-muted mt-4 border-t border-rule pt-4">
          {survivors.length} survived · {fallen.length} died. Nobody on screen ever learned who
          held which card.
        </p>
      </Card>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button variant="secondary" onClick={onReturnLobby} className="text-label">
          <ArrowLeft size={14} className="mr-2" /> Return to Lobby
        </Button>
        {isHost && (
          <Button onClick={onPlayAgain} className="text-label">
            <RefreshCw size={14} className="mr-2" /> Convene Another Trial
          </Button>
        )}
      </div>
    </div>
  );
}
