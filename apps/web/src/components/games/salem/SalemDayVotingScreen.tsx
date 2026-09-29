import { useState } from 'react';
import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Vote, SkipForward } from 'lucide-react';
import { salemAudio } from './audio/audio-service';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemDayVotingScreen({ playerView, onAction, isHost }: Props) {
  const { me, players, roundNumber } = playerView;
  const livingCitizens = players.filter((p) => p.isAlive && p.canPlay !== false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const hasVoted = !!me.hasVoted;
  const votedCount = livingCitizens.filter((p) => p.hasVoted).length;

  const handleCastVote = () => {
    if (!selectedTargetId) return;
    salemAudio.playCue('trial');
    onAction('DAY_VOTE', { targetPlayerId: selectedTargetId });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="border-b border-rule pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted">
              Round {roundNumber}
            </span>
            <span className="border border-rule-strong bg-ink text-canvas text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Salem Court of Oyer and Terminer
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-ink flex items-center gap-3">
            <Vote size={32} />
            Vote on Suspected Witchcraft
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold border border-rule bg-canvas-sunk px-3 py-1.5 rounded-xs">
            {votedCount} / {livingCitizens.length} Voted
          </div>

          {isHost && (
            <Button variant="secondary" size="sm" onClick={() => onAction('DAY_FINISH_VOTING')} className="text-xs">
              <SkipForward size={14} className="mr-1" /> Conclude Tribunal
            </Button>
          )}
        </div>
      </div>

      {/* Host Moderator Overview */}
      {isHost && (
        <Card className="p-6 border-2 border-rule-strong bg-canvas-sunk/50">
          <h3 className="text-sm font-black uppercase text-ink">
            Magistrate Bench • Tribunal Tracking
          </h3>
          <p className="text-xs text-ink-muted font-mono mt-1">
            Citizens are voting. When all votes are in or you choose to conclude early, the plurality target will be condemned.
          </p>
        </Card>
      )}

      {/* Voting Cards Grid */}
      {!isHost && me.isAlive && !hasVoted && (
        <Card className="p-6 border border-rule space-y-6">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
            Cast Accusation Against a Citizen
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {livingCitizens
              .filter((p) => p.id !== me.id)
              .map((target) => {
                const isSelected = selectedTargetId === target.id;
                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`p-4 border text-left rounded-xs transition-all ${
                      isSelected
                        ? 'border-rule-strong bg-ink text-canvas font-black'
                        : 'border-rule bg-canvas text-ink hover:border-black'
                    }`}
                  >
                    <span className="text-sm block truncate">{target.displayName}</span>
                    <span className="text-[10px] font-mono uppercase opacity-70">Citizen</span>
                  </button>
                );
              })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-rule">
            <Button
              variant="secondary"
              onClick={() => onAction('DAY_VOTE', { targetPlayerId: 'SKIP' })}
              className="text-xs font-bold"
            >
              Abstain
            </Button>
            <Button
              disabled={!selectedTargetId}
              onClick={handleCastVote}
              className="text-xs font-bold min-w-[160px]"
            >
              Confirm Accusation
            </Button>
          </div>
        </Card>
      )}

      {!isHost && hasVoted && (
        <Card className="p-8 text-center border border-rule">
          <Vote size={32} className="mx-auto text-emerald-500 mb-3" />
          <h3 className="text-lg font-black uppercase text-ink">
            Your Accusation Has Been Cast
          </h3>
          <p className="text-xs font-mono text-ink-muted mt-1">
            Waiting for remaining citizens to submit their votes to the Salem Court.
          </p>
        </Card>
      )}
    </div>
  );
}
