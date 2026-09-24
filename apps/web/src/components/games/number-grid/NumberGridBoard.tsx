import { useState, useCallback, useEffect } from 'react';
import type { GridSize, NumberCircleCard } from '@party/number-grid';
import { NumberCircle } from './NumberCircle';

interface NumberGridBoardProps {
  cards: NumberCircleCard[];
  gridSize: GridSize;
  expectedNumber: number;
  disabled: boolean;
  onCardClick: (cardId: string, number: number) => void;
  lastClickResult?: {
    cardId: string;
    number: number;
    correct: boolean;
    timestamp: number;
  };
}

export function NumberGridBoard({
  cards,
  gridSize,
  expectedNumber,
  disabled,
  onCardClick,
  lastClickResult,
}: NumberGridBoardProps) {
  const [flashCardId, setFlashCardId] = useState<string | null>(null);
  const [isFlashWrong, setIsFlashWrong] = useState(false);

  // Sync server click feedback (wrong click shake/red, or correct highlight)
  useEffect(() => {
    if (!lastClickResult) return;
    setFlashCardId(lastClickResult.cardId);
    setIsFlashWrong(!lastClickResult.correct);

    const timer = setTimeout(() => {
      setFlashCardId(null);
      setIsFlashWrong(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [lastClickResult]);

  const handleClick = useCallback(
    (cardId: string, number: number) => {
      if (disabled) return;

      if (number !== expectedNumber) {
        // Immediate optimistic wrong click feedback
        setFlashCardId(cardId);
        setIsFlashWrong(true);
        setTimeout(() => {
          setFlashCardId((prev) => (prev === cardId ? null : prev));
          setIsFlashWrong(false);
        }, 280);
      }

      onCardClick(cardId, number);
    },
    [disabled, expectedNumber, onCardClick],
  );

  // Responsive gaps based on grid dimensions
  const getGapClass = () => {
    if (gridSize <= 3) return 'gap-3 sm:gap-4 p-4';
    if (gridSize <= 5) return 'gap-2 sm:gap-2.5 p-3';
    if (gridSize <= 7) return 'gap-1.5 sm:gap-2 p-2';
    if (gridSize <= 9) return 'gap-1 sm:gap-1.5 p-1.5';
    return 'gap-0.5 sm:gap-1 p-1'; // 10x10
  };

  return (
    <div className="w-full flex items-center justify-center">
      <div
        className={`w-full max-w-[min(92vw,560px)] aspect-square bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-sm grid ${getGapClass()} transition-all`}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => {
          const isCompleted = card.number < expectedNumber;
          const isTargeted = flashCardId === card.id;

          return (
            <NumberCircle
              key={card.id}
              cardId={card.id}
              number={card.number}
              gridSize={gridSize}
              isCompleted={isCompleted}
              isWrong={isTargeted && isFlashWrong}
              isJustCorrect={isTargeted && !isFlashWrong}
              disabled={disabled}
              onClick={handleClick}
            />
          );
        })}
      </div>
    </div>
  );
}
