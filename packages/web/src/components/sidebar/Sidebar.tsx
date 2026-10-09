import React, { useState, useEffect } from 'react';
import { Folder, DocumentMeta } from '../../types';
import {
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  FolderInput,
  FileText,
  Plus,
  Upload,
  Search,
  Trash2,
  PanelLeftClose,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { VisualMDLogo } from '../brand/VisualMDLogo';

interface SidebarProps {
  isOpen: boolean;
  onToggleCollapse: () => void;
  folders: Folder[];
  documents: DocumentMeta[];
  selectedFolderId: string | null;
  selectedDocId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectDoc: (docId: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onMoveDoc?: (docId: string, folderId: string | null) => void;
  onOpenNewDocModal: (folderId?: string | null) => void;
  onOpenImportModal: (folderId?: string | null) => void;
  onOpenSearchModal: () => void;
  onSyncDataDirectory?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggleCollapse,
  folders,
  documents,
  selectedFolderId,
  selectedDocId,
  onSelectFolder,
  onSelectDoc,
  onCreateFolder,
  onDeleteFolder,
  onDeleteDoc,
  onMoveDoc,
  onOpenNewDocModal,
  onOpenImportModal,
  onOpenSearchModal,
  onSyncDataDirectory,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Resizable sidebar width with persistence (min 220px, max 650px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('visualmd-sidebar-width');
    return saved ? Math.max(220, Math.min(650, parseInt(saved, 10))) : 288;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [moveMenuDocId, setMoveMenuDocId] = useState<string | null>(null);

  // Close move dropdown on outside click
  useEffect(() => {
    if (!moveMenuDocId) return;
    const handleOutside = () => setMoveMenuDocId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [moveMenuDocId]);

  // Sidebar drag resizer
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(220, Math.min(650, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('visualmd-sidebar-width', String(sidebarWidth));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // VS Code-style folder expanded/collapsed state (all expanded by default)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    folders.forEach((f) => {
      initial[f.id] = true;
    });
    return initial;
  });

  // When folders change or new folder is added, ensure it's expanded
  useEffect(() => {
    setExpandedFolders((prev) => {
      const next = { ...prev };
      folders.forEach((f) => {
        if (next[f.id] === undefined) {
          next[f.id] = true;
        }
      });
      return next;
    });
  }, [folders]);

  // When filtering with search text, auto-expand folders containing matches
  useEffect(() => {
    if (filterText.trim()) {
      const term = filterText.toLowerCase().trim();
      const next: Record<string, boolean> = {};
      folders.forEach((f) => {
        const hasMatchingDoc = documents.some(
          (d) => d.folder_id === f.id && d.title.toLowerCase().includes(term)
        );
        if (hasMatchingDoc) {
          next[f.id] = true;
        }
      });
      setExpandedFolders((prev) => ({ ...prev, ...next }));
    }
  }, [filterText, documents, folders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleSyncClick = async () => {
    if (onSyncDataDirectory) {
      setIsSyncing(true);
      try {
        await onSyncDataDirectory();
      } finally {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  const formatUploadTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const searchTerm = filterText.toLowerCase().trim();

  // 1. Sort folders case-insensitively
  const sortedFolders = [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  // 2. Sort documents by upload/created_at time (latest first)
  const sortDocsByLatest = (docs: DocumentMeta[]) => {
    return [...docs].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  };

  const rootDocuments = sortDocsByLatest(documents.filter((d) => !d.folder_id));

  const isDocVisible = (d: DocumentMeta) => {
    if (!searchTerm) return true;
    return d.title.toLowerCase().includes(searchTerm);
  };

  return (
    <aside
      style={{ width: isOpen ? `${sidebarWidth}px` : 0 }}
      className={`relative bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] text-[var(--text-primary)] flex flex-col h-screen select-none shrink-0 ${
        isResizing ? 'transition-none select-none' : 'transition-[width,opacity] duration-200 ease-in-out'
      } ${
        isOpen ? 'opacity-100' : 'opacity-0 overflow-hidden border-r-0'
      }`}
    >
      {/* Resizer Handle on right border */}
      {isOpen && (
        <div
          onMouseDown={startResizing}
          onDoubleClick={() => setSidebarWidth(288)}
          title="Drag to resize sidebar (double-click to reset)"
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-30"
        />
      )}
      {/* 1. Fixed Brand Header */}
      <div className="h-14 px-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-2.5">
          <VisualMDLogo size={24} />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              VisualMD
            </span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]">
              v1.0
            </span>
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Fixed Primary Actions */}
      <div className="p-3 space-y-2 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] shrink-0">
        <button
          onClick={() => onOpenNewDocModal(selectedFolderId)}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Document</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onOpenSearchModal}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] transition-colors shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search (⌘K)</span>
          </button>
          <button
            onClick={() => onOpenImportModal(selectedFolderId)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* 3. Fixed Search Filter Input (Pinned at Top - Does not scroll) */}
      <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter files & folders..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 shadow-xs transition-colors"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. VS Code-Style Unified File Tree View (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Explorer Header */}
        <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase select-none">
          <span>Explorer</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddingFolder(!isAddingFolder)}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Create Folder Form */}
        {isAddingFolder && (
          <form onSubmit={handleCreateFolder} className="px-2 py-1 mb-1">
            <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-blue-500 rounded-md px-2 py-1">
              <FolderIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAddingFolder(false);
                }}
                placeholder="Folder name..."
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>
          </form>
        )}

        {/* Folders List with Nested Documents (VS Code Style) */}
        {sortedFolders.map((folder) => {
          const isExpanded = !!expandedFolders[folder.id];
          const folderDocs = sortDocsByLatest(documents.filter((d) => d.folder_id === folder.id));
          const visibleDocs = folderDocs.filter(isDocVisible);

          // If filtering and no matches in this folder, hide folder
          if (searchTerm && visibleDocs.length === 0) {
            return null;
          }

          return (
            <div key={folder.id} className="space-y-0.5">
              {/* Folder Row */}
              <div
                className={`group flex items-center justify-between px-1.5 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                  selectedFolderId === folder.id
                    ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
                onClick={() => {
                  toggleFolder(folder.id);
                  onSelectFolder(folder.id);
                }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="p-0.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <FolderIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate font-medium">{folder.name}</span>
                </div>

                {/* Folder Hover Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewDocModal(folder.id);
                    }}
                    className="p-0.5 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)]"
                    title="New document in this folder"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenImportModal(folder.id);
                    }}
                    className="p-0.5 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)]"
                    title="Import files into this folder"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const msg =
                        folderDocs.length > 0
                          ? `Delete folder "${folder.name}" and all ${folderDocs.length} document${folderDocs.length > 1 ? 's' : ''} inside it?`
                          : `Delete folder "${folder.name}"?`;
                      if (confirm(msg)) {
                        onDeleteFolder(folder.id);
                      }
                    }}
                    className="p-0.5 hover:text-rose-500 rounded hover:bg-[var(--bg-tertiary)]"
                    title="Delete folder and its documents"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] ml-0.5">
                    {folderDocs.length}
                  </span>
                </div>
              </div>

              {/* Nested Folder Documents (Indented Tree Children) */}
              {isExpanded && (
                <div className="ml-3 pl-3 border-l border-[var(--border-color)]/70 space-y-0.5 my-0.5">
                  {visibleDocs.length === 0 ? (
                    <div className="text-[11px] text-[var(--text-muted)] italic py-1 px-2 select-none">
                      {folderDocs.length === 0 ? 'Empty folder' : 'No matches'}
                    </div>
                  ) : (
                    visibleDocs.map((doc) => {
                      const isActive = selectedDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => onSelectDoc(doc.id)}
                          className={`group flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-colors relative ${
                            isActive
                              ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold border border-[var(--border-color)] shadow-xs'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1.5">
                            <FileText className="w-3.5 h-3.5 shrink-0 opacity-70 text-blue-500" />
                            <span className="truncate leading-tight font-normal">{doc.title}</span>
                            {doc.created_at && (
                              <span
                                className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono opacity-65 ml-auto"
                                title={`Uploaded: ${new Date(doc.created_at).toLocaleString()}`}
                              >
                                {formatUploadTime(doc.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {onMoveDoc && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoveMenuDocId(moveMenuDocId === doc.id ? null : doc.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-opacity"
                                title="Move document to folder..."
                              >
                                <FolderInput className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Remove "${doc.title}"?`)) {
                                  onDeleteDoc(doc.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-rose-500 rounded hover:bg-[var(--bg-tertiary)] transition-opacity"
                              title="Remove document"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Move to folder dropdown menu */}
                          {moveMenuDocId === doc.id && onMoveDoc && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-2 top-full mt-1 z-50 w-44 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl py-1 text-xs"
                            >
                              <div className="px-2 py-1 font-semibold text-[10px] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)]">
                                Move to folder
                              </div>
                              <button
                                onClick={() => {
                                  onMoveDoc(doc.id, null);
                                  setMoveMenuDocId(null);
                                }}
                                className={`w-full text-left px-2 py-1.5 flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] ${
                                  !doc.folder_id ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                                }`}
                              >
                                <FileText className="w-3 h-3 opacity-60" />
                                <span>Root (No Folder)</span>
                              </button>
                              {sortedFolders.map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => {
                                    onMoveDoc(doc.id, f.id);
                                    setMoveMenuDocId(null);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] truncate ${
                                    doc.folder_id === f.id ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                                  }`}
                                >
                                  <FolderIcon className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span className="truncate">{f.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Root Level Documents (Documents outside any folder) */}
        {rootDocuments.filter(isDocVisible).length > 0 && (
          <div className="pt-2">
            {folders.length > 0 && (
              <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase select-none">
                Root Documents
              </div>
            )}
            <div className="space-y-0.5">
              {rootDocuments.filter(isDocVisible).map((doc) => {
                const isActive = selectedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDoc(doc.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors relative ${
                      isActive
                        ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold border border-[var(--border-color)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0 opacity-70 text-blue-500" />
                      <span className="truncate font-normal">{doc.title}</span>
                      {doc.created_at && (
                        <span
                          className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono opacity-65 ml-auto"
                          title={`Uploaded: ${new Date(doc.created_at).toLocaleString()}`}
                        >
                          {formatUploadTime(doc.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {onMoveDoc && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveMenuDocId(moveMenuDocId === doc.id ? null : doc.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-opacity"
                          title="Move document to folder..."
                        >
                          <FolderInput className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove "${doc.title}"?`)) {
                            onDeleteDoc(doc.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-rose-500 rounded hover:bg-[var(--bg-tertiary)] transition-opacity"
                        title="Remove document"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Move to folder dropdown menu */}
                    {moveMenuDocId === doc.id && onMoveDoc && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-full mt-1 z-50 w-44 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl py-1 text-xs"
                      >
                        <div className="px-2 py-1 font-semibold text-[10px] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)]">
                          Move to folder
                        </div>
                        <button
                          onClick={() => {
                            onMoveDoc(doc.id, null);
                            setMoveMenuDocId(null);
                          }}
                          className={`w-full text-left px-2 py-1.5 flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] ${
                            !doc.folder_id ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          <FileText className="w-3 h-3 opacity-60" />
                          <span>Root (No Folder)</span>
                        </button>
                        {sortedFolders.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              onMoveDoc(doc.id, f.id);
                              setMoveMenuDocId(null);
                            }}
                            className={`w-full text-left px-2 py-1.5 flex items-center gap-1.5 hover:bg-[var(--bg-tertiary)] truncate ${
                              doc.folder_id === f.id ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <FolderIcon className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {documents.filter(isDocVisible).length === 0 && (
          <div className="p-4 text-center text-xs text-[var(--text-muted)] italic">
            No matching documents found.
          </div>
        )}
      </div>

      {/* 5. Fixed Footer Status Bar & Copyright */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">data/ synced</span>
          </div>
          {onSyncDataDirectory && (
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-[10px] font-mono transition-colors"
              title="Scan and synchronize data/ directory"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          )}
        </div>
        <div className="pt-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
          <span>© {new Date().getFullYear()}</span>
          <a
            href="https://thisdarshiii.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-secondary)] hover:text-blue-500 transition-colors hover:underline flex items-center gap-0.5"
            title="Darshan Aguru's Blog (https://thisdarshiii.in)"
          >
            <span>Darshan Aguru</span>
            <span className="text-[9px] opacity-70">↗</span>
          </a>
        </div>
      </div>
    </aside>
  );
};
