import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { parseWordFileContent } from '@party/codenames';
import { BookOpen, FileText, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CustomFileItem {
  id: string;
  name: string;
  originalFileName: string;
  format: 'TXT' | 'CSV' | 'JSON';
  wordCount: number;
  createdAt: string;
}

export function CodenamesLibraryCard() {
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
    } catch (err) {
      console.warn('Failed to load word files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this custom word file?')) return;

    try {
      await api.delete(`/api/codenames/word-files/${fileId}`);
      await loadFiles();
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
      await api.post('/api/codenames/word-files', {
        name: customName || uploadFileName,
        fileName: uploadFileName,
        content: fileContent,
      });

      await loadFiles();
      setIsUploadModalOpen(false);
      resetUploadModal();
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
    <div className="w-full text-left p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-xs mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 block">
            Codenames Word Library
          </span>
          <h3 className="text-sm font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2 mt-0.5">
            <BookOpen size={16} />
            My Custom Word Files
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-zinc-500 border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded-xs">
            {files.length} / 3 Files Used
          </span>

          <Button
            size="sm"
            disabled={isLimitReached}
            onClick={() => {
              resetUploadModal();
              setIsUploadModalOpen(true);
            }}
            className="text-xs font-mono font-bold"
          >
            <Upload size={13} className="mr-1.5" /> Upload File
          </Button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 font-mono mb-4">
        Save up to 3 custom word lists (.txt, .csv, .json) to use when hosting Codenames games. Minimum 25 words per list.
      </p>

      {files.length === 0 ? (
        <div className="p-6 border border-dashed border-zinc-300 dark:border-zinc-700 text-center rounded-xs space-y-2">
          <FileText size={28} className="mx-auto text-zinc-400" />
          <p className="text-xs font-mono text-zinc-500">
            You don't have any custom word files saved yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xs flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-xs text-zinc-600 dark:text-zinc-400">
                    {file.format}
                  </span>
                  <span className="text-sm font-bold text-black dark:text-white font-mono">
                    {file.name}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center gap-3">
                  <span>{file.wordCount} words</span>
                  <span>•</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteFile(file.id)}
                className="text-zinc-400 hover:text-red-600 transition-colors p-2"
                title="Delete File"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
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
                placeholder="e.g. Movie Titles"
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
    </div>
  );
}
