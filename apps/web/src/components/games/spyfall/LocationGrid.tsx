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
              ? "bg-canvas-sunk text-ink-muted line-through border-rule"
              : "bg-canvas text-ink hover:bg-canvas-sunk border-rule"
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
