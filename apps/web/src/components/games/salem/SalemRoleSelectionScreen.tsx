import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Check, Shield, Flame, Users, Moon, Scroll } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemRoleSelectionScreen({ playerView, onAction, isHost }: Props) {
  const { me, players, availableRoles } = playerView;
  const playingCitizens = players.filter((p) => !p.isHost && p.canPlay !== false);
  const allReady = playingCitizens.length > 0 && playingCitizens.every((p) => p.hasSelectedRole);
  const unreadyPlayers = playingCitizens.filter((p) => !p.hasSelectedRole);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="border-b border-rule pb-6 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Salem 1692 • Town Inquest
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-ink mt-1">
            Choose Your Identity
          </h1>
          <p className="text-xs text-ink-muted font-mono mt-1">
            Citizens of Salem must adopt an identity before the witch trials begin. Roles remain secret.
          </p>
        </div>

        <div>
          {isHost ? (
            <div className="border border-rule-strong bg-ink text-canvas px-4 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs">
              <Shield size={15} />
              <span>Salem Magistrate (Host)</span>
            </div>
          ) : me.roleId ? (
            <div className="border border-rule-strong bg-ink text-canvas px-4 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs">
              <Check size={15} />
              <span>Identity: {me.roleName}</span>
            </div>
          ) : (
            <div className="border border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider animate-pulse">
              Claim Your Calling
            </div>
          )}
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableRoles?.map((role) => {
          const isSelected = me.roleId === role.id;
          const isFull = !role.isAvailable && !isSelected;

          return (
            <Card
              key={role.id}
              className={`p-6 flex flex-col justify-between border-2 transition-all ${
                isSelected
                  ? 'border-rule-strong ring-2 ring-ink ring-offset-2'
                  : 'border-rule'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 border border-rule bg-canvas-sunk text-ink">
                    {role.alignment === 'EVIL' ? 'Witchcraft' : 'Salem Citizen'}
                  </span>
                  <span className="text-xs font-mono font-bold text-ink-muted">
                    {role.takenSlots} / {role.totalSlots} Slots
                  </span>
                </div>

                <h3 className="text-2xl font-black uppercase tracking-tight text-ink mb-2 flex items-center gap-2">
                  {role.alignment === 'EVIL' ? <Flame size={20} className="text-red-500" /> : <Scroll size={20} />}
                  {role.name}
                </h3>

                <p className="text-xs text-ink-muted leading-relaxed mb-6">
                  {role.description}
                </p>
              </div>

              <Button
                disabled={isHost || isFull}
                variant={isSelected ? 'primary' : 'secondary'}
                onClick={() => !isHost && onAction('SELECT_ROLE', { roleId: role.id })}
                className="w-full text-xs font-bold"
              >
                {isHost ? 'Slot Quota' : isSelected ? 'Chosen' : isFull ? 'Quota Filled' : 'Claim Identity'}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Citizens Roster */}
      <Card className="p-6 border border-rule">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-4 border-b border-rule pb-3">
          <Users size={15} />
          Salem Citizens in Attendance ({players.length})
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className="p-3 border border-rule rounded-xs flex items-center justify-between"
            >
              <span className="text-xs font-bold text-ink truncate">
                {p.displayName} {p.id === me.id && '(You)'}
              </span>
              <span className={`text-[9px] font-mono uppercase font-bold ${p.hasSelectedRole ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                {p.hasSelectedRole ? 'Ready' : 'Choosing'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Start Button Bar */}
      <div className="border border-rule-strong p-6 rounded-xs bg-canvas flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="text-sm font-black uppercase text-ink">
            {allReady ? 'All Citizens Prepared' : 'Awaiting Selections'}
          </h4>
          <p className="text-xs text-ink-muted font-mono mt-0.5">
            {allReady
              ? isHost
                ? 'All citizens have claimed their identity. You may commence Night 1.'
                : 'Waiting for the Salem Magistrate (Host) to commence Night 1...'
              : `Waiting for: ${unreadyPlayers.map((p) => p.displayName).join(', ')}`}
          </p>
        </div>

        {isHost && (
          <Button
            size="lg"
            onClick={() => onAction('CONFIRM_START')}
            disabled={!allReady}
            className="w-full sm:w-auto min-w-[200px]"
          >
            Commence Night 1 <Moon size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
