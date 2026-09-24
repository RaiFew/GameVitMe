import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { parseWordFileContent } from '@party/codenames';
import { BookOpen, FileText, Upload, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet, FileCode } from 'lucide-react';

interface Props {
  roomId: string;
  isHost: boolean;
  settings: {
    codenamesWordSource?: 'DEFAULT' | 'CUSTOM';
    codenamesWordFileId?: string;
  };
  onUpdateSettings: (newSettings: Record<string, unknown>) => void;
}

interface CustomFileItem {
  id: string;
  name: string;
  originalFileName: string;
  format: 'TXT' | 'CSV' | 'JSON';
  wordCount: number;
  createdAt: string;
}

export function CodenamesWordSourceCard({ roomId, isHost, settings, onUpdateSettings }: Props) {
  const currentSource = settings.codenamesWordSource || 'DEFAULT';
  const currentFileId = settings.codenamesWordFileId;

  const [files, setFiles] = useState<CustomFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload modal state
  const [uploadFileName, setUploadFileName] = useState('');
  const [customName, setCustomName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [preview, setPreview] = useState<{
    success: boolean;
    format?: 'TXT' | 'CSV' | 'JSON';
    wordCount?: number;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/codenames/word-files');
      const list = res.files || res.data?.files || [];
      setFiles(list);

      // If custom source selected but no file chosen or invalid, auto-pick first if available
      if (currentSource === 'CUSTOM' && !currentFileId && list.length > 0 && isHost) {
        onUpdateSettings({ codenamesWordFileId: list[0].id });
      }
    } catch (err) {
      console.warn('Failed to load word files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleSourceChange = (source: 'DEFAULT' | 'CUSTOM') => {
    if (!isHost) return;
    const updates: Record<string, unknown> = { codenamesWordSource: source };
    if (source === 'CUSTOM' && !currentFileId && files.length > 0 && files[0]) {
      updates.codenamesWordFileId = files[0].id;
    }
    onUpdateSettings(updates);
  };

  const handleSelectFile = (fileId: string) => {
    if (!isHost) return;
    onUpdateSettings({
      codenamesWordSource: 'CUSTOM',
      codenamesWordFileId: fileId,
    });
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this custom word file?')) return;

    try {
      await api.delete(`/api/codenames/word-files/${fileId}`);
      await loadFiles();
      if (currentFileId === fileId) {
        onUpdateSettings({ codenamesWordSource: 'DEFAULT', codenamesWordFileId: undefined });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete file.');
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
      const res = parseWordFileContent(file.name, text);
      setPreview(res);
    };
    reader.readAsText(file);
  };

  const handleSaveUpload = async () => {
    if (!preview || !preview.success || !fileContent) return;
    setIsSaving(true);
    setSaveError('');

    try {
      const res = await api.post('/api/codenames/word-files', {
        name: customName || uploadFileName,
        fileName: uploadFileName,
        content: fileContent,
      });

      const newFile = res.file || res.data?.file;
      await loadFiles();
      setIsUploadModalOpen(false);
      resetUploadModal();

      if (newFile?.id && isHost) {
        onUpdateSettings({
          codenamesWordSource: 'CUSTOM',
          codenamesWordFileId: newFile.id,
        });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save word file.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetUploadModal = () => {
    setUploadFileName('');
    setCustomName('');
    setFileContent('');
    setPreview(null);
    setSaveError('');
  };

  const isLimitReached = files.length >= 3;

  return (
    <Card className="p-6 border border-zinc-300 dark:border-zinc-800 space-y-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Codenames Word Configuration
          </span>
          <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2 mt-0.5">
            <BookOpen size={20} />
            Word Source Library
          </h3>
        </div>

        <span className="text-xs font-mono font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-xs">
          {files.length} / 3 Custom Files Used
        </span>
      </div>

      {/* Radio Source Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Built-in Dictionary Option */}
        <button
          type="button"
          disabled={!isHost}
          onClick={() => handleSourceChange('DEFAULT')}
          className={`p-4 border rounded-xs text-left transition-all flex items-start justify-between ${
            currentSource === 'DEFAULT'
              ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase text-black dark:text-white tracking-wider">
                Default Words
              </span>
              <span className="text-[9px] font-mono uppercase bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-xs font-bold">
                Built-In
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              Classic Codenames dictionary (~400 balanced words).
            </p>
          </div>

          <div
            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
              currentSource === 'DEFAULT'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-zinc-400'
            }`}
          >
            {currentSource === 'DEFAULT' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
          </div>
        </button>

        {/* Custom Word Files Option */}
        <button
          type="button"
          disabled={!isHost}
          onClick={() => handleSourceChange('CUSTOM')}
          className={`p-4 border rounded-xs text-left transition-all flex items-start justify-between ${
            currentSource === 'CUSTOM'
              ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase text-black dark:text-white tracking-wider">
                My Word Files
              </span>
              <span className="text-[9px] font-mono uppercase bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-xs font-bold">
                Account Library
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              Play with your own saved custom word lists (.txt, .csv, .json).
            </p>
          </div>

          <div
            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
              currentSource === 'CUSTOM'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-zinc-400'
            }`}
          >
            {currentSource === 'CUSTOM' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
          </div>
        </button>
      </div>

      {/* Custom Files Selection & Management Deck */}
      {currentSource === 'CUSTOM' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span className="text-xs font-mono uppercase font-bold text-zinc-500">
              Select Saved Word File
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
                <Upload size={14} className="mr-1.5" /> + Upload Word File
              </Button>
            )}
          </div>

          {isLimitReached && (
            <div className="p-3 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded-xs text-xs font-mono text-zinc-500">
              You can save up to 3 custom word files. Delete an existing file to upload a new one.
            </div>
          )}

          {files.length === 0 ? (
            <div className="p-8 border border-dashed border-zinc-300 dark:border-zinc-700 text-center rounded-xs space-y-3">
              <FileText size={32} className="mx-auto text-zinc-400" />
              <p className="text-xs font-mono text-zinc-500">
                You have not uploaded any custom word files yet.
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
                  <Upload size={14} className="mr-1.5" /> Upload Your First Word File
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {files.map((file) => {
                const isSelected = currentFileId === file.id;

                return (
                  <div
                    key={file.id}
                    onClick={() => isHost && handleSelectFile(file.id)}
                    className={`p-4 border rounded-xs transition-all flex flex-col justify-between ${
                      isHost ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 ring-2 ring-black dark:ring-white shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                          {file.format}
                        </span>
                        {isHost && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                            title="Delete File"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <h4 className="text-sm font-black uppercase text-black dark:text-white truncate">
                        {file.name}
                      </h4>
                      <span className="text-xs font-mono font-bold text-zinc-500 block mt-0.5">
                        {file.wordCount} words
                      </span>
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold uppercase ${
                        isSelected ? 'text-black dark:text-white' : 'text-zinc-400'
                      }`}>
                        {isSelected ? '✓ Active in Room' : 'Click to Use'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Word File Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Custom Word File"
      >
        <div className="space-y-4">
          <p className="text-xs font-mono text-zinc-500">
            Upload a text file containing words for Codenames. Supports <strong>.txt</strong> (one word per line), <strong>.csv</strong>, or <strong>.json</strong>.
          </p>

          <div>
            <label className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-1">
              Select File (.txt, .csv, .json)
            </label>
            <input
              type="file"
              accept=".txt,.csv,.json"
              onChange={handleFileSelect}
              className="w-full text-xs font-mono file:mr-4 file:py-2 file:px-4 file:rounded-xs file:border file:border-black dark:file:border-white file:text-xs file:font-mono file:bg-white dark:file:bg-zinc-900 file:text-black dark:file:text-white hover:file:bg-zinc-100 cursor-pointer"
            />
          </div>

          {uploadFileName && (
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-1">
                Display Name in Library
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Fantasy Words"
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Validation UX Preview */}
          {preview && (
            <div className={`p-4 border rounded-xs space-y-2 font-mono text-xs ${
              preview.success
                ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {preview.success ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
                  {preview.success ? 'Valid Word File' : 'Validation Failed'}
                </span>
                <span className="uppercase text-[10px] font-bold">{preview.format}</span>
              </div>

              <div className="text-xs">
                <span>Total Words: <strong>{preview.wordCount}</strong></span>
                <span className="opacity-70 ml-2">(Minimum required: 25)</span>
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

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="secondary" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!preview || !preview.success || isSaving}
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
