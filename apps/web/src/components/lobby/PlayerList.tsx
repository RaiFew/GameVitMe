import { Avatar } from '../ui/Avatar';
import { Crown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerListProps {
  players: any[];
  hostId: string;
  currentUserId: string;
  isHost: boolean;
  isHostMode?: boolean;
  onKick: (id: string) => void;
}

export function PlayerList({ players, hostId, currentUserId, isHost, isHostMode = true, onKick }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {players.map(player => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-3 bg-canvas border border-rule rounded-xs hover:border-ink/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar src={player.avatarUrl} fallback={player.displayName} size="sm" />
              <div className="flex items-center gap-2">
                <span className="text-ink font-bold text-xs uppercase tracking-tight">
                  {player.displayName}
                </span>
                {player.id === currentUserId && (
                  <span className="text-[9px] font-mono uppercase text-ink-faint font-semibold">(You)</span>
                )}
                {player.id === hostId && (
                  <span className="text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 border border-ink/40 bg-canvas-sunk text-ink">
                    Host
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isHostMode && player.id === hostId ? (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-rule-strong bg-ink text-canvas">
                  Screen Mode
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    player.isReady
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-rule text-ink-faint'
                  }`}
                >
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </span>
              )}

              {isHost && player.id !== currentUserId && (
                <button
                  onClick={() => onKick(player.id)}
                  className="p-1 text-ink-faint hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Kick player"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
