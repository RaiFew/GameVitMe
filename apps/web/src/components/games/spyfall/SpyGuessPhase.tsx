import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useState } from 'react';

export function SpyGuessPhase({ playerView, onAction }: any) {
  const [selected, setSelected] = useState('');

  if (!playerView.isSpy) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto border border-rule">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block mb-1">
          Spy Revealed
        </span>
        <h2 className="text-xl font-black uppercase text-red-600 dark:text-red-400 mb-2">Spy is Guessing</h2>
        <p className="text-xs text-ink-muted">The Spy has stepped forward and is choosing a location from the reference grid.</p>
      </Card>
    );
  }

  return (
    <Card className="p-8 max-w-3xl w-full mx-auto border-2 border-rule-strong">
      <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block mb-1 text-center">
        Final Chance
      </span>
      <h2 className="text-2xl font-black uppercase text-ink mb-6 text-center">
        Guess The Location
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {(playerView.allLocations || []).map((loc: string) => (
          <button
            key={loc}
            onClick={() => setSelected(loc)}
            className={`p-3 rounded-xs text-xs font-mono font-bold transition-colors border text-left cursor-pointer ${
              selected === loc
                ? 'bg-ink text-canvas border-rule-strong'
                : 'bg-canvas text-ink border-rule hover:border-rule-strong'
            }`}
          >
            {loc}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!selected}
          onClick={() => onAction('spy_guess_location', { locationName: selected })}
          className="text-xs min-w-[200px]"
        >
          Confirm Guess: {selected || 'Select'}
        </Button>
      </div>
    </Card>
  );
}
