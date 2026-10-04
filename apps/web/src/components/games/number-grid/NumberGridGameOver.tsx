import { useEffect, useState } from 'react';
import type { NumberGridPlayerView } from '@party/number-grid';
import { Trophy, RotateCcw, Home, Skull, Award } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { api } from '../../../lib/api';
import { hasHp } from './HealthDisplay';

interface NumberGridGameOverProps {
  playerView: NumberGridPlayerView;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

const MODE_LABEL: Record<string, string> = {
  TIME: 'Time',
  TOWER: 'Tower Climb',
  CHAOS: 'Chaos',
};

const formatMs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

/**
 * The ranked run's own summary: what the server scored, the resulting personal
 * best, and where that put the player. The personal best and rank are read back
 * from the server rather than assumed, so a run that did not beat the previous
 * best still reports honestly.
 */
function RankedResult({ playerView }: { playerView: NumberGridPlayerView }) {
  const { ranked } = playerView;
  const [mine, setMine] = useState<{ score: number; rank: number | null } | null>(null);

  useEffect(() => {
    if (!ranked) return;
    api
      .get<{ entries: Record<string, { score: number; rank: number | null }> }>('/api/ranking/me')
      .then((res) => {
        const entry = res?.entries?.[ranked.leaderboardKey];
        if (entry) setMine({ score: entry.score, rank: entry.rank });
      })
      .catch(() => {});
  }, [ranked?.leaderboardKey]);

  if (!ranked) return null;
  const result = ranked.result;
  const isTime = ranked.rankingDirection === 'LOWER_IS_BETTER';

  return (
    <div className="space-y-2 text-left">
      <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted block">
        Result • Ranked
      </span>

      <div className="border border-rule rounded-xs divide-y divide-rule">
        <Row label="Mode" value={result ? MODE_LABEL[result.mode] ?? result.mode : '—'} />
        <Row
          label="Result"
          value={
            result
              ? isTime
                ? formatMs(result.totalTimeMs)
                : `${result.highestFloor} floor${result.highestFloor === 1 ? '' : 's'}`
              : '—'
          }
          highlight
        />
        <Row
          label="Status"
          value={result ? result.status.charAt(0) + result.status.slice(1).toLowerCase() : '—'}
        />
        <Row
          label="Personal Best"
          value={mine ? (isTime ? formatMs(mine.score) : String(mine.score)) : '—'}
        />
        <Row
          label="Current Ranking"
          value={mine?.rank ? `#${mine.rank}` : 'Unranked'}
        />
      </div>

      {result && result.status !== 'COMPLETED' && (
        <p className="text-[10px] font-mono text-ink-muted">
          {isTime
            ? 'A run that is not completed still records the time reached.'
            : 'The run ended early; the floors you cleared are still scored.'}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-2.5 py-2 flex items-center justify-between text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-mono font-bold ${highlight ? 'text-ink' : 'text-ink-muted'}`}>
        {value}
      </span>
    </div>
  );
}

export function NumberGridGameOver({
  playerView,
  onPlayAgain,
  onReturnLobby,
}: NumberGridGameOverProps) {
  const { me, isHost, ranked, winners, opponents, totalRounds, currentRoundNumber } = playerView;

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

        {/* Ranked runs report the score instead of standings — there is no one
            else in the room. */}
        {ranked ? (
          <RankedResult playerView={playerView} />
        ) : (
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
                      ) : hasHp(p.maxHp) ? (
                        `HP: ${Math.max(0, p.hp)}/${p.maxHp}`
                      ) : null}
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
        )}

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
