import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Check, Shield, Eye, Sparkles, Moon, Users, UserCheck } from 'lucide-react';

interface RoleSelectionScreenProps {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function RoleSelectionScreen({
  playerView,
  onAction,
  isHost,
}: RoleSelectionScreenProps) {
  const { me, players, availableRoles } = playerView;
  const playingPlayers = players.filter((p) => !p.isHost && p.canPlay !== false);
  const allReady = playingPlayers.length > 0 && playingPlayers.every((p) => p.hasSelectedRole);
  const unreadyPlayers = playingPlayers.filter((p) => !p.hasSelectedRole);

  const handleSelectRole = (roleId: string) => {
    onAction('SELECT_ROLE', { roleId });
  };

  const handleConfirmStart = () => {
    onAction('CONFIRM_START');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header Banner */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Pre-Game Preparation
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
            Choose Your Role
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Every player must confirm their role before the game can begin. Roles remain strictly secret.
          </p>
        </div>

        {/* Selected Role Status Pill */}
        <div className="flex items-center gap-3">
          {isHost ? (
            <div className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs">
              <Shield size={15} />
              <span>Host Moderator Screen</span>
            </div>
          ) : me.roleId ? (
            <div className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs">
              <Check size={15} />
              <span>Selected: {me.roleName}</span>
            </div>
          ) : (
            <div className="border border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider animate-pulse">
              Select a Role Below
            </div>
          )}
        </div>
      </div>

      {/* Role Selection Grid */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 mb-4">
          Available Roles & Slots
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableRoles?.map((role) => {
            const isSelectedByMe = me.roleId === role.id;
            const slotsFull = !role.isAvailable && !isSelectedByMe;

            return (
              <Card
                key={role.id}
                className={`p-5 flex flex-col justify-between transition-all border ${
                  isSelectedByMe
                    ? 'border-black dark:border-white ring-2 ring-black dark:ring-white bg-zinc-50 dark:bg-zinc-900'
                    : slotsFull
                    ? 'border-zinc-200 dark:border-zinc-800 opacity-50 bg-zinc-100/50 dark:bg-zinc-950'
                    : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-black uppercase text-black dark:text-white">
                      {role.name}
                    </h3>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs border ${
                        role.alignment === 'EVIL'
                          ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                          : 'border-zinc-400 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800'
                      }`}
                    >
                      {role.alignment}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    {role.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    Slots: {role.takenSlots} / {role.totalSlots}
                  </span>

                  <Button
                    size="sm"
                    variant={isSelectedByMe ? 'primary' : 'secondary'}
                    disabled={isHost || slotsFull}
                    onClick={() => !isHost && handleSelectRole(role.id)}
                    className="text-xs px-4"
                  >
                    {isHost ? 'Role Quota' : isSelectedByMe ? 'Selected' : slotsFull ? 'Full' : 'Select'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Players Readiness Roster (Strict Privacy - No roles revealed!) */}
      <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
            <Users size={15} />
            Room Players ({players.length})
          </h3>
          <span className="text-xs font-mono text-zinc-500">
            {allReady ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">All Ready</span>
            ) : (
              `Waiting for ${unreadyPlayers.length} player(s)`
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.map((p) => {
            const isMe = p.id === me.id;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xs bg-zinc-50 dark:bg-zinc-900/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      p.hasSelectedRole ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="text-xs font-bold text-black dark:text-white truncate">
                    {p.displayName} {isMe && '(You)'}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase font-bold shrink-0 ml-2 ${
                    p.hasSelectedRole
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {p.hasSelectedRole ? '? Ready' : 'Selecting'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Game Start Controller Bar */}
      <div className="border border-black dark:border-white p-6 rounded-xs bg-white dark:bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="text-sm font-black uppercase text-black dark:text-white">
            {allReady ? 'All Players Are Ready!' : 'Waiting For Role Selections'}
          </h4>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            {allReady
              ? isHost
                ? 'You can now start Night 1.'
                : 'Waiting for the room host to initiate Night 1...'
              : `Waiting for: ${unreadyPlayers.map((p) => p.displayName).join(', ')}`}
          </p>
        </div>

        {isHost && (
          <Button
            size="lg"
            onClick={handleConfirmStart}
            disabled={!allReady}
            className="w-full sm:w-auto min-w-[200px]"
          >
            Start Game <Moon size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

