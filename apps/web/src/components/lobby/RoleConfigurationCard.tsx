import { useState } from 'react';
import { RoleRegistry } from '@party/werewolf';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Shield, Sparkles, AlertCircle, RefreshCw, Layers, Check, HelpCircle } from 'lucide-react';
import type { RoomGameSettings } from '@party/shared-types';

interface Props {
  isHost: boolean;
  playingPlayerCount: number;
  settings?: RoomGameSettings;
  onUpdateSettings: (settings: Partial<RoomGameSettings> & { resetToDefault?: boolean }) => void;
}

export function RoleConfigurationCard({
  isHost,
  playingPlayerCount,
  settings = {},
  onUpdateSettings,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const roleAssignmentMode = settings.roleAssignmentMode || 'PHYSICAL';
  const roleCounts = settings.roleCounts || {};
  const isCustomized = !!settings.isRoleConfigurationCustomized;
  const tieRule = settings.werewolfTieRule || 'NO_KILL';

  const roles = RoleRegistry.getInstance().list();

  const totalConfigured: number = Object.values(roleCounts).reduce(
    (acc: number, c: number) => acc + (c || 0),
    0
  );
  const isValid = totalConfigured === playingPlayerCount;
  const diff = totalConfigured - playingPlayerCount;

  const handleModeChange = (mode: 'PHYSICAL' | 'RANDOM') => {
    if (!isHost) return;
    onUpdateSettings({ roleAssignmentMode: mode });
  };

  const handleCountChange = (roleId: string, delta: number) => {
    if (!isHost) return;
    const current = roleCounts[roleId] || 0;
    const updated = Math.max(0, current + delta);
    const newRoleCounts = { ...roleCounts, [roleId]: updated };
    onUpdateSettings({ roleCounts: newRoleCounts });
  };

  const handleResetToDefault = () => {
    if (!isHost) return;
    onUpdateSettings({ resetToDefault: true });
  };

  const handleTieRuleChange = (newRule: 'NO_KILL' | 'RANDOM' | 'HOST_DECIDES') => {
    if (!isHost) return;
    onUpdateSettings({ werewolfTieRule: newRule });
  };

  // Group roles by category
  const categories = Array.from(new Set(roles.map((r) => r.category)));
  const filteredRoles =
    activeCategory === 'ALL'
      ? roles
      : roles.filter((r) => r.category === activeCategory);

  return (
    <Card className="p-6 border border-rule space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-rule">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted">
              Pre-Game Role Setup
            </span>
            {isCustomized ? (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-xs border border-ink/40 text-ink-muted bg-surface font-bold">
                Customized
              </span>
            ) : (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-xs border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 font-bold">
                Auto-Adjust
              </span>
            )}
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-ink">
            Role Roster & Assignment
          </h3>
          <p className="text-xs text-ink-muted font-mono mt-0.5">
            {isHost
              ? 'Configure player roles and distribution mode before launching the round.'
              : 'View host-configured role roster and game settings.'}
          </p>
        </div>

        {/* Status Pill */}
        <div
          className={`px-3 py-1.5 rounded-xs border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${
            isValid
              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
              : 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
          }`}
        >
          {isValid ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>
            {totalConfigured} / {playingPlayerCount} Roles
          </span>
        </div>
      </div>

      {/* Validation Alert */}
      {!isValid && (
        <div className="p-3.5 border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 rounded-xs text-xs font-mono flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wide block">
              Player Count Mismatch
            </span>
            <p className="text-[11px] leading-relaxed">
              Configured roles ({totalConfigured}) must exactly equal active players ({playingPlayerCount}).{' '}
              {diff > 0
                ? `Please remove ${diff} role slot(s).`
                : `Please add ${Math.abs(diff)} more role slot(s).`}
            </p>
          </div>
        </div>
      )}

      {/* Mode Switcher: Physical vs Random */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-ink-muted uppercase tracking-widest font-bold block">
          Assignment Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Physical Button */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeChange('PHYSICAL')}
            className={`p-3.5 rounded-xs border text-left transition-all ${
              roleAssignmentMode === 'PHYSICAL'
                ? 'border-rule-strong bg-ink text-canvas ring-1 ring-ink'
                : 'border-rule hover:border-ink/40 text-ink bg-canvas'
            } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} /> Mode A: Physical / Board Game
              </span>
              {roleAssignmentMode === 'PHYSICAL' && <Check size={14} />}
            </div>
            <p
              className={`text-[11px] font-mono leading-relaxed ${
                roleAssignmentMode === 'PHYSICAL' ? 'opacity-80' : 'text-ink-muted'
              }`}
            >
              Players deal physical cards in real life and input their card secretly on mobile.
            </p>
          </button>

          {/* Random Button */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeChange('RANDOM')}
            className={`p-3.5 rounded-xs border text-left transition-all ${
              roleAssignmentMode === 'RANDOM'
                ? 'border-rule-strong bg-ink text-canvas ring-1 ring-ink'
                : 'border-rule hover:border-ink/40 text-ink bg-canvas'
            } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Mode B: Online Random
              </span>
              {roleAssignmentMode === 'RANDOM' && <Check size={14} />}
            </div>
            <p
              className={`text-[11px] font-mono leading-relaxed ${
                roleAssignmentMode === 'RANDOM' ? 'opacity-80' : 'text-ink-muted'
              }`}
            >
              The system automatically shuffles and assigns roles in secret to each player.
            </p>
          </button>
        </div>
      </div>

      {/* Tie rule selector for Werewolf */}
      <div className="space-y-2 pt-2 border-t border-rule">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-ink-muted uppercase tracking-widest font-bold block">
            Werewolf Pack Tie Resolution
          </label>
          <span className="text-[10px] font-mono text-ink-faint">Night Attack Policy</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['NO_KILL', 'RANDOM', 'HOST_DECIDES'] as const).map((rule) => (
            <button
              key={rule}
              type="button"
              disabled={!isHost}
              onClick={() => handleTieRuleChange(rule)}
              className={`py-2 px-3 text-center border rounded-xs font-mono text-xs uppercase tracking-wider font-bold transition-all ${
                tieRule === rule
                  ? 'border-rule-strong bg-ink text-canvas'
                  : 'border-rule hover:border-ink/40 text-ink-muted'
              } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {rule === 'NO_KILL' ? 'No Kill' : rule === 'RANDOM' ? 'Random' : 'Host Decides'}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs & Reset Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-rule">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory('ALL')}
            className={`px-2.5 py-1 text-[11px] font-mono uppercase font-bold rounded-xs border transition-all ${
              activeCategory === 'ALL'
                ? 'border-rule-strong bg-ink text-canvas'
                : 'border-rule text-ink-muted hover:border-ink/40'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase font-bold rounded-xs border transition-all ${
                activeCategory === cat
                  ? 'border-rule-strong bg-ink text-canvas'
                  : 'border-rule text-ink-muted hover:border-ink/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isHost && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            Reset to Default Formula
          </Button>
        )}
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredRoles.map((role) => {
          const count = roleCounts[role.id] || 0;

          return (
            <div
              key={role.id}
              className={`p-3.5 border rounded-xs flex flex-col justify-between transition-all ${
                count > 0
                  ? 'border-ink/40 bg-canvas-sunk/60'
                  : 'border-rule/80 bg-canvas opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase text-ink">
                    {role.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 uppercase tracking-wider rounded-xs border ${
                      role.alignment === 'EVIL'
                        ? 'border-red-500/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                        : 'border-ink/40 text-ink-muted bg-surface'
                    }`}
                  >
                    {role.alignment}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                  {role.description}
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-rule flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint font-bold">
                  Slots
                </span>

                {isHost ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCountChange(role.id, -1)}
                      disabled={count <= 0}
                      className="w-7 h-7 rounded-xs border border-rule bg-canvas text-ink font-mono font-bold flex items-center justify-center hover:border-ink/40 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono text-sm font-black w-6 text-center text-ink">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCountChange(role.id, 1)}
                      className="w-7 h-7 rounded-xs border border-rule bg-canvas text-ink font-mono font-bold flex items-center justify-center hover:border-ink/40 text-xs"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-xs font-black px-2 py-0.5 border border-rule bg-canvas-sunk rounded-xs text-ink">
                    {count} slot{count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
