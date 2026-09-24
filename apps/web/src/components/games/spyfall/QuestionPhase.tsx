import { useState } from 'react';
import type { SpyfallPlayerView } from '@party/spyfall';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { GameTimer } from './GameTimer';

interface QuestionPhaseProps {
  playerView: SpyfallPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  currentUserId: string;
}

export function QuestionPhase({ playerView, onAction, currentUserId }: QuestionPhaseProps) {
  const [confirmAccuseId, setConfirmAccuseId] = useState<string | null>(null);
  const [showRole, setShowRole] = useState(false);

  const selectedTarget = playerView.players.find((p) => p.id === confirmAccuseId);

  const handleAccuse = (targetPlayerId: string) => {
    onAction('accuse', { targetPlayerId });
    setConfirmAccuseId(null);
  };

  return (
    <div className="w-full space-y-6 max-w-2xl mx-auto">
      {/* Top Status & Timer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">
            Discussion Phase
          </span>
          <h3 className="text-sm font-black uppercase text-black dark:text-white">
            Real Talk Active
          </h3>
          <p className="text-zinc-500 text-xs">
            Ask and answer questions out loud. Anyone can ask anyone.
          </p>
        </div>

        {playerView.roundExpiresAt > 0 && (
          <div className="shrink-0">
            <GameTimer expiresAt={playerView.roundExpiresAt} inline />
          </div>
        )}
      </div>

      {/* Secret Role Card */}
      {!showRole ? (
        <Card className="min-h-[300px] p-8 border border-zinc-300 dark:border-zinc-800 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 mb-1">
            Confidential Role
          </span>
          <h3 className="text-xl sm:text-2xl font-black uppercase text-black dark:text-white mb-2">
            Identity Hidden
          </h3>
          <p className="text-zinc-500 text-xs max-w-sm mb-6 leading-relaxed">
            Kept hidden to prevent screen peeking from nearby players.
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowRole(true)}
            >
              Show Role
            </Button>

            {playerView.isSpy && (
              <Button
                size="sm"
                variant="danger"
                className="text-xs"
                onClick={() => onAction('spy_reveal', {})}
              >
                Reveal As Spy
              </Button>
            )}
          </div>
        </Card>
      ) : playerView.isSpy ? (
        <Card className="min-h-[300px] p-8 border-2 border-red-600 dark:border-red-500 flex flex-col justify-between items-center text-center relative bg-white dark:bg-zinc-950">
          <div className="w-full flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] uppercase font-mono"
              onClick={() => setShowRole(false)}
            >
              Hide
            </Button>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-red-600 dark:text-red-400 block mb-1">
              Secret Role
            </span>
            <h2 className="text-3xl font-black uppercase text-red-600 dark:text-red-500 mb-2">
              You Are The Spy
            </h2>
            <p className="text-zinc-500 text-xs max-w-md mx-auto mb-6">
              Location is unknown to you. Listen carefully and deduce the location from what players say.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
            <Button
              size="sm"
              variant="danger"
              className="flex-1 text-xs"
              onClick={() => onAction('spy_reveal', {})}
            >
              Reveal & Guess Location
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={() => setShowRole(false)}
            >
              Close
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="min-h-[300px] p-8 border-2 border-black dark:border-white flex flex-col justify-between items-center text-center relative bg-white dark:bg-zinc-950">
          <div className="w-full flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] uppercase font-mono"
              onClick={() => setShowRole(false)}
            >
              Hide
            </Button>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block mb-1">
              Secret Location
            </span>
            <h2 className="text-3xl font-black uppercase text-black dark:text-white mb-4">
              {playerView.location}
            </h2>

            <div className="inline-block border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-6 py-2 rounded-xs mb-4">
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block">Assigned Role</span>
              <span className="text-base font-bold uppercase text-black dark:text-white">{playerView.myRole}</span>
            </div>

            <p className="text-zinc-500 text-xs max-w-sm mx-auto">
              Give subtle answers so innocents trust you without giving away the location to the Spy.
            </p>
          </div>

          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={() => setShowRole(false)}
          >
            Hide Card
          </Button>
        </Card>
      )}

      {/* Accusation Confirmation Modal */}
      {confirmAccuseId && selectedTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xs p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-black uppercase text-black dark:text-white">
              Indict {selectedTarget.displayName}?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs">
              This will pause questioning and trigger a sequential vote for all other players.
              You only have 1 indictment per round.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAccuseId(null)}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleAccuse(selectedTarget.id)}
                className="flex-1 text-xs font-bold"
              >
                Put to Vote
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Players Roster */}
      <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
              Players In Round
            </h4>
            <p className="text-[10px] font-mono text-zinc-500">
              {playerView.hasUsedIndictment
                ? 'Indictment already used this round'
                : '1 accusation attempt allowed per player'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {playerView.players.map((p) => {
            const isMe = p.id === currentUserId;
            const canAccuse = !isMe && !p.isHost && p.isConnected && !playerView.hasUsedIndictment;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 border rounded-xs transition-colors ${
                  isMe
                    ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                  />
                  <span className="text-xs font-bold text-black dark:text-white">
                    {p.displayName} {isMe && '(You)'}
                  </span>
                  {p.isHost && (
                    <span className="text-[9px] font-mono uppercase px-1 border border-zinc-300 dark:border-zinc-700">
                      Host
                    </span>
                  )}
                </div>

                {canAccuse && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] py-1 px-2.5 h-7"
                    onClick={() => setConfirmAccuseId(p.id)}
                  >
                    Accuse
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
