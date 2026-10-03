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
  const livesPerMatch: number = Number(settings?.rpsLivesPerMatch) || 3;
  const isTournament = currentMode === 'TOURNAMENT';

  const handleModeSelect = (mode: RPSGameMode) => {
    if (!isHost) return;
    onUpdateSettings({ rpsGameMode: mode });
  };

  const handleLivesSelect = (lives: number) => {
    if (!isHost) return;
    onUpdateSettings({ rpsLivesPerMatch: lives });
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
    <Card className="p-5 border border-rule space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Battle Settings
          </span>
          <h3 className="text-sm font-black uppercase tracking-tight text-ink mt-0.5">
            Rock Paper Scissors
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {isHostMode && (
            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              TV Host Active
            </span>
          )}
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border border-rule bg-canvas-sunk text-ink">
            {currentMode === 'DUEL'
              ? '1v1 Duel'
              : currentMode === 'BATTLE_ROYALE'
                ? 'Battle Royale'
                : currentMode === 'TOURNAMENT'
                  ? 'Tournament'
                  : 'Points Race'}
          </span>
        </div>
      </div>

      {/* Screen Mode Selector (Host / TV vs Direct Player) */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
          Screen & Display Role
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleHostModeToggle(true)}
            className={`p-3 border rounded-xs text-left transition-all flex items-start justify-between ${
              isHostMode
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-black uppercase text-ink">Host / TV Screen Mode</span>
              </div>
              <p className="text-[10px] font-mono text-ink-muted mt-1">
                Your screen acts as a TV fighting game arena & scoreboard. Fighters play from their phones!
              </p>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                isHostMode ? 'border-rule-strong bg-ink' : 'border-ink/40'
              }`}
            >
              {isHostMode && <div className="w-1.5 h-1.5 rounded-full bg-canvas" />}
            </div>
          </button>

          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleHostModeToggle(false)}
            className={`p-3 border rounded-xs text-left transition-all flex items-start justify-between ${
              !isHostMode
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-black uppercase text-ink">Direct Play Mode</span>
              </div>
              <p className="text-[10px] font-mono text-ink-muted mt-1">
                Everyone (including you as host) plays hands directly on their own device.
              </p>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                !isHostMode ? 'border-rule-strong bg-ink' : 'border-ink/40'
              }`}
            >
              {!isHostMode && <div className="w-1.5 h-1.5 rounded-full bg-canvas" />}
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
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
          Game Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Duel */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeSelect('DUEL')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              currentMode === 'DUEL'
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">1v1 Duel</span>
              <span className="text-sm">⚔️</span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
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
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">Battle Royale</span>
              <span className="text-sm">👑</span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
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
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">Points Race</span>
              <span className="text-sm">🏁</span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
              Every round win grants +1 point. First to target wins!
            </p>
          </button>

          {/* Tournament */}
          <button
            type="button"
            disabled={!isHost}
            onClick={() => handleModeSelect('TOURNAMENT')}
            className={`p-3 border rounded-xs text-left transition-all flex flex-col justify-between ${
              isTournament
                ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink'
                : 'border-rule hover:border-ink/40 bg-canvas'
            } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-black uppercase text-ink">Tournament</span>
              <span className="text-sm">🏆</span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted">
              Single-elimination bracket, one match at a time. Odd entrants get a bye.
            </p>
          </button>
        </div>
      </div>

      {/* Lives per match (Tournament only) */}
      {isTournament && (
        <div className="space-y-2 pt-2 border-t border-rule">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
            Lives per Match
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={!isHost}
                onClick={() => handleLivesSelect(n)}
                className={`flex-1 py-1.5 px-2 text-xs font-mono font-bold rounded-xs border transition-all ${
                  livesPerMatch === n
                    ? 'border-rule-strong bg-ink text-canvas'
                    : 'border-rule hover:border-ink/40 bg-canvas-sunk text-ink'
                } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {n} {n === 1 ? 'life' : 'lives'}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-mono text-ink-muted">
            Lives reset at the start of every match, so the final is played on equal footing.
          </p>
        </div>
      )}

      {/* Target Score (for Duel or Points Race) */}
      {(currentMode === 'DUEL' || currentMode === 'POINTS_RACE') && (
        <div className="space-y-2 pt-2 border-t border-rule">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
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
                    ? 'border-rule-strong bg-ink text-canvas'
                    : 'border-rule hover:border-ink/40 bg-canvas-sunk text-ink'
                } ${!isHost ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                {score} pts
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Turn Timer */}
      <div className="space-y-2 pt-2 border-t border-rule">
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
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
                  ? 'border-rule-strong bg-ink text-canvas'
                  : 'border-rule hover:border-ink/40 bg-canvas-sunk text-ink'
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
