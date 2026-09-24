import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Sun, MessageSquare, Vote, Skull, ShieldCheck, Users } from 'lucide-react';

interface DayPhaseScreenProps {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function DayPhaseScreen({ playerView, onAction, isHost }: DayPhaseScreenProps) {
  const { me, players, roundNumber, day, phase } = playerView;

  const isAnnouncement = phase === 'DAY_ANNOUNCEMENT';
  const livingPlayers = players.filter((p) => p.isAlive && !p.isHost);
  const deadPlayers = players.filter((p) => !p.isAlive && !p.isHost);

  const handleProceedToDiscussion = () => {
    onAction('DAY_PROCEED');
  };

  const handleCallVote = () => {
    onAction('DAY_CALL_VOTE');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Day Banner */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
              Round {roundNumber}
            </span>
            <span className="border border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Day Phase
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-3">
            <Sun size={32} className="text-amber-500" />
            The Town Awakens
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            {isAnnouncement
              ? 'Dawn breaks over the village. Gather and witness what transpired in the dark.'
              : 'Real Talk Discussion in progress. No timer — discuss openly out loud or in chat.'}
          </p>
        </div>

        {/* Action Button to advance phase */}
        <div>
          {isHost ? (
            isAnnouncement ? (
              <Button size="lg" onClick={handleProceedToDiscussion} className="w-full sm:w-auto">
                Continue to Discussion
              </Button>
            ) : (
              <Button size="lg" onClick={handleCallVote} className="w-full sm:w-auto">
                <Vote size={16} className="mr-2" /> Start Town Voting
              </Button>
            )
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-2 rounded-xs font-mono text-xs text-zinc-500">
              Waiting for Moderator to proceed...
            </div>
          )}
        </div>
      </div>

      {/* Night Casualties Banner */}
      <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-3">
          Dawn Report
        </span>

        {day?.eliminatedPlayerNames && day.eliminatedPlayerNames.length > 0 ? (
          <div className="space-y-2">
            {day.eliminatedPlayerNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 border border-red-600/40 bg-red-50 dark:bg-red-950/20 rounded-xs text-red-700 dark:text-red-400"
              >
                <Skull size={20} className="shrink-0" />
                <div>
                  <span className="text-sm font-black uppercase tracking-wider block">{name}</span>
                  <span className="text-[10px] font-mono uppercase">Was found dead at dawn</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/20 rounded-xs text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={20} className="shrink-0" />
            <div>
              <span className="text-sm font-black uppercase tracking-wider block">
                Peaceful Night
              </span>
              <span className="text-[10px] font-mono uppercase">
                No villagers were harmed last night.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Living Town Roster */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-2">
            <Users size={15} />
            Living Citizens ({livingPlayers.length})
          </h3>
          <span className="text-xs font-mono text-zinc-500">
            Deceased: {deadPlayers.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {livingPlayers.map((p) => {
            const isMe = p.id === me.id;
            return (
              <div
                key={p.id}
                className="p-3.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xs flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="block text-xs font-black uppercase text-black dark:text-white truncate">
                    {p.displayName} {isMe && '(You)'}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 block">
                    Seat #{p.seatNumber}
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Cemetery / Dead Players */}
      {deadPlayers.length > 0 && (
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-2">
            <Skull size={15} />
            The Cemetery ({deadPlayers.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {deadPlayers.map((p) => (
              <div
                key={p.id}
                className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-xs text-xs font-mono text-zinc-500 flex items-center justify-between"
              >
                <span className="line-through truncate">{p.displayName}</span>
                <span className="text-[9px] uppercase font-bold text-zinc-400">DEAD</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
