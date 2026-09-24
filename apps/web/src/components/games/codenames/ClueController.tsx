import { useState } from 'react';
import type { CodenamesPlayerView } from '@party/codenames';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Send, SkipForward, HelpCircle, Flame, Eye } from 'lucide-react';

interface Props {
  playerView: CodenamesPlayerView;
  onSubmitClue: (word: string, number: number) => void;
  onEndGuessing: () => void;
}

export function ClueController({ playerView, onSubmitClue, onEndGuessing }: Props) {
  const { me, phase, currentTeam, currentClue, guessesRemaining, guessesMadeInTurn } = playerView;
  const [word, setWord] = useState('');
  const [number, setNumber] = useState<number>(1);
  const [error, setError] = useState('');

  const isRed = currentTeam === 'RED';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanWord = word.trim().toUpperCase();
    if (!cleanWord) {
      setError('Please enter a clue word.');
      return;
    }
    if (/\s/.test(cleanWord)) {
      setError('Clue must be a single word without spaces.');
      return;
    }
    if (isNaN(number) || number < 0 || number > 9) {
      setError('Number must be between 0 and 9.');
      return;
    }
    setError('');
    onSubmitClue(cleanWord, number);
    setWord('');
  };

  // ─── Phase: CLUE ───────────────────────────────────────────────
  if (phase === 'CLUE') {
    if (me.canGiveClue) {
      return (
        <Card className="p-6 border-2 border-black dark:border-white bg-white dark:bg-zinc-950 shadow-md">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={18} className={isRed ? 'text-red-600' : 'text-blue-600'} />
              <h3 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
                Your Turn as {currentTeam} Spymaster
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">
              Submit Clue & Count
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-1">
                  Clue Word (One Word Only)
                </label>
                <Input
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. SPACE"
                  className="font-mono text-sm uppercase font-black tracking-wider"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-1">
                  Related Cards
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={number}
                    onChange={(e) => setNumber(parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xs text-sm font-mono font-bold text-black dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? '0 (Unlimited)' : n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs font-mono text-red-600 dark:text-red-400 font-bold">{error}</p>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto font-bold uppercase text-xs min-w-[160px]">
                Give Clue <Send size={14} className="ml-2" />
              </Button>
            </div>
          </form>
        </Card>
      );
    }

    // Not Spymaster's turn
    return (
      <Card className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-center">
        <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-300 font-mono text-xs uppercase font-bold">
          <span className={`w-2.5 h-2.5 rounded-full ${isRed ? 'bg-red-600' : 'bg-blue-600'} animate-pulse`} />
          Waiting for {currentTeam} Spymaster to give a clue...
        </div>
      </Card>
    );
  }

  // ─── Phase: GUESSING ───────────────────────────────────────────
  if (phase === 'GUESSING') {
    return (
      <Card className={`p-6 border-2 ${isRed ? 'border-red-600 dark:border-red-500' : 'border-blue-600 dark:border-blue-500'} bg-white dark:bg-zinc-950 shadow-md`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
              Active Clue • {currentTeam} Team Guessing
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white">
                {currentClue?.word}
              </span>
              <span className={`text-xl sm:text-2xl font-mono font-black px-3 py-0.5 rounded-xs border ${
                isRed
                  ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  : 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
              }`}>
                {currentClue?.number}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200 dark:border-zinc-800">
            <div className="text-right">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block font-bold">
                Guesses Left
              </span>
              <span className="text-base font-mono font-black text-black dark:text-white">
                {guessesRemaining > 50 ? 'Unlimited' : `${guessesRemaining} remaining`}
              </span>
            </div>

            {me.canGuess && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEndGuessing}
                className="text-xs font-mono uppercase font-bold border-zinc-400 hover:border-black dark:hover:border-white"
              >
                <SkipForward size={14} className="mr-1.5" /> End Turn / Pass
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
