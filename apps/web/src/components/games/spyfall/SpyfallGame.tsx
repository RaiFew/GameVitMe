import { useState } from 'react';
import type { SpyfallPlayerView } from '@party/spyfall';
import { SpyfallPhase } from '@party/spyfall';
import { RoleCard } from './RoleCard';
import { QuestionPhase } from './QuestionPhase';
import { VotingPhase } from './VotingPhase';
import { SpyGuessPhase } from './SpyGuessPhase';
import { GameOverScreen } from './GameOverScreen';
import { GameTimer } from './GameTimer';
import { LocationGrid } from './LocationGrid';
import { HostControlScreen } from './HostControlScreen';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../ui/Button';

interface SpyfallGameProps {
  playerView: SpyfallPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby?: () => void;
  onPlayAgain?: (customDurationSeconds?: number) => void;
}

export function SpyfallGame({ playerView, onAction, onReturnLobby, onPlayAgain }: SpyfallGameProps) {
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const [showEndModal, setShowEndModal] = useState(false);

  const isHost = playerView.isHost;
  const isGameOver = playerView.phase === SpyfallPhase.GAME_OVER;

  const handleConfirmEnd = () => {
    setShowEndModal(false);
    onAction('host_end_game', {});
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Host Control Bar (Host Mode Only) */}
      {isHost && !isGameOver && (
        <div className="border border-black dark:border-white rounded-xs p-4 bg-zinc-50 dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">Host Control Panel</p>
              <p className="text-black dark:text-white text-xs font-bold font-mono">
                Phase: <span className="uppercase">{playerView.phase.replace('_', ' ')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Players</p>
              <p className="text-black dark:text-white text-xs font-mono font-bold">{playerView.players.length} / 12</p>
            </div>

            <Button
              variant="danger"
              size="sm"
              className="text-xs font-bold h-8"
              onClick={() => setShowEndModal(true)}
            >
              End Game
            </Button>
          </div>
        </div>
      )}

      {/* Host End Game Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xs p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-black uppercase text-black dark:text-white">End This Round?</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs">
              All players will immediately be shown the outcome and returned to the lobby.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowEndModal(false)} className="flex-1 text-xs">
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmEnd} className="flex-1 text-xs font-bold">
                End Game
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Timer Bar */}
      {playerView.roundExpiresAt > 0 && !isGameOver && (
        <div className="flex justify-center">
          <GameTimer expiresAt={playerView.roundExpiresAt} />
        </div>
      )}

      {/* Player Turn Badges */}
      <div className="flex flex-wrap gap-1.5">
        {playerView.players.map((p) => {
          const isVoter = playerView.voting && p.id === playerView.voting.currentVoterId;
          const isAccused = playerView.voting && p.id === playerView.voting.accusedPlayerId;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-xs font-mono border transition-all ${
                isAccused
                  ? 'border-red-600 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold'
                  : isVoter
                  ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold'
                  : p.isHost
                  ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
              } ${!p.isConnected ? 'opacity-40' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${p.isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <span>{p.displayName}</span>
              {p.isHost && <span className="text-[9px] uppercase opacity-70">Host</span>}
              {isAccused && <span className="text-[9px] uppercase font-bold text-red-600">Accused</span>}
              {isVoter && <span className="text-[9px] uppercase font-bold">Voting</span>}
            </div>
          );
        })}
      </div>

      {/* Main Game Screen */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex items-start justify-center">
          {/* Host Mode - Host Screen */}
          {isHost && playerView.hostMode && !isGameOver ? (
            <HostControlScreen
              playerView={playerView}
              onAction={onAction}
              onOpenEndModal={() => setShowEndModal(true)}
            />
          ) : (
            <>
              {playerView.phase === SpyfallPhase.ROLE_REVEAL && (
                <RoleCard
                  isSpy={playerView.isSpy}
                  roleName={playerView.myRole}
                  locationName={playerView.location}
                  locations={playerView.allLocations}
                  onProceed={() => onAction('ready_to_play')}
                />
              )}

              {playerView.phase === SpyfallPhase.QUESTIONING && (
                <QuestionPhase
                  playerView={playerView}
                  onAction={onAction}
                  currentUserId={currentUserId}
                />
              )}

              {playerView.phase === SpyfallPhase.ACCUSATION_VOTE && (
                <VotingPhase
                  playerView={playerView}
                  onAction={onAction}
                  currentUserId={currentUserId}
                />
              )}

              {playerView.phase === SpyfallPhase.SPY_GUESS && (
                <SpyGuessPhase playerView={playerView} onAction={onAction} />
              )}
            </>
          )}

          {playerView.phase === SpyfallPhase.GAME_OVER && (
            <GameOverScreen
              playerView={playerView}
              onPlayAgain={playerView.isHost ? onPlayAgain : undefined}
              onReturnLobby={onReturnLobby}
            />
          )}
        </div>

        {/* Reference Locations Sidebar */}
        {!isGameOver && (
          <div className="lg:w-80 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 block mb-2">
              Locations Reference
            </span>
            <LocationGrid locations={playerView.allLocations} />
          </div>
        )}
      </div>
    </div>
  );
}
