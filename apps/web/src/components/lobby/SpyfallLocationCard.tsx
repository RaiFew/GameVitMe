import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import {
  parseLocationFileContent,
  MIN_SPYFALL_LOCATIONS,
} from '@party/spyfall';
import {
  MapPin,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  isHost: boolean;
  settings: {
    spyfallLocationSource?: 'DEFAULT' | 'CUSTOM';
    spyfallLocationFileIds?: string[];
  };
  onUpdateSettings: (newSettings: Record<string, unknown>) => void;
}

interface LocationSetItem {
  id: string;
  name: string;
  originalFileName: string;
  format: 'CSV' | 'TXT';
  locationCount: number;
  createdAt: string;
}

const MAX_SETS = 3;

const FORMAT_HELP = `Location,Role;Role;Role
Submarine,Captain;Navigator;Engineer
Orbital Station,Engineer;Medic;Pilot;Botanist`;

export function SpyfallLocationCard({ isHost, settings, onUpdateSettings }: Props) {
  const currentSource = settings.spyfallLocationSource || 'DEFAULT';
  const currentIds = settings.spyfallLocationFileIds ?? [];

  const [sets, setSets] = useState<LocationSetItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [customName, setCustomName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [preview, setPreview] = useState<{ success: boolean; locationCount?: number; error?: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadSets = async () => {
    try {
      const res = await api.get<any>('/api/spyfall/location-sets');
      setSets(res?.sets ?? []);
    } catch (err) {
      console.warn('Failed to load location sets:', err);
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

  const resetUploadModal = () => {
    setUploadFileName('');
    setCustomName('');
    setFileContent('');
    setPreview(null);
    setSaveError('');
  };

  // Several sets can be on at once -- the server merges them into one pool --
  // so this is a checklist, not the radio pair Codenames uses.
  const toggleSet = (id: string) => {
    if (!isHost) return;
    const next = currentIds.includes(id)
      ? currentIds.filter((x) => x !== id)
      : [...currentIds, id];
    onUpdateSettings({ spyfallLocationSource: 'CUSTOM', spyfallLocationFileIds: next });
  };

  const handleSourceChange = (source: 'DEFAULT' | 'CUSTOM') => {
    if (!isHost) return;
    if (source === 'CUSTOM' && currentIds.length === 0 && sets.length > 0) {
      onUpdateSettings({
        spyfallLocationSource: 'CUSTOM',
        spyfallLocationFileIds: [sets[0]!.id],
      });
      return;
    }
    onUpdateSettings({ spyfallLocationSource: source });
  };

  const handleDeleteSet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this location set?')) return;
    try {
      await api.delete(`/api/spyfall/location-sets/${id}`);
      await loadSets();
      if (currentIds.includes(id)) {
        onUpdateSettings({
          spyfallLocationSource: 'DEFAULT',
          spyfallLocationFileIds: currentIds.filter((x) => x !== id),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete location set.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    setCustomName(file.name.replace(/\.[^/.]+$/, ''));
    setSaveError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setFileContent(text);
      setPreview(parseLocationFileContent(file.name, text));
    };
    reader.readAsText(file);
  };

  const handleSaveUpload = async () => {
    if (!preview?.success || !fileContent) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await api.post<{ set?: any }>('/api/spyfall/location-sets', {
        name: customName || uploadFileName,
        fileName: uploadFileName,
        content: fileContent,
      });
      const newSet = res?.set;
      await loadSets();
      setIsUploadModalOpen(false);
      resetUploadModal();
      if (newSet?.id && isHost) {
        onUpdateSettings({
          spyfallLocationSource: 'CUSTOM',
          spyfallLocationFileIds: [...currentIds, newSet.id],
        });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save location set.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLimitReached = sets.length >= MAX_SETS;
  const totalLocations = sets
    .filter((s) => currentIds.includes(s.id))
    .reduce((n, s) => n + s.locationCount, 0);

  return (
    <Card className="p-6 border border-rule space-y-6">
      <div className="border-b border-rule pb-4 flex flex-col sm:flex-row justify-between items-start sm:flex-col sm:items-center gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Spyfall Location Configuration
          </span>
          <h3 className="text-xl font-black uppercase tracking-tight text-ink flex items-center gap-2 mt-0.5">
            <MapPin size={20} />
            Location Set Library
          </h3>
        </div>

        <span className="text-xs font-mono font-bold text-ink-muted border border-rule px-2.5 py-1 rounded-xs">
          {sets.length} / {MAX_SETS} Saved Sets
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          [
            {
              value: 'DEFAULT',
              title: 'Built-in Locations',
              badge: 'Built-In',
              blurb: 'The 16 classic locations, each with 12 roles.',
            },
            {
              value: 'CUSTOM',
              title: 'My Location Sets',
              badge: 'Account Library',
              blurb: 'Your own places, each carrying its own roles.',
            },
          ] as const
        ).map((opt) => {
          const selected = currentSource === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={!isHost}
              onClick={() => handleSourceChange(opt.value)}
              className={`p-4 border rounded-xs text-left transition-all flex items-start justify-between ${
                selected
                  ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink shadow-xs'
                  : 'border-rule hover:border-ink/40 bg-canvas'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase text-ink tracking-wider">
                    {opt.title}
                  </span>
                  <span className="text-[9px] font-mono uppercase bg-surface-hover px-1.5 py-0.5 rounded-xs font-bold">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs font-mono text-ink-muted mt-1">{opt.blurb}</p>
              </div>

              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  selected ? 'border-rule-strong bg-ink text-canvas' : 'border-ink/40'
                }`}
              >
                {selected && <div className="w-1.5 h-1.5 rounded-full bg-canvas" />}
              </div>
            </button>
          );
        })}
      </div>

      {currentSource === 'CUSTOM' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-rule pb-2 gap-3 flex-wrap">
            <span className="text-xs font-mono uppercase font-bold text-ink-muted">
              Enabled Sets
              {currentIds.length > 0 && (
                <span className="text-ink-faint normal-case">
                  {' '}
                  — {currentIds.length} selected, {totalLocations} locations
                </span>
              )}
            </span>

            {isHost && (
              <Button
                variant="secondary"
                size="sm"
                disabled={isLimitReached}
                onClick={() => {
                  resetUploadModal();
                  setIsUploadModalOpen(true);
                }}
                className="text-xs font-mono font-bold"
              >
                <Upload size={14} className="mr-1.5" /> + Upload Location Set
              </Button>
            )}
          </div>

          {isLimitReached && (
            <div className="p-3 border border-rule bg-canvas-sunk rounded-xs text-xs font-mono text-ink-muted">
              You can save up to {MAX_SETS} location sets. Delete one to upload a new set.
            </div>
          )}

          {sets.length === 0 ? (
            <div className="p-8 border border-dashed border-rule text-center rounded-xs space-y-3">
              <MapPin size={32} className="mx-auto text-ink-faint" />
              <p className="text-xs font-mono text-ink-muted">
                No location sets saved yet. A set needs at least {MIN_SPYFALL_LOCATIONS} locations,
                each with at least 2 roles.
              </p>
              {isHost && (
                <Button
                  size="sm"
                  onClick={() => {
                    resetUploadModal();
                    setIsUploadModalOpen(true);
                  }}
                  className="text-xs font-bold uppercase"
                >
                  <Upload size={14} className="mr-1.5" /> Upload Your First Set
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sets.map((s) => {
                const isEnabled = currentIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSet(s.id)}
                    className={`p-4 border rounded-xs transition-all flex flex-col justify-between ${
                      isHost ? 'cursor-pointer' : ''
                    } ${
                      isEnabled
                        ? 'border-rule-strong bg-canvas-sunk ring-2 ring-ink shadow-xs'
                        : 'border-rule bg-canvas hover:border-ink/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-ink-muted">
                          {s.format}
                        </span>
                        {isHost && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSet(s.id, e)}
                            className="text-ink-faint hover:text-red-600 transition-colors p-1"
                            title="Delete Set"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <h4 className="text-sm font-black uppercase text-ink truncate">{s.name}</h4>
                      <span className="text-xs font-mono font-bold text-ink-muted block mt-0.5">
                        {s.locationCount} locations
                      </span>
                    </div>

                    <div className="pt-3 mt-3 border-t border-rule flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase ${
                          isEnabled ? 'text-ink' : 'text-ink-faint'
                        }`}
                      >
                        {isEnabled ? '✓ Enabled' : 'Click to Enable'}
                      </span>
                      <span
                        className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center ${
                          isEnabled ? 'bg-ink border-rule-strong' : 'border-ink/40'
                        }`}
                      >
                        {isEnabled && <span className="w-1.5 h-1.5 rounded-xs bg-canvas" />}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] font-mono text-ink-faint">
            Enabled sets are merged into a single pool. If they hold fewer than{' '}
            {MIN_SPYFALL_LOCATIONS} locations in total, the round falls back to the built-in
            locations -- your sets never replace or overwrite them.
          </p>
        </div>
      )}

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Custom Location Set"
      >
        <div className="space-y-4">
          <p className="text-xs font-mono text-ink-muted">
            Two-column CSV, one location per row. The name ends at the first comma; the roles are
            separated by semicolons. At least {MIN_SPYFALL_LOCATIONS} locations, each with 2 or more
            roles.
          </p>

          <pre className="p-3 border border-rule bg-canvas-sunk rounded-xs text-[10px] font-mono text-ink-muted overflow-x-auto">
            {FORMAT_HELP}
          </pre>

          <div>
            <label className="text-[10px] font-mono uppercase font-bold text-ink-muted block mb-1">
              Select File (.csv, .txt)
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="w-full text-xs font-mono file:mr-4 file:py-2 file:px-4 file:rounded-xs file:border file:border-black dark:file:border-white file:text-xs file:font-mono file:bg-white dark:file:bg-zinc-900 file:text-black dark:file:text-white hover:file:bg-zinc-100 cursor-pointer"
            />
          </div>

          {uploadFileName && (
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-ink-muted block mb-1">
                Display Name in Library
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Sci-Fi Locations"
                className="font-mono text-xs"
              />
            </div>
          )}

          {preview && (
            <div
              className={`p-4 border rounded-xs space-y-2 font-mono text-xs ${
                preview.success
                  ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                  : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                {preview.success ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-red-500" />
                )}
                {preview.success ? 'Valid Location Set' : 'Validation Failed'}
              </span>

              <div className="text-xs">
                <span>
                  Total Locations: <strong>{preview.locationCount ?? 0}</strong>
                </span>
                <span className="opacity-70 ml-2">(Minimum required: {MIN_SPYFALL_LOCATIONS})</span>
              </div>

              {!preview.success && (
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                  {preview.error}
                </p>
              )}
            </div>
          )}

          {saveError && (
            <p className="text-xs font-mono text-red-600 dark:text-red-400 font-bold">{saveError}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-rule">
            <Button variant="secondary" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!preview?.success || isSaving}
              onClick={handleSaveUpload}
              className="font-bold text-xs uppercase"
            >
              {isSaving ? 'Saving...' : 'Save to Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
