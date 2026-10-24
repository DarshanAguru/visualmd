import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchResult } from '../../types';
import { Search, FileText, ArrowRight, X } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectDoc }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setSelectedIndex(0);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Handle keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        if (results.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        }
      } else if (e.key === 'ArrowUp') {
        if (results.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        }
      } else if (e.key === 'Enter') {
        if (results.length > 0 && results[selectedIndex]) {
          e.preventDefault();
          onSelectDoc(results[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectDoc]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <Search className="w-4 h-4 text-blue-500 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, tags, content (⌘K)..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded border border-[var(--border-color)]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">Searching index...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs">
              No matching documents found for "{query}".
            </div>
          )}

          {!loading && !query && (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs">
              Type keywords or concepts to search across all documents.
            </div>
          )}

          {!loading &&
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectDoc(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-4 group cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-surface)] border-[var(--accent)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-primary)] group-hover:text-blue-500'}`}>
                        {item.title}
                      </h4>
                      <p
                        className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.snippet || '' }}
                      />
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-blue-500'}`} />
                </button>
              );
            })}
        </div>

        {/* Footer Navigation Hints */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] font-mono text-[10px]">↑</kbd>
                <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] font-mono text-[10px]">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] font-mono text-[10px]">↵</kbd>
                <span>open</span>
              </span>
            </div>
            <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
