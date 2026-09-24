import { useState } from 'react';
import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Check, AlertCircle, Smartphone } from 'lucide-react';
import { useGameStore } from '../../../stores/gameStore';

interface Props {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function PhysicalRoleSelectionScreen({ playerView, onAction, isHost }: Props) {
  const { me, availableRoles = [] } = playerView;
  const actionError = useGameStore((s) => s.actionError);
  const setActionError = useGameStore((s) => s.setActionError);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(me.roleId || null);

  const handleSelectRole = (roleId: string) => {
    if (me.roleConfirmed) return;
    if (actionError) setActionError(null);
    setSelectedRoleId(roleId);
  };

  const handleConfirmRole = () => {
    if (!selectedRoleId || me.roleConfirmed) return;
    onAction('SELECT_ROLE', { roleId: selectedRoleId });
    onAction('CONFIRM_ROLE');
  };

  const handleClearSelection = () => {
    if (me.roleConfirmed) return;
    setSelectedRoleId(null);
    if (actionError) setActionError(null);
  };

  const handleHostStartGame = () => {
    onAction('START_GAME');
  };

  const selectedRole = availableRoles.find((r) => r.id === selectedRoleId);

  const filteredRoles = availableRoles.filter((r) => {
    if (r.totalSlots <= 0) return false;
    if (activeCategory === 'ALL') return true;
    return r.category === activeCategory;
  });

  // Moderator / Host view
  if (isHost) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 text-center sm:text-left">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Moderator Monitor
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
            Physical Card Selection
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Players are entering their physical board game cards into their phones.
          </p>
        </div>

        {actionError && (
          <div className="p-4 border border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xs text-xs font-mono flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <Card className="p-8 border border-zinc-300 dark:border-zinc-800 text-center space-y-6">
          <div className="w-12 h-12 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-600 dark:text-zinc-300">
            <Smartphone size={24} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-black text-sm uppercase tracking-wider text-black dark:text-white">
              Zero-Leak Confidentiality Active
            </h3>
            <p className="text-xs text-zinc-500 font-mono leading-relaxed">
              Role assignments are strictly confidential. To prevent deduction or timing leaks, player confirmation progress is not visible.
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              Once all players have entered their physical cards, press the button below to start the game.
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              variant="primary"
              size="lg"
              onClick={handleHostStartGame}
              className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider py-3 px-8 font-bold"
            >
              Start Game
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Player mobile view
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Physical Card Verification
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
            Pick Your Physical Card
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Look at the card dealt to you in real life and select it below.
          </p>
        </div>

        {me.roleConfirmed ? (
          <div className="px-3 py-1.5 border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xs text-xs font-mono font-bold flex items-center gap-1.5">
            <Check size={14} />
            <span>Card Confirmed</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 border border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xs text-xs font-mono font-bold">
            Select & Confirm Below
          </div>
        )}
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 border border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xs text-xs font-mono flex items-center gap-3">
          <AlertCircle size={16} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Confirmed Banner */}
      {me.roleConfirmed && (
        <Card className="p-6 border border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/10 text-center space-y-2">
          <div className="inline-flex p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <Check size={24} />
          </div>
          <h3 className="font-bold text-sm uppercase text-black dark:text-white">
            Role confirmed. Please wait for the game to start.
          </h3>
          <p className="text-xs text-zinc-500 font-mono">
            Your card is locked in. The host will start the round once all players are confirmed.
          </p>
        </Card>
      )}

      {/* Selected State: "You selected: [Role Name] [CONFIRM] [CHANGE]" */}
      {!me.roleConfirmed && selectedRole && (
        <div className="p-4 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Current Selection
            </span>
            <span className="text-base font-black uppercase text-black dark:text-white">
              You selected: <span className="underline">{selectedRole.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="flex-1 sm:flex-initial text-xs uppercase font-mono"
            >
              Change
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmRole}
              className="flex-1 sm:flex-initial text-xs uppercase font-mono font-bold px-6"
            >
              Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      {!me.roleConfirmed && (
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          {(['ALL', 'VILLAGER', 'WEREWOLF', 'NEUTRAL', 'ADDITIONAL'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-xs border transition-all ${
                activeCategory === cat
                  ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
              }`}
            >
              {cat === 'VILLAGER' ? 'Villagers' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Roles Grid: Zero-Leak (No slot counts, no disabled state) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredRoles.map((role) => {
          const isSelected = selectedRoleId === role.id;

          return (
            <div
              key={role.id}
              onClick={() => !me.roleConfirmed && handleSelectRole(role.id)}
              className={`p-4 border rounded-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-black dark:border-white ring-2 ring-black dark:ring-white bg-zinc-50 dark:bg-zinc-900'
                  : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-black'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-sm uppercase text-black dark:text-white">
                    {role.name}
                  </h4>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-xs border ${
                      role.alignment === 'EVIL'
                        ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                        : 'border-zinc-400 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  >
                    {role.alignment}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{role.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
