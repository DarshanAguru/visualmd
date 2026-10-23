import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder } from '../../types';
import { PlusCircle, Sparkles, X, Check, AlertCircle, HelpCircle, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { validateVisualMD } from '@visualmd/compiler';

interface NewDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onCreated: (docId: string) => void;
}

const DEFAULT_BLANK_CONTENT = `# New Document Title

Write your notes, learning synthesis, or document content here in standard Markdown or with interactive VisualMD blocks.
`;

const SYNTAX_SNIPPETS = [
  {
    name: '$METRICS$',
    desc: 'Key stats / KPIs in cards',
    snippet: `$METRICS$S\nThroughput: 1.2M msg/s | P99 Latency: 2.1ms | Availability: 99.99%\n$METRICS$E\n`,
  },
  {
    name: '$CALLOUT$',
    desc: 'Highlighted callout card (tip, warning, insight, note)',
    snippet: `$CALLOUT$S?type=insight&title=Key+Takeaway\nAdd your important conceptual note or warning here.\n$CALLOUT$E\n`,
  },
  {
    name: '$STEPPER$',
    desc: 'Interactive step-by-step sequential workflow',
    snippet: `$STEPPER$S?title=Process+Flow\n$STEP@1?title=Step+One\nFirst phase description.\n$STEP@2?title=Step+Two\nSecond phase description.\n$STEPPER$E\n`,
  },
  {
    name: '$TABS$',
    desc: 'Multi-perspective tabbed view',
    snippet: `$TABS$S\n$TAB?title=Option+A\nDetails for option A.\n$TAB?title=Option+B\nDetails for option B.\n$TABS$E\n`,
  },
  {
    name: '$SNIPPET$',
    desc: 'Code or text snippet with syntax highlighter and copy button',
    snippet: `$SNIPPET$S?lang=json&title=Config+Example\n{\n  "version": "1.0",\n  "enabled": true\n}\n$SNIPPET$E\n`,
  },
  {
    name: '$QUIZ$',
    desc: 'Self-assessment question with feedback',
    snippet: `$QUIZ$S?q=Which+statement+is+correct?
[x] Correct answer choice.
[ ] Incorrect choice A.
[ ] Incorrect choice B.
$EXPLANATION
Here is why choice 1 is correct.
$QUIZ$E\n`,
  },
  {
    name: '$CANVAS$',
    desc: 'Interactive visual whiteboard or diagram canvas',
    snippet: `$CANVAS$S?mode=flowchart\n$CANVAS$E\n`,
  },
];

export const NewDocModal: React.FC<NewDocModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | null>(currentFolderId);
  const [content, setContent] = useState(DEFAULT_BLANK_CONTENT);
  const [validationResult, setValidationResult] = useState<{ checked: boolean; isValid: boolean; errors: string[] }>({
    checked: false,
    isValid: false,
    errors: [],
  });
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const validFolder = folders.find((f) => f.id === currentFolderId);
      setFolderId(validFolder ? validFolder.id : null);
      setTitle('');
      setContent(DEFAULT_BLANK_CONTENT);
      setValidationResult({ checked: false, isValid: false, errors: [] });
      setShowSyntaxGuide(false);
    }
  }, [isOpen, currentFolderId, folders]);

  if (!isOpen) return null;

  const handleValidate = () => {
    const res = validateVisualMD(content);
    setValidationResult({
      checked: true,
      isValid: res.isValid,
      errors: res.errors,
    });
  };

  const handleInsertSnippet = (snippet: string) => {
    setContent((prev) => prev.trimEnd() + '\n\n' + snippet);
    setValidationResult({ checked: false, isValid: false, errors: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          folder_id: folderId,
        }),
      });

      if (res.ok) {
        const doc = await res.json();
        onCreated(doc.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Create VisualMD Document</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Document Title (optional, auto-extracted if blank)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Consensus with Raft"
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Virtual Folder
              </label>
              <select
                value={folderId || ''}
                onChange={(e) => setFolderId(e.target.value || null)}
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
          </div>

          {/* Adherence Check & Syntax Guide Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidate}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Check Standard Adherence
              </button>

              {/* Live Adherence Badge */}
              {validationResult.checked && (
                validationResult.isValid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    ✓ Adheres to VisualMD Standard
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Notice ({validationResult.errors.length} suggestion{validationResult.errors.length > 1 ? 's' : ''})
                  </span>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSyntaxGuide(!showSyntaxGuide)}
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showSyntaxGuide ? 'Hide Syntax Guide' : 'VisualMD Syntax Guide'}</span>
              {showSyntaxGuide ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible VisualMD Pre-loaded Components Reference Guide */}
          {showSyntaxGuide && (
            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                <span className="font-semibold text-[var(--text-primary)]">Pre-loaded VisualMD Components:</span>
                <span className="text-[11px] text-[var(--text-muted)]">Click "+ Insert" to append snippet</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SYNTAX_SNIPPETS.map((item) => (
                  <div
                    key={item.name}
                    className="p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="font-mono font-bold text-[var(--accent)] text-[11px]">{item.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet(item.snippet)}
                      className="self-end px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-2.5 h-2.5" />
                      + Insert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Markdown Content Editor */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              VisualMD Markup
            </label>
            <textarea
              rows={12}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setValidationResult({ checked: false, isValid: false, errors: [] });
              }}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--text-primary)] font-mono leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
              placeholder="Paste or write VisualMD content..."
            />
          </div>

          {/* Validation Warnings Notice */}
          {validationResult.checked && validationResult.errors.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Standard Adherence Suggestions (VisualMD auto-healer will still render):</span>
              </div>
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="pl-5">• {err}</div>
              ))}
            </div>
          )}

          {/* Footer controls */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-1.5 text-xs font-semibold bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-40 rounded-lg shadow-xs transition-opacity"
            >
              {isSubmitting ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
