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
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block mb-2">
          Game Concluded
        </span>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-ink">
          {isVillageWin ? 'Village Victory' : 'Werewolves Prevail'}
        </h1>
        <p className="text-ink-muted text-sm mt-2 max-w-md mx-auto">
          {gameOverData?.reason || 'The round has concluded.'}
        </p>
      </div>

      {/* Stats Ribbon */}
      <div className="flex justify-center items-center gap-6 py-4 border-y border-rule font-mono text-xs uppercase">
        <div>
          <span className="text-ink-muted block text-[9px] font-bold">Nights Survived</span>
          <span className="text-xl font-black text-ink">
            {gameOverData?.nightsSurvived ?? roundNumber}
          </span>
        </div>
        <div className="h-6 w-px bg-surface-hover" />
        <div>
          <span className="text-ink-muted block text-[9px] font-bold">Winning Faction</span>
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
      <Card className="p-6 border border-rule text-left">
        <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-ink-muted mb-4">
          All Secret Roles Revealed
        </h3>

        <div className="divide-y divide-rule">
          {players.map((p) => {
            const roleInfo = gameOverData?.roles?.[p.id];
            const isEvil = roleInfo?.alignment === 'EVIL' || p.revealedAlignment === 'EVIL';

            return (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-ink-faint">#{p.seatNumber}</span>
                  <span className="text-sm font-bold text-ink">
                    {p.displayName}
                  </span>
                  {!p.isAlive && (
                    <span className="text-[10px] font-mono text-red-600 dark:text-red-400 flex items-center gap-0.5">
                      <Skull size={11} /> Dead
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-ink">
                    {roleInfo?.roleName || p.revealedRoleName || 'Villager'}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-xs uppercase border ${
                      isEvil
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                        : 'border-ink/40 bg-surface text-ink'
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
