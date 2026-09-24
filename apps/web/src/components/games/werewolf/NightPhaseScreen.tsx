import { useState, useEffect } from 'react';
import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { werewolfAudio } from './audio/audio-service';
import { Moon, Eye, Shield, Skull, Heart, ShieldAlert, Sparkles, Check, AlertCircle } from 'lucide-react';

interface NightPhaseScreenProps {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost?: boolean;
}

export function NightPhaseScreen({ playerView, onAction, isHost }: NightPhaseScreenProps) {
  const { me, players, roundNumber, night } = playerView;

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedPoisonId, setSelectedPoisonId] = useState<string | null>(null);
  const [useHeal, setUseHeal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Play audio cue when my turn begins
  useEffect(() => {
    if (night?.isMyTurn) {
      werewolfAudio.playCue('wake');
      setSubmitted(false);
      setSelectedTargetId(null);
      setSelectedPoisonId(null);
      setUseHeal(false);
    }
  }, [night?.isMyTurn, night?.currentRoleName]);

  // Realtime countdown based on server timestamp
  useEffect(() => {
    if (!night?.stageEndsAt) {
      setTimeLeft(night?.durationSeconds || 0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((night.stageEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [night?.stageEndsAt, night?.durationSeconds]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleConfirmAction = () => {
    if (me.roleId === 'witch') {
      onAction('NIGHT_ACTION', {
        isHeal: useHeal,
        targetPlayerId: useHeal ? night?.victimToHealId : undefined,
        isPoison: !!selectedPoisonId,
        secondaryTargetPlayerId: selectedPoisonId || undefined,
      });
    } else {
      if (!selectedTargetId) return;
      onAction('NIGHT_ACTION', { targetPlayerId: selectedTargetId });
    }
    setSubmitted(true);
  };

  const handleSkip = () => {
    onAction('NIGHT_SKIP');
    setSubmitted(true);
  };

  // Host Moderator View (Screen cannot play and cannot choose from anything)
  if (isHost) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-8">
        <div className="w-16 h-16 rounded-full border-2 border-zinc-700 bg-zinc-900/60 text-zinc-300 flex items-center justify-center mx-auto mb-2">
          <Moon size={32} />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-2">
            Night {roundNumber} • Moderator Command
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            {night?.currentRoleName ? `${night.currentRoleName} Stage` : 'Night Phase In Progress'}
          </h1>
          <p className="text-zinc-400 text-xs font-mono mt-3 max-w-md mx-auto leading-relaxed">
            Players are executing their secret night actions on mobile. Keep room silence until dawn.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="border border-zinc-700 bg-zinc-900/90 px-6 py-3 rounded-xs text-center inline-block">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
              Stage Countdown
            </span>
            <span className="text-3xl font-mono font-black text-white tracking-widest">
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>

        <Card className="p-6 border border-zinc-800 bg-zinc-950/80 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-zinc-800 bg-zinc-900 text-xs font-mono uppercase tracking-wider text-zinc-400 rounded-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Active Role Turn: <strong className="text-white">{night?.currentRoleName || 'Processing'}</strong>
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            Moderator view active. As room monitor, you cannot choose actions or influence night outcomes.
          </p>
          <div className="pt-3 border-t border-zinc-900 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="text-xs font-mono uppercase tracking-wider"
            >
              Skip / Next Stage
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If not my turn or dead or sleeping Villager
  if (!night?.isMyTurn || !me.isAlive) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-8">
        <div className="w-16 h-16 rounded-full border-2 border-zinc-700 bg-zinc-900/60 text-zinc-400 flex items-center justify-center mx-auto mb-2 animate-pulse">
          <Moon size={32} />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-2">
            Night {roundNumber}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            The Village Sleeps
          </h1>
          <p className="text-zinc-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            Shadows move through the mist. Close your eyes and wait for dawn.
          </p>
        </div>

        <Card className="p-8 border border-zinc-800 bg-zinc-950/80 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-zinc-800 bg-zinc-900 text-xs font-mono uppercase tracking-wider text-zinc-400 rounded-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Night Actions In Progress
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            {me.isAlive
              ? 'You have no action at this time. Keep quiet until the sun rises.'
              : 'You have passed away. You watch over the village in silence.'}
          </p>
          <div className="pt-2 border-t border-zinc-900 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            Next Phase: Dawn Discussion
          </div>
        </Card>
      </div>
    );
  }

  // Active Role Night Action UI
  const validTargets = players.filter((p) => night.validTargetIds?.includes(p.id));

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Night Header & Role Wakeup */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
              Night {roundNumber}
            </span>
            <span className="border border-red-500/30 bg-red-950/20 text-red-400 text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Your Turn
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            {night.currentRoleName}
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {me.roleId === 'werewolf' && 'Choose your pack attack target.'}
            {me.roleId === 'seer' && 'Select one player to uncover their true alignment.'}
            {me.roleId === 'defender' && 'Select one player to shield from death tonight.'}
            {me.roleId === 'constable' && 'Designate one player to guard tonight.'}
            {me.roleId === 'witch' && 'Choose whether to use your Life or Death potions.'}
          </p>
        </div>

        {/* Big Touch-Friendly Countdown Timer */}
        <div className="border border-zinc-700 bg-zinc-900/90 px-5 py-3 rounded-xs text-right shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
            Time Left
          </span>
          <span className="text-3xl font-mono font-black text-white tracking-widest">
            {formatTimer(timeLeft)}
          </span>
        </div>
      </div>

      {/* Werewolf Pack Teammates Panel */}
      {me.roleId === 'werewolf' && me.teammates && me.teammates.length > 0 && (
        <Card className="p-4 border border-red-900/40 bg-red-950/10">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-red-400 block mb-1">
            Werewolf Pack
          </span>
          <p className="text-xs text-zinc-400">
            Fellow Wolves: <strong className="text-white">{me.teammates.map((t) => t.displayName).join(', ')}</strong>
          </p>
        </Card>
      )}

      {/* Seer Live Divination Result Card */}
      {me.roleId === 'seer' && night.latestInvestigation && (
        <Card className="p-6 border-2 border-amber-500 bg-zinc-950 rounded-xs text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs border border-amber-500/40 bg-amber-950/30 text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">
            <Sparkles size={14} /> Divination Revealed
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Suspect Divined
            </span>
            <h2 className="text-3xl font-black uppercase text-white tracking-wide">
              {night.latestInvestigation.targetDisplayName}
            </h2>
          </div>

          <div className="inline-block px-5 py-2.5 rounded-xs border border-zinc-800 font-mono font-black text-sm uppercase tracking-wider bg-black">
            {night.latestInvestigation.revealedAlignment === 'EVIL' ? (
              <span className="text-red-400 font-black flex items-center justify-center gap-2">
                <Skull size={16} /> ALIGNMENT: EVIL (Werewolf)
              </span>
            ) : (
              <span className="text-emerald-400 font-black flex items-center justify-center gap-2">
                <Shield size={16} /> ALIGNMENT: GOOD (Villager)
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto">
            You have uncovered their true nature. When you have committed this truth to memory, close your eyes.
          </p>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSkip}
              className="font-mono text-xs uppercase tracking-wider py-3 px-8 font-bold"
            >
              Done • Close Eyes
            </Button>
          </div>
        </Card>
      )}

      {/* Seer Past Investigations Panel */}
      {me.roleId === 'seer' && me.investigations && me.investigations.length > 0 && !night.latestInvestigation && (
        <Card className="p-4 border border-zinc-800 bg-zinc-950/60">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-400 block mb-2">
            Your Past Divinations
          </span>
          <div className="flex flex-wrap gap-2">
            {me.investigations.map((inv, idx) => (
              <span
                key={idx}
                className={`text-xs font-mono px-2.5 py-1 rounded-xs border font-bold ${
                  inv.revealedAlignment === 'EVIL'
                    ? 'border-red-600 bg-red-950/30 text-red-400'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-200'
                }`}
              >
                {inv.targetDisplayName}: {inv.revealedAlignment}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Witch Potion Controls */}
      {me.roleId === 'witch' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Heal Potion */}
          <Card className={`p-5 border ${useHeal ? 'border-white bg-zinc-900' : 'border-zinc-800 bg-zinc-950'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <Heart size={15} className="text-emerald-400" /> Life Potion (Heal)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {me.witchUsedHeal ? 'USED' : '1 Available'}
              </span>
            </div>
            {night.victimToHealId ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Werewolves attacked: <strong className="text-white">
                    {players.find((p) => p.id === night.victimToHealId)?.displayName || 'A villager'}
                  </strong>
                </p>
                <Button
                  size="sm"
                  variant={useHeal ? 'primary' : 'outline'}
                  disabled={me.witchUsedHeal || submitted}
                  onClick={() => setUseHeal(!useHeal)}
                  className="w-full text-xs"
                >
                  {useHeal ? '? Healing Selected' : 'Use Life Potion'}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono">No attacked victim to heal tonight.</p>
            )}
          </Card>

          {/* Poison Potion */}
          <Card className={`p-5 border ${selectedPoisonId ? 'border-red-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-950'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <Skull size={15} className="text-red-400" /> Death Potion (Poison)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {me.witchUsedPoison ? 'USED' : '1 Available'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              {me.witchUsedPoison ? 'You have already used your Death Potion.' : 'Choose a player below to poison tonight.'}
            </p>
            {selectedPoisonId && (
              <div className="flex items-center justify-between p-2 bg-red-950/20 border border-red-500/30 rounded-xs text-xs font-mono text-red-400">
                <span>Poisoning: {players.find((p) => p.id === selectedPoisonId)?.displayName}</span>
                <button onClick={() => setSelectedPoisonId(null)} className="underline hover:text-white">Cancel</button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Target Selection Grid (Mobile First Large Touch Buttons) */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-400 mb-3">
          {me.roleId === 'witch' ? 'Select Target For Death Potion' : 'Select Target'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {validTargets.map((target) => {
            const isSelected =
              me.roleId === 'witch'
                ? selectedPoisonId === target.id
                : selectedTargetId === target.id;

            const isWerewolf = me.roleId === 'werewolf';
            const wolfVoters = isWerewolf && night?.groupVotes
              ? Object.entries(night.groupVotes)
                  .filter(([wolfId, targetId]) => targetId === target.id)
                  .map(([wolfId]) => {
                    const wolfPlayer = players.find((p) => p.id === wolfId);
                    return wolfPlayer ? (wolfPlayer.id === me.id ? 'YOU' : wolfPlayer.displayName) : 'WOLF';
                  })
              : [];

            return (
              <button
                key={target.id}
                type="button"
                disabled={submitted}
                onClick={() => {
                  if (me.roleId === 'witch') {
                    if (me.witchUsedPoison) return;
                    setSelectedPoisonId(selectedPoisonId === target.id ? null : target.id);
                  } else {
                    setSelectedTargetId(target.id);
                    if (me.roleId === 'werewolf') {
                      onAction('NIGHT_ACTION', { targetPlayerId: target.id });
                    }
                  }
                }}
                className={`w-full p-4 rounded-xs border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-white bg-white text-black ring-2 ring-white shadow-lg'
                    : 'border-zinc-800 bg-zinc-900 text-white hover:border-zinc-600 hover:bg-zinc-800/80'
                }`}
              >
                <div className="min-w-0 pr-2 flex-1">
                  <span className="block text-sm font-black uppercase truncate tracking-wider">
                    {target.displayName}
                  </span>
                  <span className={`text-[10px] font-mono block ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    Seat #{target.seatNumber}
                  </span>

                  {wolfVoters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs border flex items-center gap-1 ${
                        isSelected
                          ? 'border-red-600 bg-red-100 text-red-700'
                          : 'border-red-500/50 bg-red-950/40 text-red-400'
                      }`}>
                        <Skull size={10} />
                        {wolfVoters.join(' • ')} TARGET
                      </span>
                    </div>
                  )}
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-zinc-700 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Confirmation & Skip Row */}
      <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {submitted ? (
            <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <Check size={15} /> Action recorded. Waiting for others or timer...
            </p>
          ) : (
            <p className="text-xs font-mono text-zinc-500">
              {selectedTargetId || useHeal || selectedPoisonId
                ? 'Ready to submit your decision.'
                : 'Choose a target or press Skip.'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {night.allowSkip && (
            <Button
              variant="outline"
              size="lg"
              disabled={submitted}
              onClick={handleSkip}
              className="flex-1 sm:flex-initial text-xs"
            >
              Skip Turn
            </Button>
          )}

          <Button
            size="lg"
            disabled={
              submitted ||
              (me.roleId !== 'witch' && !selectedTargetId) ||
              (me.roleId === 'witch' && !useHeal && !selectedPoisonId)
            }
            onClick={handleConfirmAction}
            className="flex-1 sm:flex-initial min-w-[180px] text-xs"
          >
            {submitted ? 'Submitted' : 'Confirm Action'}
          </Button>
        </div>
      </div>
    </div>
  );
}
