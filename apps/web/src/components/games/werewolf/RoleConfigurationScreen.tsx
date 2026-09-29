import { useState } from 'react';
import type { WerewolfPlayerView, RoleCategory } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Shield, Shuffle, Layers, CheckCircle2, AlertCircle, Plus, Minus, Users } from 'lucide-react';

interface Props {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function RoleConfigurationScreen({ playerView, onAction, isHost }: Props) {
  const { roleCounts = {}, roleAssignmentMode = 'PHYSICAL', availableRoles = [], players } = playerView;
  const playingPlayers = players.filter((p) => !p.isHost && p.canPlay !== false);
  const totalPlaying = playingPlayers.length;

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(roleCounts);
  const [mode, setMode] = useState<'PHYSICAL' | 'RANDOM'>(roleAssignmentMode);

  const totalConfigured = Object.values(localCounts).reduce((a, b) => a + (b || 0), 0);
  const wolfCount = Object.entries(localCounts).reduce((acc, [rid, count]) => {
    const role = availableRoles.find((r) => r.id === rid);
    if (role && (role.category === 'WEREWOLF' || role.alignment === 'EVIL')) {
      return acc + (count || 0);
    }
    return acc;
  }, 0);

  const isValid = totalConfigured === totalPlaying && wolfCount >= 1;

  const handleModeChange = (newMode: 'PHYSICAL' | 'RANDOM') => {
    setMode(newMode);
    onAction('UPDATE_ROLE_CONFIG', {
      roleAssignmentMode: newMode,
      roleCounts: localCounts,
    });
  };

  const updateCount = (roleId: string, delta: number) => {
    const current = localCounts[roleId] || 0;
    const next = Math.max(0, current + delta);
    const nextCounts = { ...localCounts, [roleId]: next };
    setLocalCounts(nextCounts);
    onAction('UPDATE_ROLE_CONFIG', {
      roleAssignmentMode: mode,
      roleCounts: nextCounts,
    });
  };

  const handleStartSetup = () => {
    if (!isValid) return;
    onAction('START_ROLE_SETUP');
  };

  const filteredRoles = availableRoles.filter((r) => {
    if (activeCategory === 'ALL') return true;
    return r.category === activeCategory;
  });

  if (!isHost) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center space-y-6">
        <div className="inline-flex p-4 rounded-xs border border-rule bg-canvas-sunk mb-2">
          <Shield className="w-8 h-8 text-ink" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-ink">
          Moderator is Configuring Roles
        </h1>
        <p className="text-sm text-ink-muted font-mono">
          The Host is setting up the role distribution and assignment mode for this game.
        </p>

        <Card className="p-6 border border-rule text-left">
          <div className="flex items-center justify-between pb-4 border-b border-rule mb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
              Citizens in Village ({totalPlaying})
            </span>
            <span className="text-xs font-mono px-2 py-0.5 border border-rule-strong rounded-xs font-bold uppercase">
              Mode: {roleAssignmentMode}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {playingPlayers.map((p) => (
              <div
                key={p.id}
                className="p-2 border border-rule rounded-xs text-xs font-mono flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold truncate">{p.displayName}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="border-b border-rule pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Moderator Control Panel
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-ink mt-1">
            Game Role Setup
          </h1>
          <p className="text-xs text-ink-muted font-mono mt-1">
            Choose assignment mode and allocate role quotas to match {totalPlaying} playing citizens.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border border-rule-strong p-1 rounded-xs bg-canvas-sunk">
          <button
            type="button"
            onClick={() => handleModeChange('PHYSICAL')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-2 ${
              mode === 'PHYSICAL'
                ? 'bg-ink text-canvas shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Layers size={14} />
            Mode A (Physical Card)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('RANDOM')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-2 ${
              mode === 'RANDOM'
                ? 'bg-ink text-canvas shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Shuffle size={14} />
            Mode B (Online Random)
          </button>
        </div>
      </div>

      {/* Quota Overview Card */}
      <Card className="p-6 border border-rule">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-mono uppercase text-ink-muted font-bold">Quota Status</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono">
                {totalConfigured} / {totalPlaying}
              </span>
              <span className="text-xs font-mono text-ink-muted">Slots Configured</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isValid ? (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xs text-xs font-mono font-bold">
                <CheckCircle2 size={16} />
                <span>Ready to Launch Setup</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xs text-xs font-mono font-bold">
                <AlertCircle size={16} />
                <span>
                  {totalConfigured !== totalPlaying
                    ? `Allocate exactly ${totalPlaying} slots (${totalPlaying - totalConfigured > 0 ? `+${totalPlaying - totalConfigured}` : totalPlaying - totalConfigured})`
                    : 'Need at least 1 Werewolf'}
                </span>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleStartSetup}
              disabled={!isValid}
              className="font-mono text-xs uppercase tracking-wider py-2.5 px-6 font-bold"
            >
              {mode === 'PHYSICAL' ? 'Begin Physical Selection' : 'Randomize & Reveal'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-rule pb-3">
        {(['ALL', 'VILLAGER', 'WEREWOLF', 'NEUTRAL', 'ADDITIONAL'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xs border transition-all ${
              activeCategory === cat
                ? 'border-rule-strong bg-ink text-canvas'
                : 'border-rule text-ink-muted hover:border-ink/40'
            }`}
          >
            {cat === 'VILLAGER' ? 'Good / Villager' : cat}
          </button>
        ))}
      </div>

      {/* Roles Allocation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => {
          const count = localCounts[role.id] || 0;
          return (
            <Card
              key={role.id}
              className="p-4 border border-rule flex flex-col justify-between space-y-4 hover:border-rule transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-sm uppercase text-ink">
                    {role.name}
                  </h3>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs border ${
                      role.alignment === 'EVIL'
                        ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                        : role.alignment === 'NEUTRAL'
                        ? 'border-amber-600 text-amber-600 dark:border-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20'
                        : 'border-ink/40 text-ink bg-surface'
                    }`}
                  >
                    {role.alignment}
                  </span>
                </div>
                <p className="text-xs text-ink-muted line-clamp-2">{role.description}</p>
              </div>

              {/* Counter Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-rule/80">
                <span className="text-[10px] font-mono uppercase text-ink-faint font-bold">
                  Slots:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCount(role.id, -1)}
                    disabled={count <= 0}
                    className="w-7 h-7 flex items-center justify-center border border-rule rounded-xs disabled:opacity-30 hover:bg-surface transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-sm">{count}</span>
                  <button
                    type="button"
                    onClick={() => updateCount(role.id, 1)}
                    disabled={count >= role.totalSlots + 10}
                    className="w-7 h-7 flex items-center justify-center border border-rule rounded-xs disabled:opacity-30 hover:bg-surface transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
