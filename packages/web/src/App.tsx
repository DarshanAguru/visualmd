import React, { useState, useEffect, useCallback } from 'react';
import { Folder, DocumentMeta, FullDocument, ThemeType, WorkspaceAsset } from './types';
import { Sidebar } from './components/sidebar/Sidebar';
import { DocumentViewer } from './components/document/DocumentViewer';
import { AssetViewer } from './components/viewer/AssetViewer';
import { AnnotationToolbar } from './components/annotations/AnnotationToolbar';
import { NotesDrawer } from './components/annotations/NotesDrawer';
import { PresentationDeck } from './components/deck/PresentationDeck';
import { SearchModal } from './components/modals/SearchModal';
import { NewDocModal } from './components/modals/NewDocModal';
import { ImportModal } from './components/modals/ImportModal';
import { TutorialModal } from './components/modals/TutorialModal';
import { PromptsModal } from './components/modals/PromptsModal';
import { StudyStatsModal } from './components/study/StudyStatsModal';
import {
  SettingsModal,
  SettingsTab,
  ContentWidthMode,
  FONT_SCALE_PRESETS,
  WIDTH_PRESETS,
} from './components/modals/SettingsModal';
import { parseVisualMD } from '@visualmd/compiler';
import { Loader2, FileQuestion, Home, Search, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [modalTargetFolderId, setModalTargetFolderId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(() => {
    const pathMatch = window.location.pathname.match(/\/view\/([a-zA-Z0-9_-]+)/);
    return pathMatch ? pathMatch[1] : null;
  });
  const [selectedAsset, setSelectedAsset] = useState<WorkspaceAsset | null>(null);
  const selectedAssetRef = React.useRef<WorkspaceAsset | null>(null);
  selectedAssetRef.current = selectedAsset;
  const [currentDoc, setCurrentDoc] = useState<FullDocument | null>(null);
  const [docReloadTrigger, setDocReloadTrigger] = useState(0);
  const currentDocRef = React.useRef<FullDocument | null>(null);
  currentDocRef.current = currentDoc;
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('appearance');
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isStudyStatsOpen, setIsStudyStatsOpen] = useState(false);

  // Startup Tutorial: shown only once per start/session
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    const isCompleted = localStorage.getItem('visualmd-tutorial-completed');
    const isSessionSeen = sessionStorage.getItem('visualmd-tutorial-session-seen');
    if (isCompleted || isSessionSeen) {
      return false;
    }
    sessionStorage.setItem('visualmd-tutorial-session-seen', 'true');
    return true;
  });

  // Reading Canvas Layout & Font Scaling State
  const [contentWidth, setContentWidth] = useState<ContentWidthMode>(() => {
    const saved = localStorage.getItem('visualmd-content-width') as ContentWidthMode | null;
    if (saved && WIDTH_PRESETS.some((p) => p.id === saved)) {
      return saved;
    }
    return 'standard';
  });

  const [fontScaleIndex, setFontScaleIndex] = useState<number>(() => {
    const saved = localStorage.getItem('visualmd-font-scale-index');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < FONT_SCALE_PRESETS.length) {
        return parsed;
      }
    }
    return 3; // Default Normal (100%)
  });

  const handleContentWidthChange = (w: ContentWidthMode) => {
    setContentWidth(w);
    localStorage.setItem('visualmd-content-width', w);
    fetch('/api/settings/content_width', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: w }),
    }).catch(() => {});
  };

  const handleFontScaleIndexChange = (idx: number) => {
    setFontScaleIndex(idx);
    localStorage.setItem('visualmd-font-scale-index', String(idx));
    fetch('/api/settings/font_scale_index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: String(idx) }),
    }).catch(() => {});
  };

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

  // Bulk hydrate all settings from SQLite database on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((allSettings) => {
        if (!allSettings) return;

        // 1. Theme
        if (allSettings.theme) {
          setTheme(allSettings.theme as ThemeType);
          localStorage.setItem('visualmd-theme', allSettings.theme);
        }

        // 2. Content Width
        const cw = allSettings.content_width || allSettings['visualmd-content-width'];
        if (cw && WIDTH_PRESETS.some((p) => p.id === cw)) {
          setContentWidth(cw as ContentWidthMode);
          localStorage.setItem('visualmd-content-width', cw);
        }

        // 3. Font Scale Index
        const fsi = allSettings.font_scale_index || allSettings['visualmd-font-scale-index'];
        if (fsi !== undefined && fsi !== null) {
          const parsed = parseInt(String(fsi), 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < FONT_SCALE_PRESETS.length) {
            setFontScaleIndex(parsed);
            localStorage.setItem('visualmd-font-scale-index', String(parsed));
          }
        }

        // 4. Pomodoro Settings
        const pomo = allSettings.pomodoro_settings || allSettings['visualmd-pomodoro-settings'];
        if (pomo) {
          try {
            const parsed = typeof pomo === 'string' ? JSON.parse(pomo) : pomo;
            localStorage.setItem('visualmd-pomodoro-settings', JSON.stringify(parsed));
            window.dispatchEvent(
              new CustomEvent('visualmd:pomodoro-settings', { detail: parsed })
            );
          } catch {}
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
          // Preserve open asset preview if user is inspecting an image or PDF
          if (selectedAssetRef.current) {
            return null;
          }
          return docsData.length > 0 ? docsData[0].id : null;
        });

        // If the open document was modified externally on disk, trigger a content refresh
        if (currentDocRef.current) {
          const freshMeta = docsData.find((d) => d.id === currentDocRef.current?.id);
          if (freshMeta) {
            const freshTime = new Date(freshMeta.updated_at).getTime();
            const currentTime = new Date(currentDocRef.current.updated_at).getTime();
            if (!isNaN(freshTime) && !isNaN(currentTime) && freshTime > currentTime) {
              setDocReloadTrigger((v) => v + 1);
            }
          }
        }
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

  // Real-time synchronization with server events & disk changes
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: any = null;

    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('sync', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data || '{}');
          if (data?.type === 'scroll') return;
        } catch {}
        loadWorkspace();
      });

      eventSource.addEventListener('settings_changed', (evt: MessageEvent) => {
        try {
          const updates = JSON.parse(evt.data || '{}');
          if (updates.theme) {
            setTheme(updates.theme as ThemeType);
            localStorage.setItem('visualmd-theme', updates.theme);
          }
          if (updates.content_width) {
            setContentWidth(updates.content_width as ContentWidthMode);
            localStorage.setItem('visualmd-content-width', updates.content_width);
          }
          if (updates.font_scale_index !== undefined) {
            const parsed = Number(updates.font_scale_index);
            if (!isNaN(parsed)) {
              setFontScaleIndex(parsed);
              localStorage.setItem('visualmd-font-scale-index', String(parsed));
            }
          }
          if (updates.pomodoro_settings) {
            const p = typeof updates.pomodoro_settings === 'string'
              ? JSON.parse(updates.pomodoro_settings)
              : updates.pomodoro_settings;
            localStorage.setItem('visualmd-pomodoro-settings', JSON.stringify(p));
            window.dispatchEvent(new CustomEvent('visualmd:pomodoro-settings', { detail: p }));
          }
        } catch {}
      });
      eventSource.onerror = () => {
        if (!fallbackInterval) {
          fallbackInterval = setInterval(loadWorkspace, 10000);
        }
      };
      eventSource.onopen = () => {
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };
    } catch {
      fallbackInterval = setInterval(loadWorkspace, 10000);
    }

    const handleFocus = () => {
      loadWorkspace();
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadWorkspace();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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

  // Load Full Document when selectedDocId or docReloadTrigger changes
  useEffect(() => {
    if (!selectedDocId) {
      setCurrentDoc(null);
      setDocNotFound(false);
      setIsDocumentLoading(false);
      return;
    }

    let isCancelled = false;
    // Only show full-screen loader on initial mount or when switching documents.
    // Background reloads or disk updates of the active document update smoothly without unmounting or flickering!
    if (!currentDocRef.current || currentDocRef.current.id !== selectedDocId) {
      setIsDocumentLoading(true);
    }
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
  }, [selectedDocId, docReloadTrigger]);

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
        setIsSettingsOpen(false);
        return;
      }

      // Cmd/Ctrl + I: Toggle Settings modal (also supports Cmd/Ctrl + ,)
      const isModifier = e.metaKey || e.ctrlKey;
      const isKeyI =
        e.code === 'KeyI' ||
        (typeof e.key === 'string' && e.key.toLowerCase() === 'i') ||
        e.keyCode === 73 ||
        e.which === 73;
      const isComma = e.key === ',' || e.code === 'Comma' || e.keyCode === 188;

      if (isModifier && (isKeyI || isComma)) {
        e.preventDefault();
        e.stopPropagation();
        setIsSettingsOpen((prev) => !prev);
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

      // Fullscreen shortcut: strictly ONLY F11 (or Fn+F11) toggles fullscreen. Esc exits fullscreen.
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        const doc = document as any;
        const isFull = !!(
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
        );
        if (!isFull) {
          const elem = document.documentElement as any;
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
          } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
          } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
          }
        } else {
          if (doc.exitFullscreen) {
            doc.exitFullscreen().catch(() => {});
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            doc.msExitFullscreen();
          }
        }
        return;
      }

      // Escape key exits browser fullscreen if active
      if (e.key === 'Escape') {
        const doc = document as any;
        const isFull = !!(
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
        );
        if (isFull) {
          if (doc.exitFullscreen) {
            doc.exitFullscreen().catch(() => {});
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            doc.msExitFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
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
      if (currentDoc && currentDoc.folder_id === id) {
        setCurrentDoc(null);
      }
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
      const res = await fetch(`/api/docs/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentDoc((prev) => (prev ? { ...prev, ...updated, title: newTitle } : null));
        setDocuments((prev) =>
          prev.map((d) => (d.id === currentDoc.id ? { ...d, title: newTitle, updated_at: updated.updated_at } : d))
        );
      }
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
                ...updated,
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
          prev.map((d) => (d.id === docId ? { ...d, folder_id: folderId, updated_at: updated.updated_at } : d))
        );
        if (currentDoc && currentDoc.id === docId) {
          setCurrentDoc((prev) => (prev ? { ...prev, ...updated, folder_id: folderId } : null));
        }
      }
    } catch (err) {
      console.error('Failed to move document:', err);
    }
  };

  const handleDeleteAsset = async (asset: WorkspaceAsset) => {
    if (!confirm(`Delete asset "${asset.name}"?`)) return;
    try {
      const res = await fetch(`/api/assets/${encodeURI(asset.relativePath)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        selectedAssetRef.current = null;
        setSelectedAsset(null);
        await loadWorkspace();
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
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
        selectedAsset={selectedAsset}
        onSelectFolder={setSelectedFolderId}
        onSelectDoc={(id) => {
          setSelectedDocId(id);
          setSelectedAsset(null);
          if (window.location.pathname !== `/view/${id}`) {
            window.history.pushState(null, '', `/view/${id}`);
          }
        }}
        onSelectAsset={(asset) => {
          setSelectedAsset(asset);
          if (asset) {
            setSelectedDocId(null);
            setCurrentDoc(null);
            if (window.location.pathname.startsWith('/view/')) {
              window.history.pushState(null, '', '/');
            }
          } else {
            selectedAssetRef.current = null;
            const fallbackDoc = documents.length > 0 ? documents[0] : null;
            if (fallbackDoc) {
              setSelectedDocId(fallbackDoc.id);
              window.history.pushState(null, '', `/view/${fallbackDoc.id}`);
            }
          }
        }}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onDeleteDoc={handleDeleteDoc}
        onMoveDoc={handleMoveDoc}
        onOpenNewDocModal={(folderId) => {
          const target = folderId !== undefined ? folderId : selectedFolderId;
          setModalTargetFolderId(target || null);
          if (target) setSelectedFolderId(target);
          setIsNewDocOpen(true);
        }}
        onOpenImportModal={(folderId) => {
          const target = folderId !== undefined ? folderId : selectedFolderId;
          setModalTargetFolderId(target || null);
          if (target) setSelectedFolderId(target);
          setIsImportOpen(true);
        }}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onSyncDataDirectory={handleSyncDataDirectory}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'appearance');
          setIsSettingsOpen(true);
        }}
      />

      {/* Main Document Workspace or In-App Asset Viewer or Initial Parser Loader */}
      {!currentDoc && isDocumentLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 bg-[var(--bg-primary)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Rendering Document</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Compiling VisualMD AST & reactive blocks...</p>
          </div>
        </div>
      ) : selectedAsset ? (
        <AssetViewer
          asset={selectedAsset}
          onClose={() => {
            selectedAssetRef.current = null;
            setSelectedAsset(null);
            const fallbackDoc = documents.length > 0 ? documents[0] : null;
            if (fallbackDoc) {
              setSelectedDocId(fallbackDoc.id);
              window.history.pushState(null, '', `/view/${fallbackDoc.id}`);
            }
          }}
          onDelete={handleDeleteAsset}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
      ) : docNotFound ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)] animate-in fade-in duration-200">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-md">
              <FileQuestion className="w-8 h-8" />
            </div>
            <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs">
              404
            </div>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Document Not Found</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
            The requested document could not be located in your workspace. It may have been moved, renamed, or deleted from the linked storage directory.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setDocNotFound(false);
                setSelectedAsset(null);
                const firstDoc = documents.length > 0 ? documents[0] : null;
                if (firstDoc) {
                  setSelectedDocId(firstDoc.id);
                  window.history.pushState(null, '', `/view/${firstDoc.id}`);
                } else {
                  setSelectedDocId(null);
                  window.history.pushState(null, '', '/');
                }
              }}
              className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-semibold hover:opacity-90 shadow-sm flex items-center gap-2 transition-opacity cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Workspace</span>
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-xs font-medium shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-blue-500" />
              <span>Search Documents (⌘K)</span>
            </button>
            <button
              onClick={() => setIsNewDocOpen(true)}
              className="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-medium shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Document</span>
            </button>
          </div>
        </div>
      ) : currentDoc ? (
        <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
          {/* Subtle top loading pulse bar during document transitions or background syncs */}
          {isDocumentLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/20 overflow-hidden z-50 pointer-events-none">
              <div className="w-full h-full bg-blue-500 animate-pulse" />
            </div>
          )}
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
            onOpenStudyStats={() => setIsStudyStatsOpen(true)}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOpenSettings={(tab) => {
              setSettingsInitialTab(tab || 'appearance');
              setIsSettingsOpen(true);
            }}
            onStartPresentation={() => setIsPresentationOpen(true)}
            onUpdateTitle={handleUpdateTitle}
            onUpdateScrollPosition={handleUpdateScrollPosition}
            onUpdateContent={handleUpdateContent}
            onMoveDoc={handleMoveDoc}
            contentWidth={contentWidth}
            onContentWidthChange={handleContentWidthChange}
            fontScaleIndex={fontScaleIndex}
            onFontScaleIndexChange={handleFontScaleIndexChange}
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

      {/* Global Search Modal (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDoc={(id) => {
          setSelectedDocId(id);
          setSelectedAsset(null);
        }}
      />

      {/* New Document Modal */}
      <NewDocModal
        isOpen={isNewDocOpen}
        onClose={() => {
          setIsNewDocOpen(false);
          setModalTargetFolderId(null);
        }}
        folders={folders}
        currentFolderId={modalTargetFolderId ?? selectedFolderId}
        onCreated={(id) => {
          loadWorkspace();
          setSelectedDocId(id);
          setSelectedAsset(null);
        }}
      />

      {/* Batch Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setModalTargetFolderId(null);
        }}
        folders={folders}
        currentFolderId={modalTargetFolderId ?? selectedFolderId}
        onImportComplete={loadWorkspace}
      />

      {/* First-Time User Starter Tutorial & Feature Walkthrough */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          sessionStorage.setItem('visualmd-tutorial-session-seen', 'true');
          localStorage.setItem('visualmd-tutorial-completed', 'true');
        }}
        onOpenDemoDoc={() => {
          setIsTutorialOpen(false);
          sessionStorage.setItem('visualmd-tutorial-session-seen', 'true');
          localStorage.setItem('visualmd-tutorial-completed', 'true');
          const demoDoc =
            documents.find(
              (d) =>
                d.title.toLowerCase().includes('welcome') ||
                d.title.toLowerCase().includes('tutorial') ||
                d.title.toLowerCase().includes('guide') ||
                d.title.toLowerCase().includes('study') ||
                d.title.toLowerCase().includes('demo')
            ) || documents[0];
          if (demoDoc) {
            setSelectedDocId(demoDoc.id);
            setSelectedAsset(null);
          }
        }}
      />

      {/* Settings, Themes, Canvas, Study & Help Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
        theme={theme}
        onThemeChange={handleThemeChange}
        contentWidth={contentWidth}
        onContentWidthChange={handleContentWidthChange}
        fontScaleIndex={fontScaleIndex}
        onFontScaleIndexChange={handleFontScaleIndexChange}
        onOpenTutorial={() => {
          setIsSettingsOpen(false);
          setIsTutorialOpen(true);
        }}
      />

      {/* AI Prompts & Skills Modal */}
      <PromptsModal
        isOpen={isPromptsOpen}
        onClose={() => setIsPromptsOpen(false)}
      />

      {/* Study Stats & Activity Modal */}
      <StudyStatsModal
        isOpen={isStudyStatsOpen}
        onClose={() => setIsStudyStatsOpen(false)}
      />
    </div>
  );
};
