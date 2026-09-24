import type { WerewolfPlayerView } from '@party/werewolf';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Trophy, RotateCcw, Home, Skull, CheckCircle } from 'lucide-react';

interface WerewolfGameOverProps {
  playerView: WerewolfPlayerView;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
  isHost: boolean;
}

export function WerewolfGameOver({
  playerView,
  onReturnLobby,
  onPlayAgain,
  isHost,
}: WerewolfGameOverProps) {
  const { gameOverData, roundNumber, players } = playerView;
  const isVillageWin = gameOverData?.winner === 'VILLAGE';

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl text-center space-y-8">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-2">
          Game Concluded
        </span>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-black dark:text-white">
          {isVillageWin ? 'Village Victory' : 'Werewolves Prevail'}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-2 max-w-md mx-auto">
          {gameOverData?.reason || 'The round has concluded.'}
        </p>
      </div>

      {/* Stats Ribbon */}
      <div className="flex justify-center items-center gap-6 py-4 border-y border-zinc-200 dark:border-zinc-800 font-mono text-xs uppercase">
        <div>
          <span className="text-zinc-500 block text-[9px] font-bold">Nights Survived</span>
          <span className="text-xl font-black text-black dark:text-white">
            {gameOverData?.nightsSurvived ?? roundNumber}
          </span>
        </div>
        <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
        <div>
          <span className="text-zinc-500 block text-[9px] font-bold">Winning Faction</span>
          <span
            className={`text-xl font-black ${
              isVillageWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {gameOverData?.winner}
          </span>
        </div>
      </div>

      {/* Secret Roles Revealed Table (Requirement 57) */}
      <Card className="p-6 border border-zinc-300 dark:border-zinc-800 text-left">
        <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500 mb-4">
          All Secret Roles Revealed
        </h3>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {players.map((p) => {
            const roleInfo = gameOverData?.roles?.[p.id];
            const isEvil = roleInfo?.alignment === 'EVIL' || p.revealedAlignment === 'EVIL';

            return (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-zinc-400">#{p.seatNumber}</span>
                  <span className="text-sm font-bold text-black dark:text-white">
                    {p.displayName}
                  </span>
                  {!p.isAlive && (
                    <span className="text-[10px] font-mono text-red-600 dark:text-red-400 flex items-center gap-0.5">
                      <Skull size={11} /> Dead
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-black dark:text-white">
                    {roleInfo?.roleName || p.revealedRoleName || 'Villager'}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-xs uppercase border ${
                      isEvil
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                        : 'border-zinc-400 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {roleInfo?.alignment || p.revealedAlignment || 'GOOD'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        <Button variant="outline" size="lg" onClick={onReturnLobby} className="w-full sm:w-auto min-w-[180px]">
          <Home size={16} className="mr-2" /> Return to Lobby
        </Button>
        {isHost && (
          <Button size="lg" onClick={onPlayAgain} className="w-full sm:w-auto min-w-[180px]">
            <RotateCcw size={16} className="mr-2" /> Play Again
          </Button>
        )}
      </div>
    </div>
  );
}
