import type { SpyfallPlayerView } from '@party/spyfall';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

interface VotingPhaseProps {
  playerView: SpyfallPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  currentUserId: string;
}

export function VotingPhase({ playerView, onAction, currentUserId }: VotingPhaseProps) {
  const voting = playerView.voting;
  const accuser = playerView.players.find((p) => p.id === playerView.accuserId);
  const accused = playerView.players.find((p) => p.id === (voting?.accusedPlayerId || playerView.accusedPlayerId));
  const currentVoter = playerView.players.find((p) => p.id === voting?.currentVoterId);

  const isAccused = accused?.id === currentUserId;
  const isMyTurnToVote = voting?.currentVoterId === currentUserId;
  const hasAlreadyVoted = voting?.hasVoted ?? false;

  const totalVoters = voting?.totalVoters ?? 1;
  const currentStep = (voting?.currentVoterIndex ?? 0) + 1;

  return (
    <Card className="w-full max-w-xl mx-auto text-center p-8 border border-rule">
      <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block mb-1">
        Indictment Vote
      </span>
      <h2 className="text-2xl font-black uppercase text-ink mb-2">
        Suspect on Trial
      </h2>
      <p className="text-sm text-ink-muted mb-6">
        <span className="font-bold text-ink">{accuser?.displayName}</span> accused{' '}
        <span className="font-bold underline text-ink">{accused?.displayName}</span> of being the Spy.
      </p>

      <div className="border border-rule bg-canvas-sunk p-3 rounded-xs mb-6 text-xs text-ink-muted font-mono">
        Unanimous conviction required. If any player votes NO, questioning resumes immediately.
      </div>

      {/* Sequential Voting Progress */}
      {voting && (
        <div className="mb-6 p-4 border border-rule rounded-xs bg-canvas">
          <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-3">
            Voter Order ({currentStep > totalVoters ? totalVoters : currentStep} / {totalVoters})
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {voting.voterOrder.map((pid, idx) => {
              const voter = playerView.players.find((p) => p.id === pid);
              const isPast = idx < voting.currentVoterIndex;
              const isCurrent = idx === voting.currentVoterIndex;

              return (
                <div
                  key={pid}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-mono font-semibold border ${
                    isCurrent
                      ? 'border-rule-strong bg-ink text-canvas font-bold'
                      : isPast
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-rule text-ink-faint'
                  }`}
                >
                  <span>{isPast ? '✓' : isCurrent ? '•' : '○'}</span>
                  <span>{voter?.displayName ?? 'Player'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voter Action Area */}
      {isAccused ? (
        <div className="p-6 border border-rule rounded-xs bg-canvas-sunk">
          <p className="text-sm font-bold uppercase text-red-600 dark:text-red-400 mb-1">You are the suspect on trial</p>
          <p className="text-xs text-ink-muted">
            You cannot vote on your own indictment. The other players are voting sequentially.
          </p>
        </div>
      ) : isMyTurnToVote ? (
        <div className="space-y-4">
          <div className="p-4 border border-rule-strong rounded-xs">
            <p className="text-sm font-bold uppercase text-ink mb-1">Your Turn To Vote</p>
            <p className="text-xs text-ink-muted">
              Do you agree that <strong>{accused?.displayName}</strong> is the Spy?
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              className="flex-1 text-xs font-bold"
              onClick={() => onAction('vote', { vote: 'YES', guilty: true })}
            >
              YES (Guilty)
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 text-xs font-bold"
              onClick={() => onAction('vote', { vote: 'NO', guilty: false })}
            >
              NO (Innocent)
            </Button>
          </div>
        </div>
      ) : hasAlreadyVoted ? (
        <div className="p-6 border border-rule rounded-xs">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">✓ Your vote has been recorded</p>
          <p className="text-xs text-ink-muted mt-1 font-mono">
            Waiting for {currentVoter?.displayName ?? 'next player'}...
          </p>
        </div>
      ) : (
        <div className="p-6 border border-rule rounded-xs">
          <p className="text-xs text-ink-muted font-mono">
            Waiting for <span className="font-bold text-ink">{currentVoter?.displayName ?? 'next player'}</span>...
          </p>
        </div>
      )}
    </Card>
  );
}
