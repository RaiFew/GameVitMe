import { useState } from 'react';
import type { SpyfallPlayerView } from '@party/spyfall';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { motion } from 'framer-motion';

interface GameOverScreenProps {
  playerView: SpyfallPlayerView;
  onPlayAgain?: (customDurationSeconds?: number) => void;
  onReturnLobby?: () => void;
}

export function GameOverScreen({ playerView, onPlayAgain, onReturnLobby }: GameOverScreenProps) {
  const data = playerView.gameOverData;

  const initialDuration = playerView.roundExpiresAt && playerView.roundStartedAt
    ? Math.max(60, Math.round((playerView.roundExpiresAt - playerView.roundStartedAt) / 1000))
    : 480;

  const [minutes, setMinutes] = useState(Math.floor(initialDuration / 60));
  const [seconds, setSeconds] = useState(initialDuration % 60);

  if (!data) return null;

  const spyWon = data.winner === 'SPY';
  const spyPlayer = playerView.players.find((p) => p.id === data.spyPlayerId);

  const handlePlayAgainClick = () => {
    if (!onPlayAgain) return;
    const totalSecs = Math.max(30, (Number(minutes) || 0) * 60 + (Number(seconds) || 0));
    onPlayAgain(totalSecs);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="text-center p-8 border-2 border-black dark:border-white">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-1">
          Round Concluded
        </span>
        <h1 className={`text-3xl sm:text-4xl font-black uppercase mb-2 ${spyWon ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {spyWon ? 'The Spy Wins' : 'Normal Players Win'}
        </h1>
        <p className="text-xs text-zinc-500 mb-8 max-w-lg mx-auto font-mono">{data.reason}</p>

        {/* Location & Spy Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xs text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">Secret Location</span>
            <p className="text-xl font-black uppercase text-black dark:text-white">{data.location}</p>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xs text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">The Spy Was</span>
            <p className="text-xl font-black uppercase text-red-600 dark:text-red-400">{spyPlayer?.displayName ?? 'The Spy'}</p>
          </div>
        </div>

        {/* All Roles Breakdown */}
        <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xs mb-6 text-left">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3 text-center">
            Player Roles Breakdown
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playerView.players.map((p) => {
              const isTheSpy = p.id === data.spyPlayerId;
              const role = isTheSpy ? 'The Spy' : data.roles[p.id] ?? 'Normal Player';

              return (
                <div
                  key={p.id}
                  className={`flex justify-between items-center p-2.5 rounded-xs border text-xs ${
                    isTheSpy
                      ? 'border-red-600/40 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <span className="font-bold">{p.displayName}</span>
                  <span className="font-mono text-[10px] font-bold uppercase">{role}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Timer Controls */}
        {playerView.isHost && playerView.hostMode && onPlayAgain && (
          <div className="border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4 mb-6 rounded-xs max-w-md mx-auto">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-2">
              Next Round Duration
            </span>
            <div className="flex items-center justify-center gap-2 mb-3">
              <input
                type="number"
                min="0"
                max="99"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-center font-mono text-base font-bold text-black dark:text-white rounded-xs p-1"
              />
              <span className="font-mono text-zinc-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-14 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-center font-mono text-base font-bold text-black dark:text-white rounded-xs p-1"
              />
            </div>
            <div className="flex gap-1 justify-center">
              {[3, 5, 8, 10].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMinutes(m);
                    setSeconds(0);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold border rounded-xs ${
                    minutes === m && seconds === 0
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-500'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReturnLobby && (
            <Button size="md" variant="secondary" onClick={onReturnLobby} className="text-xs font-bold">
              Return to Lobby
            </Button>
          )}
          {playerView.isHost && onPlayAgain && (
            <Button size="md" onClick={handlePlayAgainClick} className="text-xs font-bold">
              Play Another Round
            </Button>
          )}
        </div>

        {!playerView.isHost && (
          <p className="text-zinc-500 text-xs font-mono mt-4">
            Waiting for Host to start another round or return to lobby...
          </p>
        )}
      </Card>
    </motion.div>
  );
}
