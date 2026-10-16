import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DocumentVersion } from '../../types';
import {
  History,
  X,
  RotateCcw,
  Plus,
  Eye,
  EyeOff,
  Check,
  Calendar,
  FileText,
  Sparkles,
  GitBranch,
  UploadCloud,
  FileUp,
  FileCode,
  ArrowRight,
  GitCompare,
  CheckCircle2,
  AlertCircle,
  FileDown,
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  docId?: string;
  docTitle?: string;
  currentContent?: string;
  previewVersionId?: string | null;
  onPreviewVersion?: (version: DocumentVersion | null) => void;
  onRestoreVersion: (versionId: string) => Promise<void>;
  onDocumentUpdated?: (updatedDoc: any) => void;
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
}

// Fast prefix/suffix-optimized line diff for comparing versions
function computeLineDiff(oldText: string, newText: string): { lines: DiffLine[]; addedCount: number; removedCount: number } {
  const a = (oldText || '').split(/\r?\n/);
  const b = (newText || '').split(/\r?\n/);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++;
  }

  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--;
    endB--;
  }

  const result: DiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;

  for (let i = 0; i < start; i++) {
    result.push({ type: 'same', text: a[i] });
  }

  const midA = a.slice(start, endA + 1);
  const midB = b.slice(start, endB + 1);

  if (midA.length <= 400 && midB.length <= 400) {
    const dp: number[][] = Array.from({ length: midA.length + 1 }, () => new Array(midB.length + 1).fill(0));
    for (let i = 1; i <= midA.length; i++) {
      for (let j = 1; j <= midB.length; j++) {
        if (midA[i - 1] === midB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = midA.length;
    let j = midB.length;
    const diffStack: DiffLine[] = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && midA[i - 1] === midB[j - 1]) {
        diffStack.unshift({ type: 'same', text: midA[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diffStack.unshift({ type: 'added', text: midB[j - 1] });
        addedCount++;
        j--;
      } else if (i > 0) {
        diffStack.unshift({ type: 'removed', text: midA[i - 1] });
        removedCount++;
        i--;
      }
    }
    result.push(...diffStack);
  } else {
    for (const line of midA) {
      result.push({ type: 'removed', text: line });
      removedCount++;
    }
    for (const line of midB) {
      result.push({ type: 'added', text: line });
      addedCount++;
    }
  }

  for (let i = endA + 1; i < a.length; i++) {
    result.push({ type: 'same', text: a[i] });
  }

  return { lines: result, addedCount, removedCount };
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  docId,
  docTitle,
  currentContent = '',
  previewVersionId,
  onPreviewVersion,
  onRestoreVersion,
  onDocumentUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'upload'>('timeline');
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCheckpointSummary, setNewCheckpointSummary] = useState('');
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);

  // Preview & Diff state
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Resizable drawer width with persistence (min 320px, max 750px)
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('visualmd-history-drawer-width');
    return saved ? Math.max(320, Math.min(750, parseInt(saved, 10))) : 420;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(320, Math.min(750, window.innerWidth - e.clientX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('visualmd-history-drawer-width', String(drawerWidth));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, drawerWidth]);

  // Upload New Version state
  const [uploadContent, setUploadContent] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSummary, setUploadSummary] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [setAsLatestImmediately, setSetAsLatestImmediately] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVersions = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/docs/${docId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error('Failed to load document versions:', err);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    if (isOpen && docId) {
      loadVersions();
      setDiffVersionId(null);
      setConfirmRestoreId(null);
      setUploadSuccessMessage(null);
      setUploadErrorMessage(null);
    }
  }, [isOpen, docId, loadVersions]);

  // Handle Manual Checkpoint Creation
  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;

    setIsCreatingCheckpoint(true);
    try {
      const res = await fetch(`/api/docs/${docId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: newCheckpointSummary.trim() || 'Manual Checkpoint',
        }),
      });

      if (res.ok) {
        setNewCheckpointSummary('');
        await loadVersions();
      }
    } catch (err) {
      console.error('Failed to create checkpoint:', err);
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  // Handle Restore / Set as Latest
  const handleRestore = async (versionId: string) => {
    setIsRestoring(true);
    try {
      await onRestoreVersion(versionId);
      setConfirmRestoreId(null);
      setDiffVersionId(null);
      onPreviewVersion?.(null);
      await loadVersions();
    } catch (err) {
      console.error('Failed to restore version:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  // Process File Selection
  const processSelectedFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.vmd', '.md', '.markdown', '.mdown', '.txt'].includes(ext)) {
      setUploadErrorMessage(`Please select a markdown (.vmd, .md, .markdown) file. Selected: ${file.name}`);
      return;
    }

    setUploadErrorMessage(null);
    setUploadedFileName(file.name);
    setUploadSummary(`LLM revision via ${file.name}`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setUploadContent(text);

      // Extract title if document begins with a heading # Title
      const match = text.match(/^\s*#\s+([^\r\n]+)/m);
      if (match) {
        setUploadTitle(match[1].trim());
      } else {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Submit Upload Version
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId || !uploadContent.trim()) {
      setUploadErrorMessage('Please provide markdown content or upload a file.');
      return;
    }

    setIsUploading(true);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    try {
      const res = await fetch(`/api/docs/${docId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: uploadContent,
          title: uploadTitle.trim() || undefined,
          summary: uploadSummary.trim() || 'Uploaded Revision',
          set_as_latest: setAsLatestImmediately,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUploadSuccessMessage(
          setAsLatestImmediately
            ? 'Successfully uploaded and activated as latest version!'
            : 'Successfully uploaded as revision in history for comparison!'
        );

        if (setAsLatestImmediately && data.document && onDocumentUpdated) {
          onDocumentUpdated(data.document);
        }

        // Reset form
        setUploadContent('');
        setUploadTitle('');
        setUploadSummary('');
        setUploadedFileName('');

        await loadVersions();

        // Switch back to timeline after short feedback
        setTimeout(() => {
          setActiveTab('timeline');
          setUploadSuccessMessage(null);
        }, 1200);
      } else {
        const err = await res.json();
        setUploadErrorMessage(err.error || 'Failed to upload version.');
      }
    } catch (err) {
      console.error('Failed to upload version:', err);
      setUploadErrorMessage('Network error while uploading version.');
    } finally {
      setIsUploading(false);
    }
  };

  // Active version for diff
  const activeDiffVersion = useMemo(() => {
    if (!diffVersionId) return null;
    return versions.find((v) => v.id === diffVersionId) || null;
  }, [diffVersionId, versions]);

  const diffResult = useMemo(() => {
    if (!activeDiffVersion) return null;
    return computeLineDiff(currentContent, activeDiffVersion.content || '');
  }, [activeDiffVersion, currentContent]);

  return (
    <aside
      style={{ width: isOpen ? `${drawerWidth}px` : 0 }}
      className={`relative h-full shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] flex flex-col z-20 ${
        isResizing ? 'transition-none select-none' : 'transition-[width,opacity] duration-200 ease-in-out'
      } ${
        isOpen ? 'opacity-100' : 'opacity-0 overflow-hidden border-l-0 pointer-events-none'
      }`}
    >
      {/* Resizer Handle on left border */}
      {isOpen && (
        <div
          onMouseDown={startResizing}
          onDoubleClick={() => setDrawerWidth(420)}
          title="Drag to resize history sidebar (double-click to reset)"
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-30"
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                Version History (VCS)
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[280px]">
                {docTitle || 'Document Revisions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Tabs: Timeline vs Upload New Version */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Revisions</span>
            {versions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                {versions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
            <span>Upload New Version</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/10 text-indigo-500 font-medium">
              LLM Revision
            </span>
          </button>
        </div>

        {/* ==================== TAB 1: REVISIONS TIMELINE ==================== */}
        {activeTab === 'timeline' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Quick Checkpoint Creator */}
            <div className="p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 shrink-0">
              <form onSubmit={handleCreateCheckpoint} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span>Quick Named Checkpoint</span>
                  </span>
                  <span className="text-[10px] opacity-70">Save current state before editing</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCheckpointSummary}
                    onChange={(e) => setNewCheckpointSummary(e.target.value)}
                    placeholder="e.g., Before Claude refactor..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingCheckpoint || !newCheckpointSummary.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Versions Scroll List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {loading ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  Loading revision timeline...
                </div>
              ) : versions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                  <p className="text-xs text-[var(--text-muted)]">No revision history yet.</p>
                  <p className="text-[11px] text-[var(--text-muted)] opacity-75">
                    Edits, checkpoints, and uploaded LLM files will appear here automatically.
                  </p>
                </div>
              ) : (
                versions.map((ver, idx) => {
                  const isPreviewing = previewVersionId === ver.id;
                  const isDiffing = diffVersionId === ver.id;
                  const isConfirming = confirmRestoreId === ver.id;
                  const isLatest = idx === 0;

                  return (
                    <div
                      key={ver.id}
                      className={`rounded-xl border p-3.5 transition-all ${
                        isLatest
                          ? 'border-blue-500/50 bg-blue-500/5 shadow-xs'
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--border-color)] hover:shadow-xs'
                      }`}
                    >
                      {/* Top Bar of Card */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                            v{ver.version_number}
                          </span>
                          {isLatest ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500 text-white flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Current Active</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                              Historical Snapshot
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-mono">
                          <Calendar className="w-3 h-3 opacity-60" />
                          <span>
                            {new Date(ver.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Summary / Label */}
                      <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                        {ver.summary || 'Snapshot revision'}
                      </div>
                      {ver.title && ver.title !== docTitle && (
                        <div className="text-[11px] text-[var(--text-muted)] font-mono mb-2">
                          Title: "{ver.title}"
                        </div>
                      )}

                      {/* Metadata Stats */}
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-mono mb-3">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 opacity-60" />
                          {ver.content ? `${ver.content.split(/\s+/).filter(Boolean).length} words` : '0 words'}
                        </span>
                        <span>•</span>
                        <span>{ver.content ? `${ver.content.length.toLocaleString()} bytes` : '0 bytes'}</span>
                      </div>

                      {/* Active Preview Status Banner */}
                      {isPreviewing && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Eye className="w-3.5 h-3.5 animate-pulse" />
                            <span>Version v{ver.version_number} is open in reader</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onPreviewVersion && onPreviewVersion(null)}
                            className="text-[11px] underline font-medium hover:opacity-80 cursor-pointer"
                          >
                            Exit Preview
                          </button>
                        </div>
                      )}

                      {/* Inline Diff Viewer (Comparing with Current) */}
                      {isDiffing && diffResult && (
                        <div className="mb-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                          <div className="px-3 py-1.5 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[var(--text-primary)] font-semibold flex items-center gap-1.5">
                              <GitCompare className="w-3.5 h-3.5 text-blue-500" />
                              <span>Diff vs Current Document</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-500 font-semibold">+{diffResult.addedCount}</span>
                              <span className="text-rose-500 font-semibold">-{diffResult.removedCount}</span>
                            </div>
                          </div>
                          <div className="p-2 max-h-60 overflow-y-auto text-[11px] font-mono leading-relaxed space-y-0.5">
                            {diffResult.lines.map((line, lIdx) => (
                              <div
                                key={lIdx}
                                className={`px-2 py-0.5 rounded-sm whitespace-pre-wrap break-all ${
                                  line.type === 'added'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500'
                                    : line.type === 'removed'
                                    ? 'bg-rose-500/15 text-rose-400 line-through border-l-2 border-rose-500'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <span className="select-none inline-block w-4 opacity-50">
                                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                                </span>
                                {line.text || ' '}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions Toolbar */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border-color)] text-xs">
                        <div className="flex items-center gap-3">
                          {/* Preview Toggle: Opens the version in reader */}
                          <button
                            type="button"
                            onClick={() => {
                              setDiffVersionId(null);
                              if (onPreviewVersion) {
                                onPreviewVersion(isPreviewing ? null : ver);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                              isPreviewing
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                            title={isPreviewing ? 'Exit preview and return to current document' : 'Open and preview this version in document reader'}
                          >
                            {isPreviewing ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Exit Preview</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span>Open in Preview</span>
                              </>
                            )}
                          </button>

                          {/* Compare Diff Toggle */}
                          {!isLatest && (
                            <button
                              type="button"
                              onClick={() => {
                                setDiffVersionId(isDiffing ? null : ver.id);
                              }}
                              className="flex items-center gap-1 text-[var(--text-muted)] hover:text-blue-500 transition-colors cursor-pointer"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                              <span>{isDiffing ? 'Hide Diff' : 'Compare'}</span>
                            </button>
                          )}
                        </div>

                        {/* Set As Latest / Restore Action */}
                        {!isLatest && (
                          <div>
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                <span className="text-[11px] text-amber-500 font-medium">
                                  Set v{ver.version_number} as latest?
                                </span>
                                <button
                                  type="button"
                                  disabled={isRestoring}
                                  onClick={() => handleRestore(ver.id)}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Yes, Set Latest</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRestoreId(null)}
                                  className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[11px] transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRestoreId(ver.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white font-semibold transition-colors cursor-pointer"
                                title="Set this version as the current active document"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Set as Latest</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: UPLOAD NEW VERSION ==================== */}
        {activeTab === 'upload' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Informational Guidance */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
              <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Upload AI / LLM Revision</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Got a rewritten or improved markdown document from an LLM (Claude, ChatGPT, Gemini)? Upload it here.
                You can set it as active immediately, or keep both versions in history to compare side-by-side!
              </p>
            </div>

            {/* Error or Success Alerts */}
            {uploadErrorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadErrorMessage}</span>
              </div>
            )}
            {uploadSuccessMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccessMessage}</span>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                    : uploadContent
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-[var(--border-color)] hover:border-indigo-500/50 bg-[var(--bg-secondary)]/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processSelectedFile(e.target.files[0]);
                    }
                  }}
                  accept=".md,.vmd,.markdown,.mdown,.txt"
                  className="hidden"
                />

                {uploadedFileName ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{uploadedFileName}</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                        {uploadContent.split(/\s+/).filter(Boolean).length} words • {uploadContent.length.toLocaleString()} bytes
                      </p>
                    </div>
                    <span className="inline-block text-[10px] text-blue-500 hover:underline">
                      Click or drop another file to replace
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Drop your .md or .vmd file here, or click to browse
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Supports VisualMD (.vmd) and Standard Markdown (.md)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paste Direct Text Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setPasteMode(!pasteMode)}
                  className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{pasteMode ? 'Hide Markdown Text Editor' : 'Or paste LLM markdown directly as text'}</span>
                </button>

                {pasteMode && (
                  <div className="mt-2 space-y-1">
                    <textarea
                      value={uploadContent}
                      onChange={(e) => {
                        setUploadContent(e.target.value);
                        if (!uploadSummary) setUploadSummary('Pasted LLM revision');
                      }}
                      rows={8}
                      placeholder="Paste your updated markdown from Claude, ChatGPT, or Gemini here..."
                      className="w-full p-3 text-xs font-mono rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* Draft Preview in Reader Trigger */}
              {uploadContent.trim() && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between animate-in fade-in">
                  <div className="text-xs">
                    <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ready to Preview Draft</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      View this LLM draft rendered in the reader
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onPreviewVersion) {
                        const isDraftActive = previewVersionId === 'draft';
                        onPreviewVersion(
                          isDraftActive
                            ? null
                            : {
                                id: 'draft',
                                doc_id: docId || '',
                                version_number: 0,
                                title: uploadTitle || docTitle || 'Draft Revision',
                                content: uploadContent,
                                summary: uploadSummary || 'Uploaded LLM Draft',
                                created_at: new Date().toISOString(),
                              }
                        );
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      previewVersionId === 'draft'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{previewVersionId === 'draft' ? 'Exit Draft Preview' : 'Open Draft in Preview'}</span>
                  </button>
                </div>
              )}

              {/* Version Label / Summary Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Version Summary / Label
                </label>
                <input
                  type="text"
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  placeholder="e.g., Claude 3.7 refactor: added examples"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Document Title (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Document Title <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder={docTitle || 'Document Title'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Activation Option: Immediate vs Pending Snapshot */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsLatestImmediately}
                    onChange={(e) => setSetAsLatestImmediately(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Set as current active document immediately
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      Your current document will automatically be archived as a prior snapshot in history so you can revert anytime.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isUploading || !uploadContent.trim()}
                  className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {isUploading
                      ? 'Saving Revision...'
                      : setAsLatestImmediately
                      ? 'Upload & Set as Latest'
                      : 'Upload as Version in History'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="py-2 px-3 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
    </aside>
  );
};
