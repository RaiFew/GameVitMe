import { useState } from 'react';
import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Shield, Shuffle, Layers, CheckCircle2, AlertCircle, Plus, Minus, Users } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function SalemRoleConfigurationScreen({ playerView, onAction, isHost }: Props) {
  const { roleCounts = {}, roleAssignmentMode = 'PHYSICAL', availableRoles = [], players } = playerView;
  const playingPlayers = players.filter((p) => !p.isHost && p.canPlay !== false);
  const totalPlaying = playingPlayers.length;

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(roleCounts);
  const [mode, setMode] = useState<'PHYSICAL' | 'RANDOM'>(roleAssignmentMode);

  const totalConfigured = Object.values(localCounts).reduce((a, b) => a + (b || 0), 0);
  const witchCount = Object.entries(localCounts).reduce((acc, [rid, count]) => {
    const role = availableRoles.find((r) => r.id === rid);
    if (role && (role.category === 'WITCH' || role.alignment === 'EVIL')) {
      return acc + (count || 0);
    }
    return acc;
  }, 0);

  const isValid = totalConfigured === totalPlaying && witchCount >= 1;

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
        <div className="inline-flex p-4 rounded-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 mb-2">
          <Shield className="w-8 h-8 text-black dark:text-white" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
          Salem Moderator is Preparing Trial
        </h1>
        <p className="text-sm text-zinc-500 font-mono">
          The Host is selecting the role configuration and card assignment mode.
        </p>

        <Card className="p-6 border border-zinc-200 dark:border-zinc-800 text-left">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              Town Citizens ({totalPlaying})
            </span>
            <span className="text-xs font-mono px-2 py-0.5 border border-black dark:border-white rounded-xs font-bold uppercase">
              Mode: {roleAssignmentMode}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {playingPlayers.map((p) => (
              <div
                key={p.id}
                className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xs text-xs font-mono flex items-center gap-2"
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Salem Moderator Panel
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
            Salem 1692 Role Setup
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Allocate exact role slots matching {totalPlaying} Salem citizens.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border border-black dark:border-white p-1 rounded-xs bg-zinc-50 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => handleModeChange('PHYSICAL')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-2 ${
              mode === 'PHYSICAL'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Layers size={14} />
            Mode A (Physical Cards)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('RANDOM')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-2 ${
              mode === 'RANDOM'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Shuffle size={14} />
            Mode B (Online Random)
          </button>
        </div>
      </div>

      {/* Quota Overview Card */}
      <Card className="p-6 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Quota Status</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono">
                {totalConfigured} / {totalPlaying}
              </span>
              <span className="text-xs font-mono text-zinc-500">Slots Configured</span>
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
                    : 'Need at least 1 Witch'}
                </span>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleStartSetup}
              disabled={!isValid}
              className="font-mono text-xs uppercase tracking-wider py-2.5 px-6 font-bold"
            >
              {mode === 'PHYSICAL' ? 'Begin Physical Selection' : 'Randomize & Deal Cards'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {(['ALL', 'TOWN', 'WITCH'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xs border transition-all ${
              activeCategory === cat
                ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
            }`}
          >
            {cat === 'TOWN' ? 'Puritans / Town' : cat === 'WITCH' ? 'Coven Witches' : 'All Roles'}
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
              className="p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-sm uppercase text-black dark:text-white">
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
                <p className="text-xs text-zinc-500 line-clamp-2">{role.description}</p>
              </div>

              {/* Counter Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                  Slots:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCount(role.id, -1)}
                    disabled={count <= 0}
                    className="w-7 h-7 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 rounded-xs disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-sm">{count}</span>
                  <button
                    type="button"
                    onClick={() => updateCount(role.id, 1)}
                    disabled={count >= role.totalSlots + 10}
                    className="w-7 h-7 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 rounded-xs disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
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
