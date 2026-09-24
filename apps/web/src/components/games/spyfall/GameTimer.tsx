import { useEffect, useState } from 'react';

export function GameTimer({ expiresAt, inline = false }: { expiresAt: number; inline?: boolean }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isWarning = timeLeft < 60000;
  const isDanger = timeLeft < 30000;

  const styleClass = isDanger
    ? 'border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
    : isWarning
    ? 'border-amber-600 dark:border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20'
    : 'border-black dark:border-white text-black dark:text-white bg-white dark:bg-zinc-950';

  if (inline) {
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-xs font-mono text-xl md:text-2xl font-black border ${styleClass}`}>
        <span>{timeLeft === 0 ? "Time's Up!" : formatted}</span>
      </div>
    );
  }

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xs font-mono text-xl font-black z-40 border ${styleClass}`}>
      {timeLeft === 0 ? "Time's Up!" : formatted}
    </div>
  );
}
