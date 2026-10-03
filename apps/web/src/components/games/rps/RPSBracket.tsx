import type { RPSPlayerView, RPSMatch } from '@party/rock-paper-scissors';

interface Props {
  playerView: RPSPlayerView;
}

/**
 * The bracket as a strip of rounds. Mobile scrolls it horizontally rather than
 * stacking it, so the whole tournament stays one glanceable row.
 */
export function RPSBracket({ playerView }: Props) {
  const bracket = playerView.bracket;
  if (!bracket) return null;

  const nameOf = (id: string | null) =>
    id ? (playerView.players.find((p) => p.id === id)?.displayName ?? 'Player') : '—';

  const seat = (m: RPSMatch, id: string | null) => {
    const isWinner = !!id && m.winnerId === id;
    const isLoser = !!id && !!m.winnerId && m.winnerId !== id;
    return (
      <div
        key={id ?? 'empty'}
        className={`flex items-center justify-between gap-1 border rounded-xs px-1.5 py-1 min-w-0 ${
          isWinner
            ? 'border-ink bg-ink text-canvas'
            : isLoser
              ? 'border-rule bg-canvas-sunk text-ink-faint line-through'
              : 'border-rule bg-canvas text-ink'
        }`}
      >
        <span className="font-mono text-[10px] truncate">{nameOf(id)}</span>
        {id && (
          <span className="font-mono text-[9px] opacity-70 shrink-0">
            {playerView.players.find((p) => p.id === id)?.lives ?? 0}♥
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="border border-rule rounded-xs bg-canvas">
      <div className="px-3 py-1.5 border-b border-rule flex items-center justify-between">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-ink">
          Bracket
        </span>
        {bracket.championId && (
          <span className="text-[10px] font-mono font-black uppercase text-amber-600 dark:text-amber-400">
            🏆 {nameOf(bracket.championId)}
          </span>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto p-3">
        {bracket.rounds.map((round, ri) => (
          <div key={ri} className="flex flex-col gap-2 shrink-0 w-36">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink-muted">
              {ri === bracket.rounds.length - 1 && round.length === 1
                ? 'Final'
                : `Round ${ri + 1}`}
            </span>
            {round.map((m) => (
              <div
                key={m.id}
                className={`space-y-1 rounded-xs p-1 ${
                  m.status === 'LIVE' ? 'border border-ink bg-canvas-sunk' : ''
                }`}
              >
                {m.status === 'BYE' ? (
                  <div className="border border-dashed border-rule rounded-xs px-1.5 py-1 text-center font-mono text-[10px] text-ink-faint">
                    {nameOf(m.winnerId)} — BYE
                  </div>
                ) : (
                  <>
                    {seat(m, m.playerAId)}
                    {seat(m, m.playerBId)}
                  </>
                )}
                {m.status === 'LIVE' && (
                  <span className="block text-center font-mono text-[9px] font-bold uppercase text-ink">
                    ● live
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
