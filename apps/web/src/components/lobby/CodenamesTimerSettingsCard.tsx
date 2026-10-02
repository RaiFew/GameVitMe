import { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Timer } from 'lucide-react';

interface Props {
  isHost: boolean;
  settings: {
    codenamesClueTimeSeconds?: number;
    codenamesGuessTimeSeconds?: number;
  };
  onUpdateSettings: (newSettings: Record<string, unknown>) => void;
}

const FIELDS = [
  {
    key: 'codenamesClueTimeSeconds',
    label: 'Spymaster Clue Time',
    hint: 'How long the Spymaster has to give a clue.',
    max: 300,
  },
  {
    key: 'codenamesGuessTimeSeconds',
    label: 'Operative Guessing Time',
    hint: 'How long the Operatives have to make their guesses.',
    max: 600,
  },
] as const;

export function CodenamesTimerSettingsCard({ isHost, settings, onUpdateSettings }: Props) {
  // Held locally while typing so a half-typed number never overwrites the room
  // setting; the value is committed on blur and on Enter.
  const [draft, setDraft] = useState<Record<string, string>>({});

  const commit = (key: string, raw: string, max: number) => {
    const parsed = Number(raw);
    const seconds = raw.trim() === '' || !Number.isFinite(parsed) ? 0 : Math.min(Math.max(Math.round(parsed), 0), max);
    onUpdateSettings({ [key]: seconds });
    // Drop the draft so the field falls back to the committed value, rather
    // than blanking while the hint underneath reads "(45s)".
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Timer size={16} className="text-ink-muted" />
        <h3 className="text-xs font-black uppercase tracking-widest text-ink">Turn Timers</h3>
      </div>
      <p className="text-[11px] text-ink-muted mb-4">
        Optional. A timer running out ends that turn — it never gives a clue or picks a word for
        anyone. Set a time to <span className="font-mono font-bold">0</span> to switch it off.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, hint, max }) => {
          const committed = Number(settings[key]) || 0;
          const value = draft[key] ?? (committed ? String(committed) : '');

          return (
            <div key={key}>
              <label className="text-[10px] font-mono uppercase font-bold text-ink-muted block mb-1">
                {label}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                disabled={!isHost}
                value={value}
                placeholder="Off"
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                onBlur={(e) => commit(key, e.target.value, max)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit(key, (e.target as HTMLInputElement).value, max);
                }}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-ink-faint mt-1">
                {hint}
                {committed > 0 ? ` (${committed}s)` : ' (off)'}
              </p>
            </div>
          );
        })}
      </div>

      {!isHost && (
        <p className="text-[10px] font-mono uppercase text-ink-faint mt-3">
          Only the host can change the turn timers.
        </p>
      )}
    </Card>
  );
}