import { useState, useEffect } from 'react';
import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Moon, Shield, Eye, Flame, SkipForward, Clock } from 'lucide-react';
import { salemAudio } from './audio/audio-service';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemNightPhaseScreen({ playerView, onAction, isHost }: Props) {
  const { me, players, night, roundNumber } = playerView;
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(night?.durationSeconds || 15);

  useEffect(() => {
    salemAudio.playCue('wake');
  }, [night?.currentRoleName]);

  useEffect(() => {
    if (!night?.stageEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((night.stageEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [night?.stageEndsAt]);

  const handleConfirmAction = () => {
    if (!selectedTargetId) return;
    salemAudio.playCue('action');
    onAction('NIGHT_ACTION', { targetPlayerId: selectedTargetId });
  };

  const handleSkip = () => {
    salemAudio.playCue('sleep');
    onAction('NIGHT_SKIP');
  };

  const isMyTurn = !!night?.isMyTurn;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Night Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
              Night {roundNumber}
            </span>
            <span className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Curfew of Salem
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-3">
            <Moon size={32} />
            The Settlement Sleeps
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-xs font-mono text-sm font-black flex items-center gap-2">
            <Clock size={16} />
            <span>00:{String(timeLeft).padStart(2, '0')}</span>
          </div>

          {(isHost || night?.allowSkip) && (
            <Button variant="secondary" size="sm" onClick={handleSkip} className="text-xs">
              <SkipForward size={14} className="mr-1" /> Skip
            </Button>
          )}
        </div>
      </div>

      {/* Host Moderator Banner */}
      {isHost && (
        <Card className="p-6 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">Magistrate Overview</span>
              <h3 className="text-xl font-black uppercase text-black dark:text-white">
                Active Calling: {night?.currentRoleName || 'Awaiting Shadows'}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-mono">
                The town is asleep. The active role is making their decision. You may skip if needed.
              </p>
            </div>
            <Button size="sm" onClick={handleSkip} className="text-xs">
              Advance Night <SkipForward size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Town Crier Divination Result Card */}
      {!isHost && isMyTurn && me.roleId === 'town_crier' && night?.latestInvestigation && (
        <Card className="p-8 border-2 border-black dark:border-white shadow-xl space-y-6 bg-zinc-50 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500 block">
                Town Crier • Inquest Revealed
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white mt-1 flex items-center gap-2">
                <Eye size={24} />
                Divination Result
              </h2>
            </div>
            <span className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold px-2 py-1 uppercase rounded-xs">
              Secret Knowledge
            </span>
          </div>

          <div className="p-6 border-2 border-black dark:border-white rounded-xs bg-white dark:bg-zinc-900 text-center space-y-3">
            <span className="text-xs font-mono uppercase text-zinc-500 tracking-wider block">
              Suspect Examined
            </span>
            <div className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
              {players.find((p) => p.id === night.latestInvestigation?.targetPlayerId)?.displayName || 'Unknown Suspect'}
            </div>
            <div className="pt-2">
              <span
                className={`inline-block text-xs font-mono font-black uppercase px-3 py-1 rounded-xs border ${
                  night.latestInvestigation.revealedAlignment === 'EVIL'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    : 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                Alignment: {night.latestInvestigation.revealedAlignment} ({night.latestInvestigation.revealedAlignment === 'EVIL' ? 'Witchcraft' : 'Salem Citizen'})
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
            <Button
              size="lg"
              variant="primary"
              onClick={handleSkip}
              className="text-xs font-bold min-w-[200px]"
            >
              Done • Close Eyes
            </Button>
          </div>
        </Card>
      )}

      {/* Player Night Action Section */}
      {!isHost && isMyTurn && !(me.roleId === 'town_crier' && night?.latestInvestigation) && (
        <Card className="p-8 border-2 border-black dark:border-white shadow-md space-y-6">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">
              Awaken, {me.roleName}
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
              Select Your Night Target
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Choose a citizen to target with your ability before dawn breaks.
            </p>
          </div>

          {/* Valid Target Selection Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {players
              .filter((p) => night?.validTargetIds?.includes(p.id))
              .map((target) => {
                const isSelected = selectedTargetId === target.id;
                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`p-4 border text-left rounded-xs transition-all ${
                      isSelected
                        ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-black'
                        : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-white hover:border-black'
                    }`}
                  >
                    <span className="text-sm block truncate">{target.displayName}</span>
                    <span className="text-[10px] font-mono uppercase opacity-70">Citizen</span>
                  </button>
                );
              })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              size="lg"
              disabled={!selectedTargetId}
              onClick={handleConfirmAction}
              className="text-xs font-bold min-w-[180px]"
            >
              Confirm Action
            </Button>
          </div>
        </Card>
      )}

      {/* Sleeping Citizen Message */}
      {!isHost && !isMyTurn && (
        <Card className="p-12 text-center border border-zinc-300 dark:border-zinc-800">
          <Moon size={40} className="mx-auto text-zinc-400 mb-4 animate-pulse" />
          <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
            You Are Asleep in Salem
          </h3>
          <p className="text-xs text-zinc-500 font-mono mt-2 max-w-md mx-auto">
            Rest quietly until the sun rises over Massachusetts Bay. Those with night gifts are acting in secret.
          </p>
        </Card>
      )}
    </div>
  );
}
