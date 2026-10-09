import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';

interface AnnotationToolbarProps {
  onAddAnnotation: (
    nodeId: string,
    selectedText: string,
    note: string,
    color: string,
    occurrenceIndex?: number
  ) => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  onAddAnnotation,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [occurrenceIndex, setOccurrenceIndex] = useState(0);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [chosenColor, setChosenColor] = useState('yellow');

  useEffect(() => {
    const processSelection = (customPos?: { x: number; y: number } | null) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        if (!isAddingNote) {
          setPosition(null);
        }
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) return;

      // Find closest node container with [data-node-id]
      let curr: Node | null = selection.anchorNode;
      let nodeContainer: HTMLElement | null = null;
      while (curr && curr !== document.body) {
        if (curr instanceof HTMLElement && curr.dataset.nodeId) {
          nodeContainer = curr;
          break;
        }
        curr = curr.parentNode;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Compute which occurrence index this selected text corresponds to in the node
      let computedOccur = 0;
      if (nodeContainer) {
        try {
          const preRange = document.createRange();
          preRange.selectNodeContents(nodeContainer);
          preRange.setEnd(range.startContainer, range.startOffset);
          const textBefore = preRange.toString();
          const needle = text.toLowerCase();
          let pos = 0;
          while ((pos = textBefore.toLowerCase().indexOf(needle, pos)) !== -1) {
            computedOccur++;
            pos += needle.length;
          }
        } catch {
          computedOccur = 0;
        }
      }

      setPosition(
        customPos || {
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        }
      );
      setSelectedText(text);
      setActiveNodeId(nodeContainer?.dataset.nodeId || 'node-0');
      setOccurrenceIndex(computedOccur);
    };

    const handleMouseUp = () => {
      processSelection();
    };

    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length >= 2) {
        e.preventDefault();
        processSelection({ x: e.clientX, y: e.clientY - 12 });
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isAddingNote]);

  if (!position) return null;

  const colors = [
    { name: 'yellow', bg: 'bg-amber-400', label: 'Yellow' },
    { name: 'emerald', bg: 'bg-emerald-400', label: 'Emerald' },
    { name: 'sky', bg: 'bg-sky-400', label: 'Sky' },
    { name: 'rose', bg: 'bg-rose-400', label: 'Rose' },
  ];

  const handleQuickHighlight = (color: string) => {
    if (activeNodeId) {
      onAddAnnotation(activeNodeId, selectedText, 'Highlighted snippet', color, occurrenceIndex);
      setPosition(null);
      setIsAddingNote(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSaveNote = () => {
    if (activeNodeId && noteContent.trim()) {
      onAddAnnotation(activeNodeId, selectedText, noteContent.trim(), chosenColor, occurrenceIndex);
      setPosition(null);
      setIsAddingNote(false);
      setNoteContent('');
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-xl rounded-xl p-1.5 flex flex-col gap-2 transition-all animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {!isAddingNote ? (
        <div className="flex items-center gap-1.5">
          {/* Color highlight buttons */}
          {colors.map((c) => (
            <button
              key={c.name}
              onClick={() => handleQuickHighlight(c.name)}
              className={`w-4 h-4 rounded-full ${c.bg} hover:scale-125 transition-transform shadow-sm`}
              title={`Highlight in ${c.label}`}
            />
          ))}

          <div className="w-[1px] h-3.5 bg-[var(--border-color)] mx-1" />

          {/* Add Note Button */}
          <button
            onClick={() => setIsAddingNote(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] transition-colors"
            title="Attach a sticky note to this selection"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-blue-500" />
            <span>Note</span>
          </button>

          <button
            onClick={() => setPosition(null)}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="w-64 p-1 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Add Note to Selection</span>
            <div className="flex gap-1">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setChosenColor(c.name)}
                  className={`w-3.5 h-3.5 rounded-full ${c.bg} ${
                    chosenColor === c.name ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                  }`}
                />
              ))}
            </div>
          </div>
          <textarea
            autoFocus
            rows={2}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your notes or insights..."
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => {
                setIsAddingNote(false);
                setPosition(null);
              }}
              className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNote}
              className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium shadow-sm"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
