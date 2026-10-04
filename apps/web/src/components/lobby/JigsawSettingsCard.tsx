import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { PIECES_BY_DIFFICULTY, type JigsawDifficulty } from '@party/jigsaw';
import { ImageUp, Trash2, AlertCircle } from 'lucide-react';

interface Props {
  isHost: boolean;
  settings: Record<string, any>;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

/** Long edge the picture is reduced to before upload. Smaller upload, smaller
 *  decode, and cells that still carry real detail when rendered at 100px. */
const MAX_EDGE = 1400;

const DIFFICULTIES: { id: JigsawDifficulty; label: string; note: string }[] = [
  { id: 'EASY', label: 'Easy', note: '12 pieces' },
  { id: 'NORMAL', label: 'Normal', note: '24 pieces' },
  { id: 'HARD', label: 'Hard', note: '48 pieces' },
  { id: 'EXPERT', label: 'Expert', note: '96 pieces' },
  { id: 'MASTER', label: 'Master', note: '192 pieces' },
];

/** Below this a phone cannot aim at a cell, so the tier is not offered. */
const TOO_FINE_FOR_A_PHONE: JigsawDifficulty[] = ['EXPERT', 'MASTER'];

export function JigsawSettingsCard({ isHost, settings, onUpdateSettings }: Props) {
  // Everything the engine reads comes from `room.settings.gameSettings`, the same
  // one object every other settings card writes to and the server snapshots at
  // `game:start`.
  const gs = (settings?.gameSettings || {}) as Record<string, any>;
  const imageId: string | null = gs.imageId ?? null;
  const difficulty: JigsawDifficulty = gs.difficulty || 'NORMAL';

  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 96 pieces on a phone is a ~32px cell, well under a touch target. Say so
  // rather than letting the host pick a difficulty nobody can play.
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

  useEffect(() => {
    if (!imageId) {
      setPreview('');
      return;
    }
    let live = true;
    api
      .get<{ image: { data: string } }>(`/api/jigsaw/images/${imageId}`)
      .then((res) => live && setPreview(res.image.data))
      .catch(() => live && setPreview(''));
    return () => {
      live = false;
    };
  }, [imageId]);

  const update = (patch: Record<string, any>) => {
    if (!isHost) return;
    onUpdateSettings({ gameSettings: { ...gs, ...patch } });
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const dataUrl = await downscale(file);
      const res = await api.post<{ image: { id: string } }>('/api/jigsaw/images', {
        dataUrl,
        name: file.name,
      });
      update({ imageId: res.image.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 border border-rule space-y-4">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
          Game Rules
        </span>
        <h3 className="text-sm font-black uppercase tracking-tight text-ink mt-0.5">
          Jigsaw Puzzle Settings
        </h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
          Puzzle Picture
        </label>

        {preview ? (
          <div className="border border-rule rounded-xs overflow-hidden">
            <img src={preview} alt="" className="w-full max-h-48 object-contain bg-canvas-sunk" />
            {isHost && (
              <div className="flex gap-2 p-2 border-t border-rule">
                <label className="flex-1">
                  <span className="sr-only">Replace picture</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) handleFile(f);
                    }}
                    className="w-full text-[10px] font-mono file:mr-3 file:py-1 file:px-2 file:rounded-xs file:border file:border-rule file:bg-canvas file:text-ink cursor-pointer"
                  />
                </label>
                <Button
                  variant="danger"
                  size="sm"
                  className="text-[10px]"
                  onClick={async () => {
                    if (imageId) await api.delete(`/api/jigsaw/images/${imageId}`).catch(() => {});
                    update({ imageId: null });
                  }}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <label className="block border border-dashed border-rule rounded-xs p-6 text-center cursor-pointer hover:border-ink/40">
            <ImageUp size={22} className="mx-auto text-ink-faint mb-2" />
            <span className="block text-xs font-mono text-ink-muted">
              {busy ? 'Uploading...' : isHost ? 'Choose a PNG, JPEG or WebP' : 'No picture chosen yet'}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!isHost || busy}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) handleFile(f);
              }}
            />
          </label>
        )}

        {error && (
          <p className="text-[10px] font-mono text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
        <p className="text-[10px] font-mono text-ink-faint">
          Reduced to {MAX_EDGE}px on the long edge in your browser before upload. The server reads the
          real dimensions from the file's own header and rejects anything it cannot decode.
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-rule">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold">
            Difficulty
          </label>
          <span className="text-xs font-mono font-bold text-ink">{PIECES_BY_DIFFICULTY[difficulty]} pieces</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => {
            const blocked = narrow && TOO_FINE_FOR_A_PHONE.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                disabled={!isHost || blocked}
                onClick={() => update({ difficulty: d.id })}
                title={
                  blocked
                    ? `${PIECES_BY_DIFFICULTY[d.id]} pieces is not playable on a phone — cells land under a fingertip`
                    : undefined
                }
                className={`flex-1 min-w-[4.5rem] py-1.5 px-2 rounded-xs border transition-all ${
                  difficulty === d.id
                    ? 'border-rule-strong bg-ink text-canvas'
                    : 'border-rule hover:border-ink/40 bg-canvas-sunk text-ink'
                } ${!isHost ? 'cursor-default opacity-80' : ''} ${blocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="block text-xs font-mono font-bold">{d.label}</span>
                <span className="block text-[9px] font-mono opacity-70">{d.note}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/**
 * Canvas does the resizing so the browser never has to decode a 12-megapixel
 * original, and the server never has to store one. Always re-encoded as JPEG:
 * a PNG photograph of this size is several times the bytes for no visible gain.
 */
async function downscale(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('The browser could not read that image.');
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not resize the image.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return canvas.toDataURL('image/jpeg', 0.82);
}