import type { SpyfallPlayerView } from '@party/spyfall';
import { SpyfallPhase } from '@party/spyfall';
import { GameTimer } from './GameTimer';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

interface HostControlScreenProps {
  playerView: SpyfallPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onOpenEndModal: () => void;
}

export function HostControlScreen({ playerView, onAction, onOpenEndModal }: HostControlScreenProps) {
  const phase = playerView.phase;
  const voting = playerView.voting;
  const accuser = playerView.players.find((p) => p.id === playerView.accuserId);
  const accused = playerView.players.find((p) => p.id === (voting?.accusedPlayerId || playerView.accusedPlayerId));
  const currentVoter = playerView.players.find((p) => p.id === voting?.currentVoterId);
  const playingPlayers = playerView.players.filter((p) => !p.isHost);

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Game Master Notification Banner */}
      <div className="border border-rule-strong p-4 flex items-center justify-between gap-4 rounded-xs bg-canvas-sunk">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">Host Screen</span>
          <h2 className="text-base font-black uppercase text-ink">Game Master Mode</h2>
          <p className="text-xs text-ink-muted">
            You manage the room and timer while the players play on their individual screens.
          </p>
        </div>

        <Button variant="danger" size="sm" onClick={onOpenEndModal} className="text-xs shrink-0 font-bold">
          End Round
        </Button>
      </div>

      {/* Role Reveal Phase */}
      {phase === SpyfallPhase.ROLE_REVEAL && (
        <Card className="text-center p-8 border border-rule">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block mb-1">
            Setup Phase
          </span>
          <h3 className="text-xl font-black uppercase text-ink mb-2">Secret Roles Distributed</h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto mb-6">
            All players are currently viewing their secret location and assigned role on their mobile screens.
          </p>

          <Button
            size="md"
            className="text-xs font-bold"
            onClick={() => onAction('ready_to_play')}
          >
            Start Questioning Round Now
          </Button>
        </Card>
      )}

      {/* Questioning Phase */}
      {phase === SpyfallPhase.QUESTIONING && (
        <Card className="p-8 border border-rule">
          <div className="text-center space-y-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted">Round Time Remaining</span>
              {playerView.roundExpiresAt > 0 && (
                <GameTimer expiresAt={playerView.roundExpiresAt} inline />
              )}
            </div>

            <div className="border border-rule p-4 rounded-xs max-w-xl mx-auto bg-canvas">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-ink-muted block mb-2">
                Active Playing Players ({playingPlayers.length})
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {playingPlayers.map((p) => (
                  <span
                    key={p.id}
                    className="border border-rule text-ink text-xs px-2.5 py-1 rounded-xs font-mono font-medium"
                  >
                    {p.displayName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Accusation Vote Phase */}
      {phase === SpyfallPhase.ACCUSATION_VOTE && (
        <Card className="p-8 border border-rule text-center space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">Indictment Vote</span>
          <h3 className="text-xl font-black uppercase text-ink">Vote in Progress</h3>

          <p className="text-sm text-ink-muted">
            <span className="font-bold text-ink">{accuser?.displayName || 'Accuser'}</span> accused{' '}
            <span className="font-bold underline text-ink">{accused?.displayName || 'Accused'}</span> of being the Spy.
          </p>

          {voting && (
            <div className="p-4 border border-rule rounded-xs max-w-xl mx-auto">
              <span className="text-[10px] font-mono uppercase text-ink-muted block mb-2">
                Current Voter: {currentVoter?.displayName || 'Waiting...'} ({voting.currentVoterIndex + 1} / {voting.totalVoters})
              </span>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {voting.voterOrder.map((pid, idx) => {
                  const voter = playerView.players.find((p) => p.id === pid);
                  const isPast = idx < voting.currentVoterIndex;
                  const isCurrent = idx === voting.currentVoterIndex;

                  return (
                    <div
                      key={pid}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold border ${
                        isCurrent
                          ? 'border-rule-strong bg-ink text-canvas'
                          : isPast
                          ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                          : 'border-rule text-ink-faint'
                      }`}
                    >
                      <span>{isPast ? '✓' : isCurrent ? '•' : '○'}</span>
                      <span>{voter?.displayName ?? 'Player'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Spy Guess Phase */}
      {phase === SpyfallPhase.SPY_GUESS && (
        <Card className="p-8 border border-rule text-center space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">Spy Reveal</span>
          <h3 className="text-xl font-black uppercase text-ink">The Spy Has Stepped Forward</h3>
          <p className="text-xs text-ink-muted max-w-lg mx-auto">
            The Spy is currently guessing the secret location on their device.
          </p>
        </Card>
      )}

      {/* Playing Players Roster */}
      <Card className="p-6 border border-rule">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted mb-4">
          All Players in Room ({playingPlayers.length})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {playingPlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2.5 border border-rule rounded-xs">
              <span className="text-xs font-bold text-ink">{p.displayName}</span>
              <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
