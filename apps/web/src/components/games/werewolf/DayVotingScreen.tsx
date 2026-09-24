import { useState } from 'react';
import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Vote, Check, ShieldAlert, Users, SkipForward } from 'lucide-react';

interface DayVotingScreenProps {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function DayVotingScreen({ playerView, onAction, isHost }: DayVotingScreenProps) {
  const { me, players, roundNumber } = playerView;
  const livingPlayers = players.filter((p) => p.isAlive && !p.isHost);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const hasVoted = !!me.hasVoted;
  const votedCount = livingPlayers.filter((p) => p.hasVoted).length;

  const handleCastVote = () => {
    if (!selectedTargetId) return;
    onAction('DAY_VOTE', { targetPlayerId: selectedTargetId });
  };

  const handleFinishVotingEarly = () => {
    onAction('DAY_FINISH_VOTING');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Voting Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
              Round {roundNumber}
            </span>
            <span className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Town Tribunal
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-3">
            <Vote size={32} />
            Vote For Execution
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Cast your ballot. The player with the strict plurality of votes will be executed.
          </p>
        </div>

        {/* Voting Progress Counter */}
        <div className="border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-5 py-3 rounded-xs text-right">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
            Ballots Cast
          </span>
          <span className="text-2xl font-mono font-black text-black dark:text-white">
            {votedCount} / {livingPlayers.length}
          </span>
        </div>
      </div>

      {/* Voting Instructions Card */}
      {isHost ? (
        <Card className="p-4 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/60 text-center">
          <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider">
            Host Moderator Monitor: You do not vote. Observe town voting or conclude ballots when discussion ends.
          </p>
        </Card>
      ) : !me.isAlive ? (
        <Card className="p-4 border border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 text-center">
          <p className="text-xs font-mono text-zinc-500">
            You are deceased and cannot cast a ballot. You observe the town trial in spirit.
          </p>
        </Card>
      ) : hasVoted ? (
        <Card className="p-4 border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/20 text-center">
          <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
            <Check size={16} /> Your ballot is locked. Waiting for remaining citizens to vote...
          </p>
        </Card>
      ) : (
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-bold">
          Select one suspect to vote for execution, or choose to abstain:
        </p>
      )}

      {/* Suspects Grid */}
      {!isHost && me.isAlive && !hasVoted && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {livingPlayers.map((target) => {
            const isSelected = selectedTargetId === target.id;
            const isMe = target.id === me.id;

            return (
              <button
                key={target.id}
                type="button"
                onClick={() => setSelectedTargetId(target.id)}
                className={`w-full p-4 rounded-xs border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black ring-2 ring-black dark:ring-white shadow-lg'
                    : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-black dark:text-white hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="block text-sm font-black uppercase truncate tracking-wider">
                    {target.displayName} {isMe && '(Self)'}
                  </span>
                  <span className={`text-[10px] font-mono block ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500'}`}>
                    Seat #{target.seatNumber}
                  </span>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={14} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
                )}
              </button>
            );
          })}

          {/* Abstain / Skip Execution Option */}
          <button
            type="button"
            onClick={() => setSelectedTargetId('SKIP')}
            className={`w-full p-4 rounded-xs border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedTargetId === 'SKIP'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black ring-2 ring-black dark:ring-white shadow-lg'
                : 'border-dashed border-zinc-400 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <div className="min-w-0 pr-2">
              <span className="block text-sm font-black uppercase truncate tracking-wider flex items-center gap-1.5">
                <SkipForward size={14} /> Abstain (No Lynch)
              </span>
              <span className={`text-[10px] font-mono block ${selectedTargetId === 'SKIP' ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500'}`}>
                Vote to spare all players today
              </span>
            </div>

            {selectedTargetId === 'SKIP' ? (
              <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white flex items-center justify-center shrink-0">
                <Check size={14} />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border border-zinc-400 dark:border-zinc-600 shrink-0" />
            )}
          </button>
        </div>
      )}

      {/* Voters Status Roster */}
      <Card className="p-5 border border-zinc-300 dark:border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-3">
          Citizens Status
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {livingPlayers.map((p) => (
            <div
              key={p.id}
              className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-xs flex items-center justify-between text-xs font-mono"
            >
              <span className="truncate">{p.displayName}</span>
              <span className={`text-[10px] font-bold ${p.hasVoted ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                {p.hasVoted ? '? Voted' : '	 Thinking'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Footer Controller Bar */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFinishVotingEarly}
              className="text-xs"
            >
              Close Voting & Tally Early
            </Button>
          )}
        </div>

        {!isHost && me.isAlive && !hasVoted && (
          <Button
            size="lg"
            disabled={!selectedTargetId}
            onClick={handleCastVote}
            className="w-full sm:w-auto min-w-[200px]"
          >
            Submit Vote
          </Button>
        )}
      </div>
    </div>
  );
}
