import { useEffect } from 'react';
import type { RPSChoice } from '@party/rock-paper-scissors';

interface Props {
  selectedChoice: RPSChoice | null;
  onSelect: (choice: RPSChoice) => void;
  disabled?: boolean;
}

interface ChoiceOption {
  type: RPSChoice;
  name: string;
  nameTh: string;
  emoji: string;
  shortcut: string;
  beatsTh: string;
  colorClass: string;
  bgClass: string;
}

const CHOICES: ChoiceOption[] = [
  {
    type: 'ROCK',
    name: 'Rock',
    nameTh: 'ค้อน',
    emoji: '🪨',
    shortcut: '1 / R',
    beatsTh: 'ชนะ กรรไกร',
    colorClass: 'text-amber-600 dark:text-amber-400 border-amber-500/50 hover:border-amber-500',
    bgClass: 'hover:bg-amber-500/10',
  },
  {
    type: 'PAPER',
    name: 'Paper',
    nameTh: 'กระดาษ',
    emoji: '📄',
    shortcut: '2 / P',
    beatsTh: 'ชนะ ค้อน',
    colorClass: 'text-blue-600 dark:text-blue-400 border-blue-500/50 hover:border-blue-500',
    bgClass: 'hover:bg-blue-500/10',
  },
  {
    type: 'SCISSORS',
    name: 'Scissors',
    nameTh: 'กรรไกร',
    emoji: '✂️',
    shortcut: '3 / S',
    beatsTh: 'ชนะ กระดาษ',
    colorClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/50 hover:border-emerald-500',
    bgClass: 'hover:bg-emerald-500/10',
  },
];

export function RPSChoiceSelector({ selectedChoice, onSelect, disabled = false }: Props) {
  // Keyboard shortcut listener
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === '1' || key === 'R') {
        onSelect('ROCK');
      } else if (key === '2' || key === 'P') {
        onSelect('PAPER');
      } else if (key === '3' || key === 'S') {
        onSelect('SCISSORS');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onSelect]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
          Choose Your Hand
        </span>
        <span className="text-[10px] font-mono text-zinc-400">
          Keyboard: 1, 2, 3 or R, P, S
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {CHOICES.map((choice) => {
          const isSelected = selectedChoice === choice.type;

          return (
            <button
              key={choice.type}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(choice.type)}
              className={`relative group p-4 sm:p-6 rounded-xs border-2 transition-all flex flex-col items-center text-center select-none active:scale-95 ${
                disabled
                  ? 'opacity-40 cursor-not-allowed border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/30'
                  : isSelected
                  ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-lg ring-4 ring-black/10 dark:ring-white/10 scale-102'
                  : `border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-white ${choice.bgClass} hover:border-black dark:hover:border-white cursor-pointer`
              }`}
            >
              {isSelected && (
                <span className="absolute -top-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-widest rounded-xs shadow-xs">
                  Locked In ✓
                </span>
              )}

              <span className="text-4xl sm:text-5xl my-1 group-hover:scale-110 transition-transform">
                {choice.emoji}
              </span>

              <div className="mt-2">
                <div className="flex items-center justify-center gap-1">
                  <span className="font-black text-sm sm:text-base uppercase tracking-tight">
                    {choice.name}
                  </span>
                  <span className="text-xs opacity-70 font-medium">({choice.nameTh})</span>
                </div>
                <p
                  className={`text-[10px] font-mono mt-0.5 ${
                    isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500'
                  }`}
                >
                  {choice.beatsTh}
                </p>
              </div>

              <span
                className={`mt-2 text-[9px] font-mono px-1.5 py-0.5 rounded-xs border ${
                  isSelected
                    ? 'border-white/30 dark:border-black/30 text-white/80 dark:text-black/80'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                }`}
              >
                [{choice.shortcut}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
