import type { CodenamesPlayerView } from '@party/codenames';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CodenamesBoard } from './CodenamesBoard';
import { Trophy, Skull, RotateCcw, ArrowLeft, Users } from 'lucide-react';

interface Props {
  playerView: CodenamesPlayerView;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
  isHost: boolean;
}

export function CodenamesGameOver({ playerView, onReturnLobby, onPlayAgain, isHost }: Props) {
  const { winner, winReason, cards, turnNumber, redRemaining, blueRemaining, gameMode, mistakesMade } = playerView;
  const isTwoPlayer = gameMode === 'TWO_PLAYER';
  const isCoopWon = isTwoPlayer && (winner === 'RED' || winReason === 'ALL_CARDS_FOUND');
  const isRed = winner === 'RED';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 text-center">
      {/* Victory / Defeat Banner */}
      {isTwoPlayer ? (
        <Card className={`p-8 border-2 ${
          isCoopWon
            ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
            : 'border-red-600 bg-red-50/40 dark:bg-red-950/20'
        } space-y-4 shadow-lg`}>
          <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white bg-white dark:bg-zinc-900 flex items-center justify-center mx-auto text-black dark:text-white">
            {isCoopWon ? <Trophy size={32} className="text-emerald-500" /> : <Skull size={32} className="text-red-500" />}
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-1">
              Cooperative Mission Concluded
            </span>
            <h1 className={`text-4xl sm:text-5xl font-black uppercase tracking-tight ${
              isCoopWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isCoopWon ? 'GAME WON!' : 'GAME LOST'}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-zinc-600 dark:text-zinc-400 mt-2 max-w-md mx-auto">
              {isCoopWon
                ? 'Mission accomplished! All 9 friendly agents were successfully contacted!'
                : 'The Assassin was uncovered! The operation has failed.'}
            </p>
          </div>

          {/* Stats Pill */}
          <div className="flex justify-center gap-8 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block">Agents Found</span>
              <span className="font-black text-black dark:text-white">{9 - redRemaining} / 9</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Mistakes</span>
              <span className="font-black text-amber-600 dark:text-amber-400">{mistakesMade || 0}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Turns Played</span>
              <span className="font-black text-black dark:text-white">{turnNumber}</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={`p-8 border-2 ${isRed ? 'border-red-600 bg-red-50/30 dark:bg-red-950/20' : 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/20'} space-y-4 shadow-lg`}>
          <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white bg-white dark:bg-zinc-900 flex items-center justify-center mx-auto text-black dark:text-white">
            {winReason === 'ASSASSIN_TRIGGERED' ? <Skull size={32} className="text-red-500" /> : <Trophy size={32} className="text-amber-500" />}
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-1">
              Match Concluded
            </span>
            <h1 className={`text-4xl sm:text-5xl font-black uppercase tracking-tight ${isRed ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {winner} Team Victory!
            </h1>
            <p className="text-xs sm:text-sm font-mono text-zinc-600 dark:text-zinc-400 mt-2 max-w-md mx-auto">
              {winReason === 'ASSASSIN_TRIGGERED'
                ? 'The opposing team contacted the Assassin. Immediate victory!'
                : 'All secret operatives were successfully identified!'}
            </p>
          </div>

          {/* Stats Pill */}
          <div className="flex justify-center gap-6 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block">Total Turns</span>
              <span className="font-black text-black dark:text-white">{turnNumber}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Red Remaining</span>
              <span className="font-black text-red-600 dark:text-red-400">{redRemaining}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Blue Remaining</span>
              <span className="font-black text-blue-600 dark:text-blue-400">{blueRemaining}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Unmasked Board Overview */}
      <div className="space-y-3 text-left">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
          Full Unmasked Board Key
        </span>
        <CodenamesBoard
          cards={cards}
          isSpymaster={true}
          canGuess={false}
          onSelectCard={() => {}}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        <Button variant="secondary" size="lg" onClick={onReturnLobby} className="w-full sm:w-auto font-mono text-xs font-bold uppercase min-w-[180px]">
          <ArrowLeft size={16} className="mr-2" /> Return to Lobby
        </Button>

        {isHost && (
          <Button variant="primary" size="lg" onClick={onPlayAgain} className="w-full sm:w-auto font-mono text-xs font-bold uppercase min-w-[180px]">
            <RotateCcw size={16} className="mr-2" /> Play Again
          </Button>
        )}
      </div>
    </div>
  );
}
