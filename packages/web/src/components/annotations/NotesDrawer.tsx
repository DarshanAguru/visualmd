import React from 'react';
import { Bookmark, Annotation } from '../../types';
import { Bookmark as BookmarkIcon, Trash2, X, MapPin, Highlighter } from 'lucide-react';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle?: string;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  onScrollToNode: (nodeId: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onToggleBookmark: (nodeId: string) => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  docTitle,
  bookmarks,
  annotations,
  onScrollToNode,
  onDeleteAnnotation,
  onToggleBookmark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-84 max-w-[90vw] bg-[var(--bg-card)] border-l border-[var(--border-color)] text-[var(--text-primary)] shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
            <BookmarkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Document Notes</span>
          </div>
          {docTitle && (
            <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5" title={docTitle}>
              {docTitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Bookmarks Section */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
            <span>Bookmarks ({bookmarks.length})</span>
          </div>
          {bookmarks.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              Double-click any section header or text to drop a bookmark on this page.
            </p>
          ) : (
            <div className="space-y-1.5">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-blue-500/50 transition-all group"
                >
                  <button
                    onClick={() => onScrollToNode(bm.node_id)}
                    className="flex items-center gap-2 text-xs text-[var(--text-primary)] hover:text-blue-500 text-left flex-1 min-w-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">
                      {bm.label && !bm.label.startsWith('node-') && !bm.label.startsWith('Section node-') && !bm.label.startsWith('Section ')
                        ? `Bookmarked : ${bm.label}`
                        : 'Bookmarked'}
                    </span>
                  </button>
                  <button
                    onClick={() => onToggleBookmark(bm.node_id)}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Annotations Section */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
            <span>Highlights & Notes ({annotations.length})</span>
          </div>
          {annotations.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              Select text in this document to highlight or attach sticky notes.
            </p>
          ) : (
            <div className="space-y-2">
              {annotations.map((anno) => (
                <div
                  key={anno.id}
                  className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--text-muted)] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <button
                      onClick={() => onScrollToNode(anno.node_id)}
                      className="flex items-center gap-1.5 text-xs text-left font-medium text-[var(--text-primary)] hover:underline truncate"
                    >
                      <Highlighter className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">"{anno.selected_text}"</span>
                    </button>
                    <button
                      onClick={() => onDeleteAnnotation(anno.id)}
                      className="p-0.5 text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete annotation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {anno.note && anno.note !== 'Highlighted snippet' && (
                    <p className="text-xs text-[var(--text-secondary)] pl-5 italic border-l-2 border-[var(--border-color)]">
                      {anno.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
