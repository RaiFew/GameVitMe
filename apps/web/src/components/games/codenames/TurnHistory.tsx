import { useState } from 'react';
import type { CodenamesPlayerView, CodenamesTurnLogView } from '@party/codenames';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

const REASON: Record<CodenamesTurnLogView['endedReason'], string> = {
  MAX_GUESSES: 'ran out of guesses',
  WRONG_GUESS: 'ended on a wrong card',
  PASS: 'passed',
  ASSASSIN: 'hit the assassin',
  WIN: 'found the last agent',
  CLUE_TIMEOUT: 'no clue in time',
  IN_PROGRESS: 'in progress',
};

const RESULT_STYLE: Record<string, string> = {
  CORRECT: 'text-red-600 dark:text-red-400',
  OPPONENT: 'text-blue-600 dark:text-blue-400',
  NEUTRAL: 'text-ink-faint line-through',
  ASSASSIN: 'text-red-700 dark:text-red-300 font-black',
};

function TurnRow({ turn }: { turn: CodenamesTurnLogView }) {
  const isRed = turn.team === 'RED';
  return (
    <li className="py-2.5 border-b border-rule last:border-b-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-xs border ${
            isRed
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-blue-600 text-blue-600 dark:text-blue-400'
          }`}
        >
          {turn.team} · T{turn.turnNumber}
        </span>

        {turn.clue ? (
          <span className="font-mono font-black text-sm uppercase text-ink">
            {turn.clue.word} <span className="text-ink-muted">{turn.clue.number}</span>
          </span>
        ) : (
          <span className="font-mono text-sm uppercase text-ink-faint">No clue</span>
        )}

        <span className="text-[10px] font-mono text-ink-faint ml-auto">{REASON[turn.endedReason]}</span>
      </div>

      {turn.guesses.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {turn.guesses.map((g, i) => (
            <li key={`${g.cardId}-${i}`} className="text-[11px] font-mono uppercase">
              <span className={RESULT_STYLE[g.resultedIn] ?? 'text-ink'}>{g.word}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function TurnHistory({ playerView }: { playerView: CodenamesPlayerView }) {
  const [open, setOpen] = useState(false);
  const turns = playerView.history ?? [];

  if (turns.length === 0) {
    return null;
  }

  return (
    <div className="border border-rule rounded-xs bg-canvas">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left cursor-pointer hover:bg-canvas-sunk"
      >
        <span className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-ink">
          <History size={14} className="text-ink-muted" />
          Turn History
          <span className="text-ink-faint">({turns.length})</span>
        </span>
        <span className="flex items-center gap-2 text-[10px] font-mono uppercase text-ink-muted">
          {open ? 'Hide' : 'Show'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <ul className="px-4 pb-2">
          {[...turns].reverse().map((turn) => (
            <TurnRow key={`${turn.turnNumber}-${turn.team}`} turn={turn} />
          ))}
        </ul>
      )}
    </div>
  );
}