import type { NumberGridPlayerView } from '@party/number-grid';
import { Trophy, RotateCcw, Home, Skull, Award } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

interface NumberGridGameOverProps {
  playerView: NumberGridPlayerView;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export function NumberGridGameOver({
  playerView,
  onPlayAgain,
  onReturnLobby,
}: NumberGridGameOverProps) {
  const { me, isHost, winners, opponents, totalRounds, currentRoundNumber } = playerView;

  // Aggregate all players for final standings
  const allPlayers = [
    ...(me ? [me] : []),
    ...opponents.map((opp) => ({
      playerId: opp.id,
      displayName: opp.displayName,
      hp: opp.hp,
      maxHp: opp.maxHp,
      eliminated: opp.eliminated,
      finishOrder: opp.finishOrder,
      expectedNumber: opp.expectedNumber,
    })),
  ];

  const winnerIds = winners || [];
  const isWinner = me ? winnerIds.includes(me.playerId) : false;

  const winnerNames = allPlayers
    .filter((p) => winnerIds.includes(p.playerId))
    .map((p) => p.displayName);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl mx-auto w-full font-mono">
      <Card className="w-full p-6 sm:p-8 border border-rule text-center space-y-6">
        {/* Trophy / Result Icon */}
        <div className="flex justify-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              isWinner
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-500 shadow-lg shadow-amber-500/20'
                : me?.eliminated
                ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-500'
                : 'border-ink/40 bg-canvas-sunk text-ink-muted'
            }`}
          >
            {isWinner ? (
              <Trophy size={32} />
            ) : me?.eliminated ? (
              <Skull size={32} />
            ) : (
              <Award size={32} />
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted block">
            Match Concluded • {currentRoundNumber}/{totalRounds} Rounds
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink mt-1">
            {isWinner
              ? 'Victory Achieved!'
              : me?.eliminated
              ? 'Eliminated'
              : 'Match Over'}
          </h1>
          {winnerNames.length > 0 && (
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-2">
              Winner{winnerNames.length > 1 ? 's' : ''}: {winnerNames.join(', ')}
            </p>
          )}
        </div>

        {/* Final Standings */}
        <div className="space-y-2 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
            Final Standings
          </span>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {allPlayers.map((p) => {
              const isWin = winnerIds.includes(p.playerId);
              const isSelf = me?.playerId === p.playerId;

              return (
                <div
                  key={p.playerId}
                  className={`p-2.5 rounded-xs border text-xs flex items-center justify-between ${
                    isWin
                      ? 'border-amber-400 dark:border-amber-600/80 bg-amber-50/50 dark:bg-amber-950/30'
                      : p.eliminated
                      ? 'border-rule bg-canvas-sunk/30 opacity-60'
                      : 'border-rule bg-canvas'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isWin ? (
                      <span className="text-amber-500 font-bold">🏆</span>
                    ) : p.eliminated ? (
                      <Skull size={13} className="text-red-500" />
                    ) : (
                      <span className="text-ink-faint font-bold">•</span>
                    )}
                    <span className="font-bold text-ink">
                      {p.displayName} {isSelf && '(You)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[11px] text-ink-muted">
                      {p.eliminated ? (
                        <span className="text-red-500 font-bold">Eliminated</span>
                      ) : (
                        `HP: ${Math.max(0, p.hp)}/${p.maxHp}`
                      )}
                    </span>
                    {isWin && (
                      <span className="text-[9px] font-black uppercase bg-amber-500 text-black px-1.5 py-0.5 rounded-xs">
                        Winner
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host controls & actions */}
        <div className="pt-4 border-t border-rule space-y-2">
          {isHost ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                variant="primary"
                onClick={onPlayAgain}
                className="w-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                Play Again
              </Button>
              <Button
                variant="secondary"
                onClick={onReturnLobby}
                className="w-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Home size={14} />
                Return to Lobby
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">Waiting for room host to start a new game...</p>
              <Button
                variant="secondary"
                onClick={onReturnLobby}
                className="w-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Home size={14} />
                Return to Lobby
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
