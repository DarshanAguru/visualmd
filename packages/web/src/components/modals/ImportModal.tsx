import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, FileText, X } from 'lucide-react';
import { Folder } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onImportComplete: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onImportComplete,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [filesToImport, setFilesToImport] = useState<Array<{ name: string; content: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(currentFolderId || null);
      setImportError(null);
    }
  }, [isOpen, currentFolderId]);

  if (!isOpen) return null;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setImportError(null);
    const promises = Array.from(fileList).map((file) => {
      return new Promise<{ name: string; content: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            content: (e.target?.result as string) || '',
          });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(promises).then((results) => {
      setFilesToImport((prev) => [...prev, ...results]);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (filesToImport.length === 0) return;
    setUploading(true);
    setImportError(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToImport.map((f) => ({ name: f.name, content: f.content })),
          folder_id: selectedFolderId && selectedFolderId !== '' ? selectedFolderId : null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status} failed to import`);
      }

      onImportComplete();
      onClose();
      setFilesToImport([]);
    } catch (err) {
      console.error('Import failed:', err);
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Import Documents</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Target Virtual Folder
            </label>
            <select
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            >
              <option value="">(Root / No Folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          {importError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-center gap-2">
              <span>⚠️ {importError}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-[var(--accent-surface)]'
                : 'border-[var(--border-color)] hover:border-[var(--text-muted)] bg-[var(--bg-secondary)]'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept=".md,.vmd,.txt"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <UploadCloud className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Click to browse or drag & drop files here
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Files are safely copied to your central data/ folder
            </p>
          </div>

          {/* File Queue */}
          {filesToImport.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Files Ready ({filesToImport.length}):
              </span>
              {filesToImport.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilesToImport((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-[var(--text-muted)] hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || filesToImport.length === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-40 rounded-lg shadow-xs transition-opacity"
            >
              {uploading ? 'Importing...' : `Import ${filesToImport.length} File(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
