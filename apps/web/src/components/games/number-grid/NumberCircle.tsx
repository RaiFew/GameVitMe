import { memo } from 'react';
import type { GridSize } from '@party/number-grid';

interface NumberCircleProps {
  number: number;
  cardId: string;
  gridSize: GridSize;
  isCompleted: boolean; // number < expectedNumber
  isWrong: boolean; // clicked wrongly
  isJustCorrect: boolean; // clicked correctly just now
  disabled: boolean;
  onClick: (cardId: string, number: number) => void;
}

export const NumberCircle = memo(function NumberCircle({
  number,
  cardId,
  gridSize,
  isCompleted,
  isWrong,
  isJustCorrect,
  disabled,
  onClick,
}: NumberCircleProps) {
  // Determine responsive typography and sizing based on grid size (2 to 10)
  const getFontSize = () => {
    if (gridSize <= 3) return 'text-2xl sm:text-4xl font-black';
    if (gridSize <= 4) return 'text-xl sm:text-3xl font-black';
    if (gridSize <= 5) return 'text-lg sm:text-2xl font-black';
    if (gridSize <= 6) return 'text-base sm:text-xl font-extrabold';
    if (gridSize <= 7) return 'text-sm sm:text-lg font-extrabold';
    if (gridSize <= 8) return 'text-xs sm:text-base font-bold';
    return 'text-[11px] sm:text-sm font-bold'; // 9x9 and 10x10
  };

  const getCircleStyles = () => {
    if (isWrong) {
      return 'border-2 border-red-500 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 scale-95 shadow-xs shadow-red-500/40 animate-shake';
    }
    if (isJustCorrect) {
      return 'border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 scale-105 shadow-xs shadow-emerald-500/40';
    }
    if (isCompleted) {
      return 'border border-zinc-300 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600 opacity-40 cursor-default';
    }
    return 'border-2 border-black dark:border-white bg-white dark:bg-zinc-950 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 shadow-xs cursor-pointer';
  };

  return (
    <button
      type="button"
      disabled={disabled || isCompleted}
      onClick={() => onClick(cardId, number)}
      className={`aspect-square w-full rounded-full flex items-center justify-center transition-all duration-100 select-none touch-manipulation focus:outline-none ${getCircleStyles()}`}
      aria-label={`Number ${number}`}
    >
      <span className={`font-mono tracking-tight ${getFontSize()}`}>
        {number}
      </span>
    </button>
  );
});
