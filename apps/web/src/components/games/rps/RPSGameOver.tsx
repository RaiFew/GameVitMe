import type { RPSPlayerView } from '@party/rock-paper-scissors';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react';

interface Props {
  playerView: RPSPlayerView;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
  isHost: boolean;
}

export function RPSGameOver({
  playerView,
  onReturnLobby,
  onPlayAgain,
  isHost,
}: Props) {
  const { winnerIds, winReason, players, stats, gameMode } = playerView;

  const winners = players.filter((p) => winnerIds.includes(p.id));
  const isMeWinner = winnerIds.includes(playerView.me.id);

  // Sort players by score or survival
  const sortedPlayers = [...players].sort((a, b) => {
    if (gameMode === 'BATTLE_ROYALE') {
      if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    }
    return b.score - a.score;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      {/* Victory Header */}
      <Card
        className={`p-6 sm:p-8 text-center border-2 ${
          isMeWinner
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950'
        }`}
      >
        <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3">
          <Trophy className="w-8 h-8" />
        </div>

        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
          Match Concluded
        </span>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
          {winners.length === 1
            ? `${winners[0]?.displayName} Wins!`
            : 'Match Ended in Joint Victory!'}
        </h2>

        {winReason && (
          <p className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 mt-2">
            {winReason}
          </p>
        )}

        {/* Match Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="p-2 rounded-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Total Rounds</span>
            <span className="text-sm font-black font-mono text-black dark:text-white">
              {stats?.totalRounds || playerView.roundNumber}
            </span>
          </div>

          <div className="p-2 rounded-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Most Thrown</span>
            <span className="text-sm font-black font-mono text-black dark:text-white">
              {stats?.mostCommonWeapon ? `${stats.mostCommonWeapon}` : 'Balanced'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2 rounded-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Game Format</span>
            <span className="text-sm font-black font-mono text-black dark:text-white">
              {gameMode === 'DUEL' ? '1v1 Duel' : gameMode === 'BATTLE_ROYALE' ? 'Battle Royale' : 'Points Race'}
            </span>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="p-5 border border-zinc-300 dark:border-zinc-800 space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-500">
          Final Leaderboard
        </h3>

        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const isWinner = winnerIds.includes(player.id);
            const isMe = player.id === playerView.me.id;

            return (
              <div
                key={player.id}
                className={`p-3 rounded-xs border flex items-center justify-between transition-all ${
                  isWinner
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isMe
                    ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 font-mono text-xs font-bold text-zinc-400">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-black dark:text-white">
                        {player.displayName}
                      </span>
                      {isMe && (
                        <span className="text-[8px] font-mono uppercase px-1 rounded-xs bg-black dark:bg-white text-white dark:text-black">
                          YOU
                        </span>
                      )}
                      {isWinner && (
                        <span className="text-[8px] font-mono uppercase px-1 rounded-xs bg-emerald-600 text-white font-bold">
                          CHAMPION
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="font-mono text-xs font-black text-black dark:text-white">
                  {gameMode !== 'BATTLE_ROYALE' ? (
                    <span>{player.score} pts</span>
                  ) : (
                    <span className={player.isAlive ? 'text-emerald-500' : 'text-zinc-400'}>
                      {player.isAlive ? 'Survivor' : 'Eliminated'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Footer Navigation */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1 text-xs"
          onClick={onReturnLobby}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Return to Lobby
        </Button>

        {isHost && (
          <Button
            variant="primary"
            size="lg"
            className="flex-1 text-xs font-bold"
            onClick={onPlayAgain}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Play Again
          </Button>
        )}
      </div>
    </div>
  );
}
