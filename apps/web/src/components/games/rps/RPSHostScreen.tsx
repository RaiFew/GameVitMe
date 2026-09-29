import type { RPSPlayerView, RPSChoice } from '@party/rock-paper-scissors';
import { RPSFightingScreen } from './RPSFightingScreen';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Tv, Trophy, RotateCcw, ArrowLeft, Users, ShieldAlert } from 'lucide-react';

interface Props {
  playerView: RPSPlayerView;
  onNextRound: () => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

function getChoiceEmoji(choice: RPSChoice | null): string {
  switch (choice) {
    case 'ROCK':
      return '🪨';
    case 'PAPER':
      return '📄';
    case 'SCISSORS':
      return '✂️';
    default:
      return '❓';
  }
}

export function RPSHostScreen({
  playerView,
  onNextRound,
  onReturnLobby,
  onPlayAgain,
}: Props) {
  const {
    gameMode,
    phase,
    roundNumber,
    targetScore,
    players,
    lastRoundOutcome,
    winnerIds,
    winReason,
  } = playerView;

  // 1v1 Mode uses the dedicated Fighting Game Arcade HUD
  if (gameMode === 'DUEL' && players.length === 2) {
    return (
      <RPSFightingScreen
        playerView={playerView}
        onNextRound={onNextRound}
        onReturnLobby={onReturnLobby}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  const isChoosing = phase === 'CHOOSING';
  const isGameOver = phase === 'GAME_OVER';
  const alivePlayers = players.filter((p) => p.isAlive);
  const eliminatedIds = lastRoundOutcome?.eliminatedIds || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6 select-none font-sans">
      {/* TV Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-amber-500 text-black font-black font-mono text-[10px] uppercase tracking-widest rounded-xs shadow-xs">
              TV HOST SCREEN
            </span>
            <span className="text-xs font-mono font-bold text-ink-muted uppercase">
              {gameMode === 'BATTLE_ROYALE' ? 'Battle Royale Survival' : 'Points Race'} • Round {roundNumber}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
            Rock Paper Scissors Tournament Arena
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {gameMode === 'BATTLE_ROYALE' ? (
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xs text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{alivePlayers.length} / {players.length} Survivors</span>
            </div>
          ) : (
            <div className="px-3 py-1 bg-canvas-sunk border border-rule rounded-xs text-xs font-mono font-bold text-ink">
              First to {targetScore} pts
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Outcome Banner */}
      {!isChoosing && lastRoundOutcome && (
        <div
          className={`p-4 rounded-xs border-2 text-center transition-all ${
            lastRoundOutcome.isTie
              ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200'
              : 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">{lastRoundOutcome.isTie ? '🤝' : '⚡'}</span>
            <span className="text-xs font-mono font-black uppercase tracking-widest">
              Round {roundNumber} Clash Result
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
            {lastRoundOutcome.description}
          </h3>
          {gameMode === 'BATTLE_ROYALE' && eliminatedIds.length > 0 && (
            <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400 mt-1">
              ⚠️ {eliminatedIds.length} player(s) eliminated this round!
            </p>
          )}
        </div>
      )}

      {/* Game Over Champion Announcement */}
      {isGameOver && (
        <Card className="p-6 text-center border-2 border-amber-400 bg-amber-500/10 space-y-2">
          <div className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-500 mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink">
            🏆 TOURNAMENT WINNER CROWNED! 🏆
          </h2>
          {winReason && (
            <p className="text-sm font-mono font-bold text-ink-muted">
              {winReason}
            </p>
          )}
        </Card>
      )}

      {/* Combatant Arena Grid: Who faces whom & what everyone threw */}
      <Card className="p-5 border border-rule space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted font-bold">
            Live Combatants & Weapons Thrown ({players.length} Competitors)
          </span>
          <span className="text-[10px] font-mono text-ink-faint">
            {isChoosing ? 'Awaiting all choices...' : 'Simultaneous Reveal'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {players.map((player) => {
            const isWinner = winnerIds.includes(player.id);
            const isEliminated = eliminatedIds.includes(player.id) || !player.isAlive;

            return (
              <div
                key={player.id}
                className={`p-3 rounded-xs border-2 transition-all flex flex-col items-center text-center relative ${
                  isEliminated
                    ? 'opacity-35 border-rule bg-canvas-sunk/30'
                    : isWinner
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg ring-2 ring-emerald-500/30'
                    : 'border-rule bg-canvas'
                }`}
              >
                {/* Status Badges */}
                {isEliminated ? (
                  <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-red-600 text-white text-[8px] font-mono font-bold uppercase rounded-xs">
                    OUT
                  </span>
                ) : isWinner ? (
                  <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-600 text-white text-[8px] font-mono font-bold uppercase rounded-xs">
                    WIN
                  </span>
                ) : null}

                {/* Hand Display */}
                <div className="w-14 h-14 rounded-full border border-rule bg-canvas-sunk flex items-center justify-center my-2 shadow-inner">
                  {isChoosing ? (
                    player.hasChosen ? (
                      <div className="flex flex-col items-center">
                        <span className="text-emerald-500 font-black font-mono text-base">✓</span>
                        <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                          READY
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center animate-pulse">
                        <span className="text-ink-faint text-base">⚡</span>
                        <span className="text-[8px] font-mono text-ink-faint uppercase">
                          PICKING
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="text-3xl animate-bounce">
                      {getChoiceEmoji(player.choice)}
                    </span>
                  )}
                </div>

                {/* Player Name */}
                <span className="font-black text-xs truncate max-w-full text-ink uppercase tracking-tight">
                  {player.displayName}
                </span>

                {/* Revealed Hand Label / Score */}
                {!isChoosing && player.choice && (
                  <span className="text-[10px] font-mono font-bold text-ink-muted mt-0.5">
                    {player.choice}
                  </span>
                )}

                {/* Score or Status */}
                <div className="mt-2 pt-1 border-t border-rule w-full flex items-center justify-center gap-1 font-mono text-[10px] font-bold">
                  {gameMode !== 'BATTLE_ROYALE' ? (
                    <span className="text-ink">
                      Score: <strong className="text-ink">{player.score}</strong>
                    </span>
                  ) : (
                    <span className={player.isAlive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-faint'}>
                      {player.isAlive ? 'Active Survivor' : 'Eliminated'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Host TV Bottom Action Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-rule pt-4">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-mono text-ink-muted">
            TV Big-Screen Mode • All player actions synchronized from mobile devices
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isGameOver ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={onReturnLobby}
                className="text-xs font-bold uppercase tracking-wider flex-1 sm:flex-initial"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Return to Lobby
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={onPlayAgain}
                className="text-xs font-bold uppercase tracking-wider flex-1 sm:flex-initial"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Rematch
              </Button>
            </>
          ) : (
            <>
              {phase === 'ROUND_RESULT' && (
                <Button
                  size="sm"
                  onClick={onNextRound}
                  className="text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black w-full sm:w-auto shadow-md"
                >
                  Next Round →
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={onReturnLobby}
                className="text-xs font-bold uppercase tracking-wider w-full sm:w-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Lobby
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
