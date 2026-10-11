import React, { useState, useEffect } from 'react';
import { Bookmark, Annotation } from '../../types';
import {
  Bookmark as BookmarkIcon,
  Trash2,
  X,
  MapPin,
  Highlighter,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle?: string;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  onScrollToNode: (nodeId: string) => void;
  onScrollToAnnotation: (annoId: string, nodeId: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onToggleBookmark: (nodeId: string) => void;
}

const COLOR_DOT_MAP: Record<string, string> = {
  yellow: '#eab308',
  emerald: '#10b981',
  sky: '#0284c7',
  rose: '#f43f5e',
  purple: '#a855f7',
  orange: '#ea580c',
  teal: '#0d9488',
  coral: '#dc2626',
};

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  docTitle,
  bookmarks,
  annotations,
  onScrollToNode,
  onScrollToAnnotation,
  onDeleteAnnotation,
  onToggleBookmark,
}) => {
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(true);

  // Resizable drawer width with persistence (min 260px, max 650px)
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('visualmd-notes-drawer-width');
    return saved ? Math.max(260, Math.min(650, parseInt(saved, 10))) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(260, Math.min(650, window.innerWidth - e.clientX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('visualmd-notes-drawer-width', String(drawerWidth));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, drawerWidth]);

  // Separate Notes vs Highlights
  const notesList = annotations.filter(
    (a) => a.note && a.note.trim() !== '' && a.note !== 'Highlighted snippet'
  );
  const highlightsList = annotations.filter(
    (a) => !a.note || a.note.trim() === '' || a.note === 'Highlighted snippet'
  );

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
          onDoubleClick={() => setDrawerWidth(320)}
          title="Drag to resize index sidebar (double-click to reset)"
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-30"
        />
      )}
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Index & Navigation</span>
          </div>
          {docTitle && (
            <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5" title={docTitle}>
              {docTitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Notes Accordion */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setIsNotesOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 text-left font-semibold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>Notes & Comments</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {notesList.length}
              </span>
            </div>
            {isNotesOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>

          {isNotesOpen && (
            <div className="p-2.5 pt-0 space-y-2 border-t border-[var(--border-color)]/60">
              {notesList.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] italic p-2">
                  No notes yet. Add section comments or select text to attach notes.
                </p>
              ) : (
                notesList.map((anno) => {
                  const colorHex = COLOR_DOT_MAP[anno.color || 'yellow'] || '#eab308';
                  const isComponentNote = !anno.selected_text || anno.selected_text.trim() === '';
                  return (
                    <div
                      key={anno.id}
                      onClick={() => onScrollToAnnotation(anno.id, anno.node_id)}
                      className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all cursor-pointer group shadow-2xs"
                      title="Click to jump to this note"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: colorHex }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            {isComponentNote ? 'Section Note' : anno.table_cell ? 'Table Cell Note' : 'Snippet Note'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAnnotation(anno.id);
                          }}
                          className="p-0.5 text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed mb-1.5 whitespace-pre-wrap">
                        {anno.note}
                      </p>

                      {anno.selected_text && (
                        <p className="text-[11px] text-[var(--text-muted)] italic pl-2 border-l-2 border-[var(--border-color)] truncate">
                          "{anno.selected_text}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 2. Highlights Accordion */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setIsHighlightsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 text-left font-semibold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Highlighter className="w-3.5 h-3.5 text-blue-500" />
              <span>Highlights</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                {highlightsList.length}
              </span>
            </div>
            {isHighlightsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>

          {isHighlightsOpen && (
            <div className="p-2.5 pt-0 space-y-2 border-t border-[var(--border-color)]/60">
              {highlightsList.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] italic p-2">
                  No highlights yet. Select any text in the document to highlight it.
                </p>
              ) : (
                highlightsList.map((anno) => {
                  const colorHex = COLOR_DOT_MAP[anno.color || 'yellow'] || '#eab308';
                  return (
                    <div
                      key={anno.id}
                      onClick={() => onScrollToAnnotation(anno.id, anno.node_id)}
                      className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all cursor-pointer group shadow-2xs"
                      title="Click to jump to this highlight"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: colorHex }}
                          />
                          <span className="text-[10px] font-mono capitalize text-[var(--text-muted)]">
                            {anno.color || 'yellow'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAnnotation(anno.id);
                          }}
                          className="p-0.5 text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete highlight"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-primary)] leading-relaxed italic line-clamp-3">
                        "{anno.selected_text}"
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 3. Bookmarks Accordion */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setIsBookmarksOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 text-left font-semibold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BookmarkIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Bookmarks</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                {bookmarks.length}
              </span>
            </div>
            {isBookmarksOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>

          {isBookmarksOpen && (
            <div className="p-2.5 pt-0 space-y-1.5 border-t border-[var(--border-color)]/60">
              {bookmarks.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] italic p-2">
                  Double-click any section header to drop a bookmark.
                </p>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-blue-500/50 transition-all group shadow-2xs"
                  >
                    <button
                      onClick={() => onScrollToNode(bm.node_id)}
                      className="flex items-center gap-2 text-xs text-[var(--text-primary)] hover:text-blue-500 text-left flex-1 min-w-0 cursor-pointer"
                      title="Jump to bookmark"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {bm.label && !bm.label.startsWith('node-') && !bm.label.startsWith('Section node-') && !bm.label.startsWith('Section ')
                          ? `Bookmarked : ${bm.label}`
                          : 'Bookmarked Section'}
                      </span>
                    </button>
                    <button
                      onClick={() => onToggleBookmark(bm.node_id)}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
