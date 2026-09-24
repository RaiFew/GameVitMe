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
    <Card className="p-5 border border-zinc-300 dark:border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Game Rules
          </span>
          <h3 className="text-sm font-black uppercase tracking-tight text-black dark:text-white mt-0.5">
            Number Rush Settings
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
            {difficultyMode} Progression
          </span>
        </div>
      </div>

      {/* Difficulty Mode Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
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
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-black dark:text-white">Default</span>
              <span className="text-xs font-mono font-bold text-zinc-400">9 Rds</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
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
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-black dark:text-white">Custom</span>
              <Settings size={13} className="text-zinc-500" />
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
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
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-black dark:text-white">Random</span>
              <span className="text-sm">🎲</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              Server randomly picks a grid size (2x2 to 10x10) per round.
            </p>
          </button>
        </div>
      </div>

      {/* Custom Rounds Configurator */}
      {difficultyMode === 'CUSTOM' && (
        <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xs">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              Configured Rounds ({customGridSizes.length})
            </label>
            {isHost && customGridSizes.length < 12 && (
              <button
                type="button"
                onClick={handleAddCustomRound}
                className="text-[10px] font-mono font-bold text-black dark:text-white flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus size={11} /> Add Round
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {customGridSizes.map((size, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 p-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-xs text-xs font-mono"
              >
                <span className="text-[10px] text-zinc-400 font-bold">R{idx + 1}:</span>
                <select
                  disabled={!isHost}
                  value={size}
                  onChange={(e) =>
                    handleUpdateCustomRoundSize(idx, Number(e.target.value) as GridSize)
                  }
                  className="bg-transparent text-xs font-bold font-mono outline-none cursor-pointer"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <option key={s} value={s} className="bg-white dark:bg-zinc-950 text-black dark:text-white">
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
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
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
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {rounds} Rounds
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player HP (Health Points) */}
      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
            Starting Player Health (HP)
          </label>
          <span className="text-xs font-mono font-bold text-black dark:text-white">
            {maxHp} HP (Wrong click = -1 HP)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              type="button"
              onClick={() => handleHpChange(maxHp - 1)}
              disabled={maxHp <= 1}
              className="p-1.5 border border-zinc-300 dark:border-zinc-700 rounded-xs hover:border-black dark:hover:border-white disabled:opacity-40"
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
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400'
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
              className="p-1.5 border border-zinc-300 dark:border-zinc-700 rounded-xs hover:border-black dark:hover:border-white disabled:opacity-40"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Multiplayer Damage Mode (only when 3+ players) */}
      {playerCount >= 3 && (
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              Multiplayer Round Damage Mode
            </label>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
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
                  ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
              } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-xs font-bold text-black dark:text-white block">
                Last Player Only
              </span>
              <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                Only the last player to finish takes 1 round damage.
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost}
              onClick={() => handleDamageModeSelect('EVERYONE_EXCEPT_FIRST')}
              className={`p-2.5 border rounded-xs text-left transition-all ${
                damageMode === 'EVERYONE_EXCEPT_FIRST'
                  ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
              } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-xs font-bold text-black dark:text-white block">
                Everyone Except 1st
              </span>
              <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                High stakes! Everyone except the 1st finisher takes 1 round damage.
              </span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
