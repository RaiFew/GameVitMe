import { Card } from '../ui/Card';
import type { DifficultyMode, DamageMode, GridSize } from '@party/number-grid';
import { Settings, Shield, Plus, Minus } from 'lucide-react';

interface Props {
  isHost: boolean;
  playerCount: number;
  settings: Record<string, any>;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

export function NumberGridSettingsCard({
  isHost,
  playerCount,
  settings,
  onUpdateSettings,
}: Props) {
  const difficultyMode: DifficultyMode = settings?.difficultyMode || 'DEFAULT';
  const totalRounds: number = Number(settings?.totalRounds) || 9;
  const maxHp: number = Number(settings?.maxHp) || 3;
  const damageMode: DamageMode = settings?.damageMode || 'LAST_PLAYER';
  const customGridSizes: GridSize[] = Array.isArray(settings?.customGridSizes) && settings.customGridSizes.length > 0
    ? settings.customGridSizes
    : [3, 4, 5];
  // Normal-room Chaos. Ranked variants never reach this card — those are chosen
  // on the Ranked page, not configured by a host. Nested under `gameSettings`
  // because that is the object the server hands to the engine.
  const isChaos = settings?.gameSettings?.variant === 'CHAOS';

  const handleChaosToggle = (enabled: boolean) => {
    if (!isHost) return;
    onUpdateSettings({
      gameSettings: {
        ...(settings?.gameSettings || {}),
        variant: enabled ? 'CHAOS' : undefined,
      },
    });
  };

  const handleDifficultySelect = (mode: DifficultyMode) => {
    if (!isHost) return;
    const updates: Record<string, any> = { difficultyMode: mode };
    if (mode === 'DEFAULT') {
      updates.totalRounds = 9;
    } else if (mode === 'CUSTOM') {
      updates.totalRounds = customGridSizes.length;
    } else if (mode === 'RANDOM') {
      updates.totalRounds = totalRounds > 9 ? 5 : totalRounds;
    }
    onUpdateSettings(updates);
  };

  const handleHpChange = (newHp: number) => {
    if (!isHost) return;
    const clamped = Math.min(Math.max(newHp, 1), 10);
    onUpdateSettings({ maxHp: clamped });
  };

  const handleDamageModeSelect = (mode: DamageMode) => {
    if (!isHost) return;
    onUpdateSettings({ damageMode: mode });
  };

  const handleRandomRoundsChange = (rounds: number) => {
    if (!isHost) return;
    const clamped = Math.min(Math.max(rounds, 1), 15);
    onUpdateSettings({ totalRounds: clamped });
  };

  // Custom rounds editor
  const handleAddCustomRound = () => {
    if (!isHost || customGridSizes.length >= 12) return;
    const lastSize = customGridSizes[customGridSizes.length - 1] || 3;
    const nextSize = Math.min(lastSize + 1, 10) as GridSize;
    const newSizes = [...customGridSizes, nextSize];
    onUpdateSettings({
      customGridSizes: newSizes,
      totalRounds: newSizes.length,
    });
  };

  const handleRemoveCustomRound = (index: number) => {
    if (!isHost || customGridSizes.length <= 1) return;
    const newSizes = customGridSizes.filter((_, i) => i !== index);
    onUpdateSettings({
      customGridSizes: newSizes,
      totalRounds: newSizes.length,
    });
  };

  const handleUpdateCustomRoundSize = (index: number, size: GridSize) => {
    if (!isHost) return;
    const newSizes = [...customGridSizes];
    newSizes[index] = size;
    onUpdateSettings({
      customGridSizes: newSizes,
      totalRounds: newSizes.length,
    });
  };

  return (
    <Card className="p-5 border border-rule space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Game Rules
          </span>
          <h3 className="text-sm font-black uppercase tracking-tight text-ink mt-0.5">
            Number Rush Settings
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-rule bg-canvas-sunk text-ink">
            {difficultyMode} Progression
          </span>
        </div>
      </div>

      {/* Chaos: random 1–1000 numbers, server-picked grid size every round.
          Not ranked — guests play it like any other room. */}
      <div className="space-y-2 pt-3 border-t border-rule">
        <button
          type="button"
          disabled={!isHost}
          onClick={() => handleChaosToggle(!isChaos)}
          className={`w-full p-3 border rounded-xs text-left transition-all flex items-center justify-between gap-3 ${
            isChaos
              ? 'border-live ring-2 ring-live'
              : 'border-rule hover:border-ink/40 bg-canvas'
          } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
        >
          <div>
            <span className="text-xs font-black uppercase text-ink block">Chaos</span>
            <span className="text-[10px] font-mono text-ink-muted block mt-0.5">
              Random numbers 1–1000 and a random grid size (2x2–10x10) every round.
            </span>
          </div>
          <span
            className={`shrink-0 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-xs border ${
              isChaos
                ? 'border-live bg-live text-live-ink'
                : 'border-rule bg-canvas-sunk text-ink-muted'
            }`}
          >
            {isChaos ? 'On' : 'Off'}
          </span>
        </button>
      </div>

      {/* Difficulty Mode Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
          Difficulty Progression
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Default */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleDifficultySelect('DEFAULT')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              difficultyMode === 'DEFAULT'
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">Default</span>
              <span className="text-xs font-mono font-bold text-ink-faint">9 Rds</span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
              Starts at 2x2 and scales sequentially up to 10x10.
            </p>
          </button>

          {/* Custom */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleDifficultySelect('CUSTOM')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              difficultyMode === 'CUSTOM'
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">Custom</span>
              <Settings size={13} className="text-ink-muted" />
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
              Choose your own sequence of rounds and grid sizes.
            </p>
          </button>

          {/* Random */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleDifficultySelect('RANDOM')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              difficultyMode === 'RANDOM'
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">Random</span>
              <span className="text-sm">🎲</span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
              Server randomly picks a grid size (2x2 to 10x10) per round.
            </p>
          </button>
        </div>
      </div>

      {/* Custom Rounds Configurator */}
      {difficultyMode === 'CUSTOM' && (
        <div className="space-y-3 p-3 bg-canvas-sunk/50 border border-rule rounded-xs">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold">
              Configured Rounds ({customGridSizes.length})
            </label>
            {isHost && customGridSizes.length < 12 && (
              <button
                type="button"
                onClick={handleAddCustomRound}
                className="text-[10px] font-mono font-bold text-ink flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus size={11} /> Add Round
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {customGridSizes.map((size, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 p-1.5 border border-rule bg-canvas rounded-xs text-xs font-mono"
              >
                <span className="text-[10px] text-ink-faint font-bold">R{idx + 1}:</span>
                <select
                  disabled={!isHost}
                  value={size}
                  onChange={(e) =>
                    handleUpdateCustomRoundSize(idx, Number(e.target.value) as GridSize)
                  }
                  className="bg-transparent text-xs font-bold font-mono outline-none cursor-pointer"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <option key={s} value={s} className="bg-canvas text-ink">
                      {s}x{s} ({s * s} nums)
                    </option>
                  ))}
                </select>
                {isHost && customGridSizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomRound(idx)}
                    className="text-red-500 hover:text-red-700 px-0.5"
                    title="Remove round"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Random Mode Rounds Selector */}
      {difficultyMode === 'RANDOM' && (
        <div className="space-y-2 pt-2 border-t border-rule">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
            Number of Random Rounds
          </label>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((rounds) => (
              <button
                key={rounds}
                type="button"
                disabled={!isHost}
                onClick={() => handleRandomRoundsChange(rounds)}
                className={`flex-1 py-1.5 px-3 text-xs font-mono font-bold rounded-xs border transition-all ${
                  totalRounds === rounds
                    ? 'border-rule-strong bg-ink text-canvas'
                    : 'border-rule hover:border-ink/40 bg-canvas-sunk text-ink'
                } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {rounds} Rounds
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player HP (Health Points) */}
      <div className="space-y-2 pt-2 border-t border-rule">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold">
            Starting Player Health (HP)
          </label>
          <span className="text-xs font-mono font-bold text-ink">
            {maxHp} HP (Wrong click = -1 HP)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              type="button"
              onClick={() => handleHpChange(maxHp - 1)}
              disabled={maxHp <= 1}
              className="p-1.5 border border-rule rounded-xs hover:border-rule-strong disabled:opacity-40"
            >
              <Minus size={12} />
            </button>
          )}

          <div className="flex-1 flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((hpVal) => (
              <button
                key={hpVal}
                type="button"
                disabled={!isHost}
                onClick={() => handleHpChange(hpVal)}
                className={`flex-1 py-1 text-[11px] font-mono font-bold rounded-xs border transition-all ${
                  maxHp === hpVal
                    ? 'border-red-500 bg-red-500 text-white'
                    : hpVal <= maxHp
                    ? 'border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                    : 'border-rule bg-canvas-sunk text-ink-faint'
                } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {hpVal}
              </button>
            ))}
          </div>

          {isHost && (
            <button
              type="button"
              onClick={() => handleHpChange(maxHp + 1)}
              disabled={maxHp >= 10}
              className="p-1.5 border border-rule rounded-xs hover:border-rule-strong disabled:opacity-40"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Multiplayer Damage Mode (only when 3+ players) */}
      {playerCount >= 3 && (
        <div className="space-y-2 pt-2 border-t border-rule">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold">
              Multiplayer Round Damage Mode
            </label>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-canvas-sunk text-ink-muted">
              3+ Players Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!isHost}
              onClick={() => handleDamageModeSelect('LAST_PLAYER')}
              className={`p-2.5 border rounded-xs text-left transition-all ${
                damageMode === 'LAST_PLAYER'
                  ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                  : 'border-rule hover:border-ink/40 bg-canvas'
              } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-xs font-bold text-ink block">
                Last Player Only
              </span>
              <span className="text-[10px] font-mono text-ink-muted block mt-0.5">
                Only the last player to finish takes 1 round damage.
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost}
              onClick={() => handleDamageModeSelect('EVERYONE_EXCEPT_FIRST')}
              className={`p-2.5 border rounded-xs text-left transition-all ${
                damageMode === 'EVERYONE_EXCEPT_FIRST'
                  ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                  : 'border-rule hover:border-ink/40 bg-canvas'
              } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-xs font-bold text-ink block">
                Everyone Except 1st
              </span>
              <span className="text-[10px] font-mono text-ink-muted block mt-0.5">
                High stakes! Everyone except the 1st finisher takes 1 round damage.
              </span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
