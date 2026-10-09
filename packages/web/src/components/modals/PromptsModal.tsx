import React, { useState, useEffect } from 'react';
import { Bot, Copy, Check, Download, Sparkles, X } from 'lucide-react';

interface PromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PromptTab = 'system-prompt' | 'skill' | 'standard';

export const PromptsModal: React.FC<PromptsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<PromptTab>('system-prompt');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setCopied(false);

    fetch(`/api/prompts/${activeTab}`)
      .then((res) => (res.ok ? res.text() : 'Failed to load prompt.'))
      .then((text) => setContent(text))
      .catch(() => setContent('Error fetching prompt content.'))
      .finally(() => setLoading(false));
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.open(`/api/prompts/${activeTab}?download=true`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>AI Prompts & Agent Skills</span>
                <span className="text-[10px] bg-[var(--accent-surface)] text-[var(--accent)] font-mono px-1.5 py-0.2 rounded border border-[var(--border-color)]">
                  Ready to Use
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Files from <code className="font-mono">prompts/</code> directory ready for ChatGPT, Claude, Gemini, or Cursor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center justify-between px-5 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('system-prompt')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'system-prompt'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              1. System Prompt
            </button>
            <button
              onClick={() => setActiveTab('skill')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'skill'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              2. Agent Skill (skill.md)
            </button>
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'standard'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              3. Full Standard (VisualMDStandard.md)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-[var(--code-bg)] font-mono text-xs leading-relaxed text-[var(--code-text)]">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Loading prompt template...</div>
          ) : (
            <pre className="whitespace-pre-wrap select-text">{content}</pre>
          )}
        </div>

        {/* Footer Usage Instruction */}
        <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {activeTab === 'system-prompt' && 'Paste into ChatGPT Custom Instructions or Claude System Prompt.'}
              {activeTab === 'skill' && 'Drop into your agent framework skills directory (Antigravity, Cursor, Claude).'}
              {activeTab === 'standard' && 'Attach or upload to any LLM session for complete architectural adherence.'}
            </span>
          </div>
          <span className="opacity-75">Directory: prompts/</span>
        </div>
      </div>
    </div>
  );
};
