import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
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
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectDoc(item.id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-all flex items-start justify-between gap-4 group"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-blue-500 truncate">
                      {item.title}
                    </h4>
                    <p
                      className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.snippet || '' }}
                    />
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
