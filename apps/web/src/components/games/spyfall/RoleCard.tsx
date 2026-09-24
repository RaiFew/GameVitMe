import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';

interface RoleCardProps {
  isSpy: boolean;
  roleName: string | null;
  locationName: string | null;
  locations?: string[];
  onProceed: () => void;
}

export function RoleCard({ isSpy, roleName, locationName, onProceed }: RoleCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    const flipTimer = setTimeout(() => {
      setFlipped(true);
    }, 400);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onProceed();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(flipTimer);
      clearInterval(interval);
    };
  }, [onProceed]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6">
      {/* 3D Horizontal Flip Card */}
      <div
        className="perspective-1000 w-full h-[400px] cursor-pointer"
        onClick={onProceed}
        title="Tap to proceed immediately"
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, type: 'spring', damping: 15 }}
        >
          {/* Front: Face-down cover before flip */}
          <div className="absolute inset-0 backface-hidden bg-zinc-900 border-2 border-zinc-700 rounded-xs flex flex-col items-center justify-center p-8 text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">Confidential</span>
            <h2 className="text-2xl font-black text-white tracking-wider uppercase mb-3">Secret Identity</h2>
            <p className="text-xs font-mono text-zinc-400">Revealing card...</p>
          </div>

          {/* Back: Revealed details */}
          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xs border-2 flex flex-col justify-between p-8 text-center ${
              isSpy
                ? 'bg-black text-white border-white'
                : 'bg-white text-black dark:bg-zinc-950 dark:text-white border-black dark:border-white'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold block mb-2 opacity-70">
                Round Assignment
              </span>

              {isSpy ? (
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-tight text-red-500">You Are The Spy</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
                    The location is unknown to you. Listen closely to what other players ask and answer.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block opacity-60">Secret Location</span>
                    <h3 className="text-3xl font-black uppercase tracking-tight">{locationName}</h3>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider block opacity-60">Your Role</span>
                    <p className="text-lg font-bold uppercase">{roleName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <span className="text-xs font-mono opacity-60 block">Auto-proceeding in {secondsLeft}s</span>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider mt-1 block">Tap card to start</span>
            </div>
          </div>
        </motion.div>
      </div>

      <Button onClick={onProceed} className="w-full text-xs">
        I Am Ready ({secondsLeft}s)
      </Button>
    </div>
  );
}
