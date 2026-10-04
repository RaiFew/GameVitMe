import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { api } from '../../lib/api';
import { Search, Music4, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  isHost: boolean;
  settings: Record<string, any>;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

const QUESTION_TYPES = [
  { id: 'TITLE', label: 'Title', note: 'which song is this' },
  { id: 'ARTIST', label: 'Artist', note: 'who sings this' },
  { id: 'BOTH', label: 'Both', note: 'title and artist' },
] as const;

interface PoolPreview {
  count: number;
  questionType: string;
  supportsRequestedType: boolean;
  sample: { title: string; artist: string }[];
}

export function MusicQuizSettingsCard({ isHost, settings, onUpdateSettings }: Props) {
  const gs = (settings?.gameSettings || {}) as Record<string, any>;
  const query: string = gs.query ?? '';
  const questionType: string = gs.questionType || 'TITLE';
  const rounds: number = Number(gs.rounds ?? 10);

  const [draft, setDraft] = useState(query);
  const [preview, setPreview] = useState<PoolPreview | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  // Debounced: each lookup costs a provider round trip, and typing a five-letter
  // artist name one keystroke at a time should not be five searches.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    if (!isHost) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLooking(true);
      setError('');
      api
        .post<PoolPreview>('/api/music-quiz/pool-preview', { query: draft, questionType })
        .then((res) => {
          setPreview(res);
          if (res.count < 8) setError(`Only ${res.count} playable tracks came back. Try another artist or leave it blank for the chart.`);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLooking(false));
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, questionType, isHost]);

  const update = (patch: Record<string, any>) => {
    if (!isHost) return;
    onUpdateSettings({ gameSettings: { ...gs, ...patch } });
  };

  const commitQuery = () => update({ query: draft.trim() });

  return (
    <Card className="p-5 border border-rule space-y-4">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
          Game Rules
        </span>
        <h3 className="text-sm font-black uppercase tracking-tight text-ink mt-0.5">
          Music Quiz Settings
        </h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
          Artist or genre
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
            />
            <input
              type="text"
              value={draft}
              disabled={!isHost}
              maxLength={80}
              placeholder="Leave blank for this week's chart"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitQuery();
              }}
              className="w-full border border-rule rounded-xs bg-canvas-sunk pl-8 pr-2 py-2 text-xs font-mono text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none disabled:opacity-60"
            />
          </div>
          {isHost && (
            <button
              type="button"
              onClick={commitQuery}
              className="shrink-0 border border-rule-strong bg-ink text-canvas text-[10px] font-mono font-bold uppercase px-3 rounded-xs hover:opacity-90"
            >
              Search
            </button>
          )}
        </div>

        {isHost && (
          <div className="border border-rule rounded-xs bg-canvas-sunk p-2 min-h-[3.5rem]">
            {looking ? (
              <p className="text-[10px] font-mono text-ink-faint flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Searching the catalog...
              </p>
            ) : preview && preview.count > 0 ? (
              <>
                <p className="text-[10px] font-mono text-ink-muted mb-1.5">
                  <span className="font-bold text-ink">{preview.count}</span> playable tracks. First
                  few:
                </p>
                <ul className="space-y-0.5">
                  {preview.sample.slice(0, 4).map((t, i) => (
                    <li key={i} className="text-[10px] font-mono text-ink-faint truncate">
                      {t.title} <span className="opacity-70">— {t.artist}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[10px] font-mono text-ink-faint">No search yet.</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-[10px] font-mono text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
        {preview && !preview.supportsRequestedType && preview.count >= 8 && (
          <p className="text-[10px] font-mono text-ink-faint">
            This search does not have enough different artists for that question, so the game will ask
            for titles instead. The question actually being asked is shown when the round opens.
          </p>
        )}
        <p className="text-[10px] font-mono text-ink-faint">
          Clips are the providers' own 30-second previews, played straight from their CDN. Nothing is
          downloaded or cut — the excerpt simply stops on the clock.
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-rule">
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
          Ask for
        </label>
        <div className="flex flex-wrap gap-1.5">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!isHost}
              onClick={() => update({ questionType: t.id })}
              className={`flex-1 min-w-[4.5rem] py-1.5 px-2 rounded-xs border transition-all ${
                questionType === t.id
                  ? 'border-rule-strong bg-ink text-canvas'
                  : 'border-rule hover:border-ink/40 bg-canvas-sunk text-ink'
              } ${isHost ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
            >
              <span className="block text-xs font-mono font-bold">{t.label}</span>
              <span className="block text-[9px] font-mono opacity-70">{t.note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-rule">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold">
            Rounds
          </label>
          <span className="text-xs font-mono font-bold text-ink">{rounds}</span>
        </div>
        <input
          type="range"
          min={3}
          max={30}
          step={1}
          value={rounds}
          disabled={!isHost}
          onChange={(e) => update({ rounds: Number(e.target.value) })}
          className="w-full accent-ink disabled:opacity-60"
        />
        <p className="text-[10px] font-mono text-ink-faint flex items-center gap-1">
          <Music4 size={11} /> The pool is locked in when the round starts, so the same songs play for
          everyone.
        </p>
      </div>
    </Card>
  );
}
