import type { SalemPlayerView } from '@party/salem';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Trophy, Users, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
  isHost: boolean;
}

export function SalemGameOverScreen({ playerView, onReturnLobby, onPlayAgain, isHost }: Props) {
  const { gameOverData } = playerView;
  const isTownWin = gameOverData?.winner === 'TOWN';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 text-center">
        <span className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-500">
          The Witch Trials Have Concluded
        </span>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-black dark:text-white mt-2 flex items-center justify-center gap-3">
          <Trophy size={40} className={isTownWin ? 'text-emerald-500' : 'text-red-500'} />
          {isTownWin ? 'Town of Salem Prevails!' : 'The Witches Triumphant!'}
        </h1>
        <p className="text-sm font-mono text-zinc-500 mt-2 max-w-xl mx-auto">
          {gameOverData?.reason}
        </p>
      </div>

      {/* Role Revelations */}
      <Card className="p-8 border border-zinc-300 dark:border-zinc-800">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <Users size={16} />
          True Identities Revealed
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(gameOverData?.roles || {}).map(([pid, r]) => (
            <div
              key={pid}
              className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xs flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-black dark:text-white block">{r.roleName}</span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">{r.alignment}</span>
              </div>
              <span className={`text-[10px] font-mono uppercase font-bold ${r.isAlive ? 'text-emerald-500' : 'text-red-500'}`}>
                {r.isAlive ? 'Survived' : 'Eliminated'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button variant="secondary" onClick={onReturnLobby} className="text-xs font-bold">
          <ArrowLeft size={14} className="mr-2" /> Return to Lobby
        </Button>
        {isHost && (
          <Button onClick={onPlayAgain} className="text-xs font-bold">
            <RefreshCw size={14} className="mr-2" /> Convene Another Trial
          </Button>
        )}
      </div>
    </div>
  );
}
