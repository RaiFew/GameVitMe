import type { CodenamesPublicCard, CardColor } from '@party/codenames';
import { Skull, Check } from 'lucide-react';

interface Props {
  cards: CodenamesPublicCard[];
  isSpymaster: boolean;
  canGuess: boolean;
  onSelectCard: (cardId: string) => void;
}

export function CodenamesBoard({ cards, isSpymaster, canGuess, onSelectCard }: Props) {
  const getCardStyle = (card: CodenamesPublicCard) => {
    if (card.revealed) {
      if (card.color === 'RED') {
        return 'bg-red-600 dark:bg-red-700 text-white border-red-700 shadow-inner font-black';
      }
      if (card.color === 'BLUE') {
        return 'bg-blue-600 dark:bg-blue-700 text-white border-blue-700 shadow-inner font-black';
      }
      if (card.color === 'ASSASSIN') {
        return 'bg-black text-white dark:bg-white dark:text-black border-2 border-red-600 font-black';
      }
      // NEUTRAL
      return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700 line-through';
    }

    // Unrevealed Card
    if (isSpymaster && card.color) {
      // Spymaster View (colors visible on unrevealed)
      if (card.color === 'RED') {
        return 'border-2 border-red-600/80 bg-red-50/70 dark:bg-red-950/30 text-red-950 dark:text-red-200 font-black shadow-xs';
      }
      if (card.color === 'BLUE') {
        return 'border-2 border-blue-600/80 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 font-black shadow-xs';
      }
      if (card.color === 'ASSASSIN') {
        return 'border-2 border-black dark:border-white bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-black';
      }
      // NEUTRAL
      return 'border border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400';
    }

    // Operative View (hidden card)
    return 'border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-black dark:text-white font-bold hover:border-black dark:hover:border-white hover:shadow-md transition-all';
  };

  const getCardTag = (card: CodenamesPublicCard) => {
    if (card.revealed) {
      if (card.color === 'ASSASSIN') return 'ASSASSIN ☠';
      if (card.color === 'NEUTRAL') return 'BYSTANDER';
      return `${card.color} AGENT`;
    }

    if (isSpymaster && card.color) {
      if (card.color === 'ASSASSIN') return 'ASSASSIN';
      if (card.color === 'NEUTRAL') return 'NEUTRAL';
      return card.color;
    }

    return null;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-5 gap-2 sm:gap-3.5">
        {cards.map((card) => {
          const style = getCardStyle(card);
          const tag = getCardTag(card);
          const isClickable = canGuess && !card.revealed && !isSpymaster;

          return (
            <button
              key={card.id}
              disabled={!isClickable}
              onClick={() => isClickable && onSelectCard(card.id)}
              className={`h-20 sm:h-24 md:h-28 p-2 rounded-xs flex flex-col items-center justify-center text-center relative select-none ${style} ${
                isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : 'cursor-default'
              }`}
            >
              {/* Badge for Spymaster / Revealed */}
              {tag && (
                <span
                  className={`text-[8px] sm:text-[9px] font-mono font-black uppercase tracking-wider absolute top-1.5 left-2 px-1 py-0.2 rounded-xs ${
                    card.revealed
                      ? 'opacity-80'
                      : card.color === 'RED'
                      ? 'text-red-700 dark:text-red-300'
                      : card.color === 'BLUE'
                      ? 'text-blue-700 dark:text-blue-300'
                      : card.color === 'ASSASSIN'
                      ? 'text-red-400 dark:text-red-600'
                      : 'text-zinc-500'
                  }`}
                >
                  {tag}
                </span>
              )}

              {/* Main Word */}
              <span className="text-xs sm:text-sm md:text-base font-black tracking-tight uppercase break-all px-1 mt-1">
                {card.word}
              </span>

              {/* Revealed Status Checkmark / Skull */}
              {card.revealed && (
                <div className="absolute bottom-1.5 right-2 opacity-70">
                  {card.color === 'ASSASSIN' ? <Skull size={14} /> : <Check size={14} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
