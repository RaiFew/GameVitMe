import { useCallback } from 'react';
import type { NumberGridPlayerView } from '@party/number-grid';
import { NumberGridBoard } from './NumberGridBoard';
import { HealthDisplay } from './HealthDisplay';
import { RoundLeaderboard } from './RoundLeaderboard';
import { NumberGridGameOver } from './NumberGridGameOver';
import { RoundResultModal } from './RoundResultModal';
import { Target, CheckCircle2, Skull } from 'lucide-react';

interface Props {
  playerView: NumberGridPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

export function NumberGridGame({
  playerView,
  onAction,
  onReturnLobby,
  onPlayAgain,
}: Props) {
  const {
    phase,
    currentRoundNumber,
    totalRounds,
    gridSize,
    totalNumbers,
    cards,
    me,
    isHost,
    opponents,
  } = playerView;

  const handleCardClick = useCallback(
    (cardId: string, number: number) => {
      onAction('CLICK_NUMBER', { cardId, number });
    },
    [onAction],
  );

  const handleNextRound = useCallback(() => {
    onAction('START_NEXT_ROUND');
  }, [onAction]);

  if (phase === 'GAME_OVER') {
    return (
      <NumberGridGameOver
        playerView={playerView}
        onPlayAgain={onPlayAgain}
        onReturnLobby={onReturnLobby}
      />
    );
  }

  const isEliminated = me?.eliminated || (me ? me.hp <= 0 : false);
  const isCompleted = me?.completed || false;
  const isBoardDisabled = isEliminated || isCompleted || phase !== 'PLAYING';

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-5 max-w-4xl mx-auto w-full font-mono select-none">
      {/* Game Header Bar */}
      <div className="w-full max-w-[min(92vw,560px)] flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-xs border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
            R{currentRoundNumber}/{totalRounds}
          </span>
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
            {gridSize}x{gridSize} Grid ({totalNumbers} total)
          </span>
        </div>

        {me && (
          <HealthDisplay
            hp={me.hp}
            maxHp={me.maxHp}
            isEliminated={isEliminated}
          />
        )}
      </div>

      {/* Target Number Banner */}
      <div className="w-full max-w-[min(92vw,560px)] mb-3">
        {isEliminated ? (
          <div className="p-2.5 rounded-xs border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-2">
            <Skull size={16} />
            <span>Eliminated - Spectating current round</span>
          </div>
        ) : isCompleted ? (
          <div className="p-2.5 rounded-xs border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            <span>Finished Round #{me?.finishOrder}! Waiting for others...</span>
          </div>
        ) : (
          <div className="p-2 rounded-xs border border-black dark:border-white bg-white dark:bg-zinc-950 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase">
              <Target size={15} className="text-black dark:text-white" />
              <span>Next Number</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-black dark:text-white">
                {me ? me.expectedNumber : 1}
              </span>
              <span className="text-xs text-zinc-400 font-normal">
                / {totalNumbers}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Board */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <NumberGridBoard
          cards={cards}
          gridSize={gridSize}
          expectedNumber={me?.expectedNumber || 1}
          disabled={isBoardDisabled}
          onCardClick={handleCardClick}
          lastClickResult={me?.lastClickResult}
        />
      </div>

      {/* Opponents Leaderboard */}
      {opponents && opponents.length > 0 && (
        <div className="w-full mt-4">
          <RoundLeaderboard
            opponents={opponents}
            totalNumbers={totalNumbers}
          />
        </div>
      )}

      {/* Round Result Modal (at end of each round) */}
      {phase === 'ROUND_RESULT' && (
        <RoundResultModal
          playerView={playerView}
          onNextRound={handleNextRound}
          isHost={isHost}
        />
      )}
    </div>
  );
}
