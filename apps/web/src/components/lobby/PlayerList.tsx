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
            className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar src={player.avatarUrl} fallback={player.displayName} size="sm" />
              <div className="flex items-center gap-2">
                <span className="text-black dark:text-white font-bold text-xs uppercase tracking-tight">
                  {player.displayName}
                </span>
                {player.id === currentUserId && (
                  <span className="text-[9px] font-mono uppercase text-zinc-400 font-semibold">(You)</span>
                )}
                {player.id === hostId && (
                  <span className="text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 border border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                    Host
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isHostMode && player.id === hostId ? (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
                  Screen Mode
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    player.isReady
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-400'
                  }`}
                >
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </span>
              )}

              {isHost && player.id !== currentUserId && (
                <button
                  onClick={() => onKick(player.id)}
                  className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
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
