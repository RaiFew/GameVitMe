import { Card } from '../ui/Card';
import type { RPSGameMode } from '@party/rock-paper-scissors';
import { Tv, Gamepad2 } from 'lucide-react';

interface Props {
  isHost: boolean;
  playerCount: number;
  settings: Record<string, any>;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

export function RPSSettingsCard({ isHost, playerCount, settings, onUpdateSettings }: Props) {
  const isHostMode = !!settings?.hostMode;
  const playingCount = isHostMode ? Math.max(0, playerCount - 1) : playerCount;
  const currentMode: RPSGameMode = settings?.rpsGameMode || (playingCount === 2 ? 'DUEL' : 'BATTLE_ROYALE');
  const targetScore: number = Number(settings?.rpsTargetScore) || 3;
  const timerSeconds: number = typeof settings?.rpsRoundDurationSeconds === 'number' ? settings.rpsRoundDurationSeconds : 10;

  const isDuelInvalid = currentMode === 'DUEL' && playingCount !== 2;

  const handleModeSelect = (mode: RPSGameMode) => {
    if (!isHost) return;
    onUpdateSettings({ rpsGameMode: mode });
  };

  const handleScoreSelect = (score: number) => {
    if (!isHost) return;
    onUpdateSettings({ rpsTargetScore: score });
  };

  const handleTimerSelect = (sec: number) => {
    if (!isHost) return;
    onUpdateSettings({ rpsRoundDurationSeconds: sec });
  };

  const handleHostModeToggle = (enableHost: boolean) => {
    if (!isHost) return;
    onUpdateSettings({ hostMode: enableHost });
  };

  return (
    <Card className="p-5 border border-zinc-300 dark:border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Battle Settings
          </span>
          <h3 className="text-sm font-black uppercase tracking-tight text-black dark:text-white mt-0.5">
            Rock Paper Scissors
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {isHostMode && (
            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              TV Host Active
            </span>
          )}
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
            {currentMode === 'DUEL' ? '1v1 Duel' : currentMode === 'BATTLE_ROYALE' ? 'Battle Royale' : 'Points Race'}
          </span>
        </div>
      </div>

      {/* Screen Mode Selector (Host / TV vs Direct Player) */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
          Screen & Display Role
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleHostModeToggle(true)}
            className={`p-3 border rounded-xs text-left transition-all flex items-start justify-between ${
              isHostMode
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-black uppercase text-black dark:text-white">Host / TV Screen Mode</span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">
                Your screen acts as a TV fighting game arena & scoreboard. Fighters play from their phones!
              </p>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                isHostMode ? 'border-black dark:border-white bg-black dark:bg-white' : 'border-zinc-400'
              }`}
            >
              {isHostMode && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
            </div>
          </button>

          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleHostModeToggle(false)}
            className={`p-3 border rounded-xs text-left transition-all flex items-start justify-between ${
              !isHostMode
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-black uppercase text-black dark:text-white">Direct Play Mode</span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">
                Everyone (including you as host) plays hands directly on their own device.
              </p>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                !isHostMode ? 'border-black dark:border-white bg-black dark:bg-white' : 'border-zinc-400'
              }`}
            >
              {!isHostMode && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
            </div>
          </button>
        </div>
      </div>

      {isDuelInvalid && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xs flex items-center justify-between">
          <p className="text-xs font-mono text-amber-600 dark:text-amber-400">
            {isHostMode
              ? `⚠️ 1v1 Duel in Host Mode requires 1 Host + 2 Fighters (3 users total). Currently ${playerCount} in room.`
              : `⚠️ 1v1 Duel requires exactly 2 players. Currently ${playerCount} in room.`}
          </p>
          {isHost && (
            <button
              type="button"
              onClick={() => handleModeSelect('BATTLE_ROYALE')}
              className="text-[10px] font-mono font-bold px-2 py-1 bg-amber-600 text-white rounded-xs uppercase tracking-wider hover:bg-amber-700 ml-2 shrink-0"
            >
              Switch to Battle Royale
            </button>
          )}
        </div>
      )}

      {/* Mode Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
          Game Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Duel */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeSelect('DUEL')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              currentMode === 'DUEL'
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-black dark:text-white">1v1 Duel</span>
              <span className="text-sm">⚔️</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              {isHostMode ? 'Arcade Fighting Game HUD on your screen!' : 'Classic head-to-head match (2 players).'}
            </p>
          </button>

          {/* Battle Royale */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeSelect('BATTLE_ROYALE')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              currentMode === 'BATTLE_ROYALE'
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-black dark:text-white">Battle Royale</span>
              <span className="text-sm">👑</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              Survival showdown! Losers eliminated until 1 champion survives.
            </p>
          </button>

          {/* Points Race */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeSelect('POINTS_RACE')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              currentMode === 'POINTS_RACE'
                ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-950'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-black dark:text-white">Points Race</span>
              <span className="text-sm">🏁</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              Every round win grants +1 point. First to target wins!
            </p>
          </button>
        </div>
      </div>

      {/* Target Score (for Duel or Points Race) */}
      {currentMode !== 'BATTLE_ROYALE' && (
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
            Target Points to Win
          </label>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((score) => (
              <button
                key={score}
                type="button"
                disabled={!isHost}
                onClick={() => handleScoreSelect(score)}
                className={`flex-1 py-1.5 px-3 text-xs font-mono font-bold rounded-xs border transition-all ${
                  targetScore === score
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {score} pts
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Turn Timer */}
      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
          Round Timer (Seconds to Pick)
        </label>
        <div className="flex gap-2">
          {[
            { label: '5s (Fast)', value: 5 },
            { label: '10s (Normal)', value: 10 },
            { label: '15s (Relaxed)', value: 15 },
            { label: 'Unlimited', value: 0 },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={!isHost}
              onClick={() => handleTimerSelect(t.value)}
              className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-bold rounded-xs border transition-all ${
                timerSeconds === t.value
                  ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
              } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
