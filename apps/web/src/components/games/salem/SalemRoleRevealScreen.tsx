import { useState } from 'react';
import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Shield, Moon, CheckCircle2 } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemRoleRevealScreen({ playerView, onAction, isHost }: Props) {
  const { me, players } = playerView;
  const playingPlayers = players.filter((p) => !p.isHost && p.canPlay !== false);
  const readyCount = playingPlayers.filter((p) => p.roleRevealedReady).length;
  const totalPlaying = playingPlayers.length;
  const allReady = readyCount === totalPlaying;

  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(!!me.roleRevealedReady);

  const handleAcknowledge = () => {
    setHasAcknowledged(true);
    onAction('ACKNOWLEDGE_ROLE');
  };

  const handleStartNight1 = () => {
    onAction('START_NIGHT_1');
  };

  if (isHost) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
              Salem Moderator Deck
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
              Role Cards Distributed
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Citizens are privately examining their secret roles on mobile.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 rounded-xs text-xs font-mono font-bold">
              Ready: {readyCount} / {totalPlaying}
            </div>

            <Button
              variant="primary"
              onClick={handleStartNight1}
              className="font-mono text-xs uppercase tracking-wider py-2.5 px-6 font-bold flex items-center gap-2"
            >
              <Moon size={14} />
              <span>{allReady ? 'Start Night 1' : 'Force Start Night 1'}</span>
            </Button>
          </div>
        </div>

        <Card className="p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <span className="text-xs font-mono font-bold uppercase text-zinc-500">
              Citizen Read Status
            </span>
            <span className="text-xs font-mono text-zinc-500">
              {allReady ? 'All citizens are ready' : 'Waiting for citizens to review cards...'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playingPlayers.map((p) => {
              const isReady = !!p.roleRevealedReady;
              return (
                <div
                  key={p.id}
                  className={`p-3 border rounded-xs flex items-center justify-between font-mono text-xs transition-all ${
                    isReady
                      ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-black dark:text-white'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    <span className="font-bold">{p.displayName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isReady ? (
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                        Reading Card...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const isWitch = me.team === 'WITCH' || me.roleId === 'witch';
  const isEvil = me.alignment === 'EVIL';

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
      <div className="text-center space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
          Salem 1692 Secret Identity
        </span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white">
          Your Secret Role Card
        </h1>
        <p className="text-xs text-zinc-500 font-mono">
          Keep this hidden from other citizens in Salem.
        </p>
      </div>

      <Card
        className={`p-6 border-2 transition-all text-center space-y-6 shadow-lg ${
          isEvil
            ? 'border-red-600/80 bg-red-950/10 dark:bg-red-950/20'
            : 'border-black dark:border-white bg-white dark:bg-black'
        }`}
      >
        <div className="flex justify-center items-center gap-2">
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-1 uppercase tracking-wider rounded-xs border ${
              isEvil
                ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/30'
                : 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
            }`}
          >
            {me.alignment} ALIGNMENT
          </span>

          {me.category && (
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 uppercase tracking-wider rounded-xs border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
              {me.category}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight text-black dark:text-white">
            {me.roleName || 'Puritan'}
          </h2>
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-1 block">
            Team: {me.team}
          </span>
        </div>

        {isWitch && me.covenTeammates && me.covenTeammates.length > 0 && (
          <div className="p-3 border border-red-500/40 bg-red-500/10 rounded-xs text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-red-600 dark:text-red-400 block mb-1">
              Witch Coven (Your Allies):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {me.covenTeammates.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 bg-red-600 text-white rounded-xs text-xs font-mono font-bold"
                >
                  {t.displayName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          {hasAcknowledged ? (
            <div className="p-3 border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xs text-xs font-mono font-bold flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              <span>Ready — Waiting for Night 1...</span>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={handleAcknowledge}
              className="w-full font-mono text-xs uppercase tracking-wider py-3.5 px-6 font-bold"
            >
              I Understand My Role / Ready
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
