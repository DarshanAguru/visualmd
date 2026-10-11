import React, { useState, useEffect, useCallback } from 'react';
import { Folder, DocumentMeta, FullDocument, ThemeType } from './types';
import { Sidebar } from './components/sidebar/Sidebar';
import { DocumentViewer } from './components/document/DocumentViewer';
import { AnnotationToolbar } from './components/annotations/AnnotationToolbar';
import { NotesDrawer } from './components/annotations/NotesDrawer';
import { PresentationDeck } from './components/deck/PresentationDeck';
import { SearchModal } from './components/modals/SearchModal';
import { NewDocModal } from './components/modals/NewDocModal';
import { ImportModal } from './components/modals/ImportModal';
import { PromptsModal } from './components/modals/PromptsModal';
import { parseVisualMD } from '@visualmd/compiler';
import { Loader2, FileQuestion, Home } from 'lucide-react';

export const App: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(() => {
    const pathMatch = window.location.pathname.match(/\/view\/([a-zA-Z0-9_-]+)/);
    return pathMatch ? pathMatch[1] : null;
  });
  const [currentDoc, setCurrentDoc] = useState<FullDocument | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('visualmd-theme') as ThemeType) || 'light';
  });

  // Apply theme to documentElement, body, and sync dark mode class
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme} antialiased`;
    const isDark = ['dark', 'obsidian', 'midnight', 'tokyo', 'dracula', 'forest', 'nord', 'retro'].includes(theme);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('visualmd-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/settings/theme')
      .then((res) => res.json())
      .then((data) => {
        if (data.value) {
          setTheme(data.value as ThemeType);
        }
      })
      .catch(() => {});
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('visualmd-theme', newTheme);
    fetch('/api/settings/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newTheme }),
    }).catch(() => {});
  };

  // Load Folders & Documents with stable ordering
  const loadWorkspace = useCallback(async () => {
    try {
      const [foldersRes, docsRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/docs'),
      ]);

      if (foldersRes.ok && docsRes.ok) {
        const foldersData = await foldersRes.json();
        const docsData: DocumentMeta[] = await docsRes.json();
        setFolders(foldersData);
        setDocuments(docsData);

        // Check URL for /view/:id or auto-select initial document
        const pathMatch = window.location.pathname.match(/\/view\/([a-zA-Z0-9_-]+)/);
        const urlDocId = pathMatch ? pathMatch[1] : null;

        setSelectedDocId((prev) => {
          if (prev && docsData.some((d) => d.id === prev)) {
            return prev;
          }
          if (urlDocId && docsData.some((d) => d.id === urlDocId)) {
            return urlDocId;
          }
          return docsData.length > 0 ? docsData[0].id : null;
        });
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathMatch = window.location.pathname.match(/\/view\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        setSelectedDocId(pathMatch[1]);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [docNotFound, setDocNotFound] = useState(false);

  // Load Full Document when selectedDocId changes (with cancellation to prevent race condition glitches)
  useEffect(() => {
    if (!selectedDocId) {
      setCurrentDoc(null);
      setDocNotFound(false);
      setIsDocumentLoading(false);
      return;
    }

    let isCancelled = false;
    setIsDocumentLoading(true);
    setDocNotFound(false);

    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/docs/${selectedDocId}`);
        if (!isCancelled) {
          if (res.ok) {
            const docData = await res.json();
            const parsed = parseVisualMD(docData.content);
            setCurrentDoc({ ...docData, parsedDoc: parsed });
            setDocNotFound(false);

            // Update URL cleanly without full page refresh
            if (window.location.pathname !== `/view/${selectedDocId}`) {
              window.history.replaceState(null, '', `/view/${selectedDocId}`);
            }
          } else {
            // Document was not found or URL is invalid
            setCurrentDoc(null);
            setDocNotFound(true);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch document:', err);
          setCurrentDoc(null);
          setDocNotFound(true);
        }
      } finally {
        if (!isCancelled) {
          setIsDocumentLoading(false);
        }
      }
    };

    fetchDoc();

    return () => {
      isCancelled = true;
    };
  }, [selectedDocId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable;

      // Escape: dismiss modals and drawers
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNewDocOpen(false);
        setIsImportOpen(false);
        setIsNotesDrawerOpen(false);
        setIsPresentationOpen(false);
        setIsPromptsOpen(false);
        return;
      }

      // Cmd/Ctrl + K: Toggle search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + B or Cmd/Ctrl + \: Toggle left sidebar
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'b' || e.key === '\\')) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + J: Toggle right notes/annotations drawer
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsNotesDrawerOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + P: Print / Export PDF
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
        return;
      }

      // 'p' without modifier: Start presentation mode
      if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey && !isInput) {
        if (currentDoc) {
          e.preventDefault();
          setIsPresentationOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDoc]);

  // Document & Folder Handlers
  const handleCreateFolder = async (name: string) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newFolder = await res.json();
        setFolders((prev) => [...prev, newFolder]);
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: updated.name } : f)));
        loadWorkspace();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to rename folder');
      }
    } catch (err) {
      console.error('Error renaming folder:', err);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      setFolders((prev) => prev.filter((f) => f.id !== id));
      const remainingDocs = documents.filter((d) => d.folder_id !== id);
      setDocuments(remainingDocs);
      if (selectedFolderId === id) setSelectedFolderId(null);
      if (selectedDocId && !remainingDocs.some((d) => d.id === selectedDocId)) {
        setSelectedDocId(remainingDocs.length > 0 ? remainingDocs[0].id : null);
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocId === id) {
        const remaining = documents.filter((d) => d.id !== id);
        setSelectedDocId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Error deleting doc:', err);
    }
  };

  const handleToggleBookmark = async (nodeId: string, label?: string) => {
    if (!currentDoc) return;
    try {
      const res = await fetch(`/api/docs/${currentDoc.id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, label }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.added) {
          setCurrentDoc((prev) =>
            prev
              ? {
                  ...prev,
                  bookmarks: [
                    ...prev.bookmarks,
                    {
                      id: String(Date.now()),
                      doc_id: prev.id,
                      node_id: nodeId,
                      label: label || null,
                      created_at: new Date().toISOString(),
                    },
                  ],
                }
              : null
          );
        } else {
          setCurrentDoc((prev) =>
            prev
              ? {
                  ...prev,
                  bookmarks: prev.bookmarks.filter((b) => b.node_id !== nodeId),
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handleAddAnnotation = async (
    nodeIdOrObj:
      | string
      | {
          nodeId: string;
          selectedText?: string;
          note?: string;
          color?: string;
          occurrenceIndex?: number;
          tableCell?: string | null;
        },
    selectedTextArg?: string,
    noteArg?: string,
    colorArg?: string,
    occurrenceIndexArg: number = 0,
    tableCellArg?: string | null
  ) => {
    if (!currentDoc) return;

    let nodeId: string;
    let selectedText: string;
    let note: string;
    let color: string;
    let occurrenceIndex: number;
    let tableCell: string | null | undefined;

    if (typeof nodeIdOrObj === 'object' && nodeIdOrObj !== null) {
      nodeId = nodeIdOrObj.nodeId;
      selectedText = nodeIdOrObj.selectedText || '';
      note = nodeIdOrObj.note || '';
      color = nodeIdOrObj.color || 'yellow';
      occurrenceIndex = nodeIdOrObj.occurrenceIndex ?? 0;
      tableCell = nodeIdOrObj.tableCell;
    } else {
      nodeId = nodeIdOrObj;
      selectedText = selectedTextArg || '';
      note = noteArg || '';
      color = colorArg || 'yellow';
      occurrenceIndex = occurrenceIndexArg;
      tableCell = tableCellArg;
    }

    try {
      const res = await fetch(`/api/docs/${currentDoc.id}/annotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          selected_text: selectedText,
          note,
          color,
          occurrence_index: occurrenceIndex,
          table_cell: tableCell,
        }),
      });
      if (res.ok) {
        const newAnno = await res.json();
        setCurrentDoc((prev) =>
          prev ? { ...prev, annotations: [...prev.annotations, newAnno] } : null
        );
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Failed to save annotation:', res.status, errJson);
      }
    } catch (err) {
      console.error('Error adding annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
      setCurrentDoc((prev) =>
        prev
          ? {
              ...prev,
              annotations: prev.annotations.filter((a) => a.id !== id),
            }
          : null
      );
    } catch (err) {
      console.error('Error deleting annotation:', err);
    }
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!currentDoc) return;
    try {
      await fetch(`/api/docs/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      setCurrentDoc((prev) => (prev ? { ...prev, title: newTitle } : null));
      setDocuments((prev) =>
        prev.map((d) => (d.id === currentDoc.id ? { ...d, title: newTitle } : d))
      );
    } catch (err) {
      console.error('Error updating title:', err);
    }
  };

  const handleUpdateContent = async (newContent: string) => {
    if (!currentDoc) return;
    try {
      const res = await fetch(`/api/docs/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentDoc((prev) =>
          prev
            ? {
                ...prev,
                content: newContent,
                parsed_json: updated.parsed_json,
                parsedDoc: updated.parsedDoc || JSON.parse(updated.parsed_json),
              }
            : null
        );
      }
    } catch (err) {
      console.error('Error updating document content:', err);
    }
  };

  const handleUpdateScrollPosition = useCallback(
    (scrollPos: number, nodeId: string | null) => {
      if (!currentDoc) return;
      fetch(`/api/docs/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_read_position: scrollPos,
          last_read_node: nodeId,
        }),
      }).catch(() => {});
    },
    [currentDoc]
  );

  const handleScrollToNode = (nodeId: string) => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'shadow-md');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500', 'shadow-md');
      }, 1800);
    }
  };

  const handleScrollToAnnotation = (annoId: string, nodeId: string) => {
    const annoEl = document.querySelector(`[data-note-id="${annoId}"]`) as HTMLElement | null;
    if (annoEl) {
      annoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      annoEl.classList.add('vmd-target-pulse', 'vmd-note-active');
      setTimeout(() => {
        annoEl.classList.remove('vmd-target-pulse');
      }, 2200);
      setTimeout(() => {
        annoEl.classList.remove('vmd-note-active');
      }, 4500);
      return;
    }
    handleScrollToNode(nodeId);
  };

  const handleSyncDataDirectory = async () => {
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        await loadWorkspace();
      }
    } catch (err) {
      console.error('Failed to sync data directory:', err);
    }
  };

  const handleMoveDoc = async (docId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/docs/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, folder_id: folderId } : d))
        );
        if (currentDoc && currentDoc.id === docId) {
          setCurrentDoc((prev) => (prev ? { ...prev, folder_id: folderId } : null));
        }
      }
    } catch (err) {
      console.error('Failed to move document:', err);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen vmd-app gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm font-medium text-[var(--text-muted)]">Initializing VisualMD Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden vmd-app">
      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggleCollapse={() => setIsSidebarOpen((prev) => !prev)}
        folders={folders}
        documents={documents}
        selectedFolderId={selectedFolderId}
        selectedDocId={selectedDocId}
        onSelectFolder={setSelectedFolderId}
        onSelectDoc={(id) => {
          setSelectedDocId(id);
          if (window.location.pathname !== `/view/${id}`) {
            window.history.pushState(null, '', `/view/${id}`);
          }
        }}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onDeleteDoc={handleDeleteDoc}
        onMoveDoc={handleMoveDoc}
        onOpenNewDocModal={(folderId) => {
          if (folderId !== undefined) setSelectedFolderId(folderId);
          setIsNewDocOpen(true);
        }}
        onOpenImportModal={(folderId) => {
          if (folderId !== undefined) setSelectedFolderId(folderId);
          setIsImportOpen(true);
        }}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onSyncDataDirectory={handleSyncDataDirectory}
      />

      {/* Main Document Workspace or Parser Loader */}
      {isDocumentLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 bg-[var(--bg-primary)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Rendering Document</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Compiling VisualMD AST & reactive blocks...</p>
          </div>
        </div>
      ) : docNotFound ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)] animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mb-4 shadow-sm">
            <FileQuestion className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">Document Not Found</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
            The requested document could not be located. It may have been moved, renamed, or deleted from the workspace.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setDocNotFound(false);
                const firstDoc = documents.length > 0 ? documents[0] : null;
                if (firstDoc) {
                  setSelectedDocId(firstDoc.id);
                  window.history.pushState(null, '', `/view/${firstDoc.id}`);
                } else {
                  setSelectedDocId(null);
                  window.history.pushState(null, '', '/');
                }
              }}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold hover:opacity-90 shadow-sm flex items-center gap-2 transition-opacity"
            >
              <Home className="w-3.5 h-3.5" />
              Return to Workspace
            </button>
            <button
              onClick={() => setIsNewDocOpen(true)}
              className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg text-xs font-medium shadow-2xs transition-colors"
            >
              Create New Document
            </button>
          </div>
        </div>
      ) : currentDoc ? (
        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          <DocumentViewer
            document={currentDoc}
            theme={theme}
            folders={folders}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            onThemeChange={handleThemeChange}
            onToggleBookmark={handleToggleBookmark}
            onDeleteAnnotation={handleDeleteAnnotation}
            onAddAnnotation={handleAddAnnotation}
            onOpenNotesDrawer={() => setIsNotesDrawerOpen((prev) => !prev)}
            onOpenPromptsModal={() => setIsPromptsOpen(true)}
            onStartPresentation={() => setIsPresentationOpen(true)}
            onUpdateTitle={handleUpdateTitle}
            onUpdateScrollPosition={handleUpdateScrollPosition}
            onUpdateContent={handleUpdateContent}
            onMoveDoc={handleMoveDoc}
          />

          {/* Bookmarks & Sticky Notes Drawer - in-flow and resizable */}
          <NotesDrawer
            isOpen={isNotesDrawerOpen}
            onClose={() => setIsNotesDrawerOpen(false)}
            docTitle={currentDoc.title}
            bookmarks={(currentDoc.bookmarks || []).filter((b) => b.doc_id === currentDoc.id)}
            annotations={(currentDoc.annotations || []).filter((a) => a.doc_id === currentDoc.id)}
            onScrollToNode={handleScrollToNode}
            onScrollToAnnotation={handleScrollToAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onToggleBookmark={handleToggleBookmark}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)]">
          <p className="text-base font-semibold text-[var(--text-primary)] mb-2">No Document Selected</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mb-4">
            Select a document from the sidebar, or create a new VisualMD document to begin.
          </p>
          <button
            onClick={() => setIsNewDocOpen(true)}
            className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg text-xs font-semibold hover:opacity-90 shadow-sm"
          >
            Create First Document
          </button>
        </div>
      )}

      {/* Floating Selection Annotation Toolbar */}
      <AnnotationToolbar
        onAddAnnotation={handleAddAnnotation}
      />

      {/* Executive Slide Presentation Deck */}
      {isPresentationOpen && currentDoc && currentDoc.parsedDoc && (
        <PresentationDeck
          document={currentDoc.parsedDoc}
          theme={theme}
          onThemeChange={handleThemeChange}
          onExit={() => setIsPresentationOpen(false)}
        />
      )}

      {/* AI Prompts & Skills Modal */}
      <PromptsModal
        isOpen={isPromptsOpen}
        onClose={() => setIsPromptsOpen(false)}
      />

      {/* Global Search Modal (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDoc={(id) => {
          setSelectedDocId(id);
        }}
      />

      {/* New Document Modal */}
      <NewDocModal
        isOpen={isNewDocOpen}
        onClose={() => setIsNewDocOpen(false)}
        folders={folders}
        currentFolderId={selectedFolderId}
        onCreated={(id) => {
          loadWorkspace();
          setSelectedDocId(id);
        }}
      />

      {/* Batch Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        folders={folders}
        currentFolderId={selectedFolderId}
        onImportComplete={loadWorkspace}
      />
    </div>
  );
};
