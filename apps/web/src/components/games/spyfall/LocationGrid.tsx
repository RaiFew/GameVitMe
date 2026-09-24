import { useState } from 'react';
import { cn } from '../../../lib/utils';

export function LocationGrid({ locations }: { locations: string[] }) {
  const [crossedOut, setCrossedOut] = useState<Record<string, boolean>>({});

  const toggle = (loc: string) => {
    setCrossedOut(prev => ({ ...prev, [loc]: !prev[loc] }));
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {locations.map(loc => (
        <button
          key={loc}
          onClick={() => toggle(loc)}
          className={cn(
            "p-2.5 rounded-xs text-xs font-mono font-semibold transition-colors text-left border cursor-pointer",
            crossedOut[loc]
              ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 line-through border-zinc-200 dark:border-zinc-800"
              : "bg-white dark:bg-zinc-950 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
