import { useState, useEffect } from 'react';
import type { RPSPlayerView, RPSChoice } from '@party/rock-paper-scissors';
import { RPSArena } from './RPSArena';
import { RPSChoiceSelector } from './RPSChoiceSelector';
import { RPSRoundSummary } from './RPSRoundSummary';
import { RPSGameOver } from './RPSGameOver';
import { RPSHostScreen } from './RPSHostScreen';
import { Clock } from 'lucide-react';

interface Props {
  playerView: RPSPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
  isHost?: boolean;
}

export function RPSGame({
  playerView,
  onAction,
  onReturnLobby,
  onPlayAgain,
  isHost = false,
}: Props) {
  const {
    gameMode,
    phase,
    roundNumber,
    targetScore,
    roundExpiresAt,
    me,
    players,
    lastRoundOutcome,
    winnerIds,
  } = playerView;

  // Local timer calculation
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!roundExpiresAt || phase !== 'CHOOSING') {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = Math.max(0, roundExpiresAt - Date.now());
      setSecondsRemaining(Math.ceil(remainingMs / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [roundExpiresAt, phase]);

  const handleNextRound = () => {
    onAction('NEXT_ROUND');
  };

  // Check if viewing player is the dedicated TV / Host screen in Host Mode
  if (playerView.me.isHost && playerView.me.canPlay === false) {
    return (
      <RPSHostScreen
        playerView={playerView}
        onNextRound={handleNextRound}
        onReturnLobby={onReturnLobby}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  if (phase === 'GAME_OVER') {
    return (
      <RPSGameOver
        playerView={playerView}
        onReturnLobby={onReturnLobby}
        onPlayAgain={onPlayAgain}
        isHost={isHost}
      />
    );
  }

  const handleMakeChoice = (choice: RPSChoice) => {
    onAction('MAKE_CHOICE', { choice });
  };

  const isEliminated = gameMode === 'BATTLE_ROYALE' && !me.isAlive;
  const eliminatedIds = lastRoundOutcome?.eliminatedIds || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Top Match HUD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              {gameMode === 'DUEL'
                ? '1v1 Duel'
                : gameMode === 'BATTLE_ROYALE'
                ? 'Battle Royale'
                : 'Points Race'}
            </span>
            <span className="text-xs font-mono font-bold text-zinc-500">
              Round {roundNumber}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white">
            Rock Paper Scissors
          </h2>
        </div>

        {/* Right HUD Stats */}
        <div className="flex items-center gap-3">
          {gameMode !== 'BATTLE_ROYALE' && (
            <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xs text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
              First to {targetScore} pts
            </div>
          )}

          {secondsRemaining !== null && phase === 'CHOOSING' && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xs border font-mono text-xs font-black ${
                secondsRemaining <= 3
                  ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{secondsRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Arena */}
      <RPSArena
        gameMode={gameMode}
        phase={phase}
        players={players}
        myId={me.id}
        winnerIds={lastRoundOutcome ? lastRoundOutcome.winnerIds : winnerIds}
        eliminatedIds={eliminatedIds}
      />

      {/* Round Summary (when in ROUND_RESULT) */}
      {phase === 'ROUND_RESULT' && lastRoundOutcome && (
        <RPSRoundSummary
          outcome={lastRoundOutcome}
          gameMode={gameMode}
          onNextRound={handleNextRound}
          isHost={isHost}
        />
      )}

      {/* Choice Controller (only during CHOOSING) */}
      {phase === 'CHOOSING' && (
        <div className="pt-2">
          {isEliminated ? (
            <div className="p-6 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xs text-center space-y-1">
              <span className="text-2xl">👻</span>
              <h3 className="text-sm font-black uppercase text-zinc-500">
                You have been eliminated
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                Spectating remaining players in this Battle Royale showdown...
              </p>
            </div>
          ) : (
            <RPSChoiceSelector
              selectedChoice={me.choice}
              onSelect={handleMakeChoice}
            />
          )}
        </div>
      )}
    </div>
  );
}
