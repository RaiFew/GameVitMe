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
    <Card className="w-full max-w-xl mx-auto text-center p-8 border border-zinc-300 dark:border-zinc-800">
      <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-1">
        Indictment Vote
      </span>
      <h2 className="text-2xl font-black uppercase text-black dark:text-white mb-2">
        Suspect on Trial
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        <span className="font-bold text-black dark:text-white">{accuser?.displayName}</span> accused{' '}
        <span className="font-bold underline text-black dark:text-white">{accused?.displayName}</span> of being the Spy.
      </p>

      <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xs mb-6 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
        Unanimous conviction required. If any player votes NO, questioning resumes immediately.
      </div>

      {/* Sequential Voting Progress */}
      {voting && (
        <div className="mb-6 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xs bg-white dark:bg-zinc-950">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3">
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
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-bold'
                      : isPast
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-400'
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
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xs bg-zinc-50 dark:bg-zinc-900">
          <p className="text-sm font-bold uppercase text-red-600 dark:text-red-400 mb-1">You are the suspect on trial</p>
          <p className="text-xs text-zinc-500">
            You cannot vote on your own indictment. The other players are voting sequentially.
          </p>
        </div>
      ) : isMyTurnToVote ? (
        <div className="space-y-4">
          <div className="p-4 border border-black dark:border-white rounded-xs">
            <p className="text-sm font-bold uppercase text-black dark:text-white mb-1">Your Turn To Vote</p>
            <p className="text-xs text-zinc-500">
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
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xs">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">✓ Your vote has been recorded</p>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Waiting for {currentVoter?.displayName ?? 'next player'}...
          </p>
        </div>
      ) : (
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xs">
          <p className="text-xs text-zinc-500 font-mono">
            Waiting for <span className="font-bold text-black dark:text-white">{currentVoter?.displayName ?? 'next player'}</span>...
          </p>
        </div>
      )}
    </Card>
  );
}
