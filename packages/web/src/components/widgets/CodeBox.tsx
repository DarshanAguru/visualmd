import React, { useState } from 'react';
import { SnippetNode } from '@visualmd/compiler';
import { Copy, Check, FileCode } from 'lucide-react';

interface CodeBoxProps {
  node: SnippetNode;
}

export const CodeBox: React.FC<CodeBoxProps> = ({ node }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = node.code.split('\n');

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--code-bg)] text-[var(--code-text)] shadow-xs transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--code-header)] border-b border-[var(--border-color)] text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-semibold text-[var(--text-primary)]">{node.title || `${node.lang} snippet`}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] font-semibold uppercase tracking-wider">
            {node.lang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors text-xs font-sans"
          title="Copy code"
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
      </div>

      {/* Code body with line numbers */}
      <div
        className="p-4 overflow-x-auto overflow-y-auto max-h-[380px] leading-relaxed font-mono"
        style={{ fontSize: 'calc(0.8125rem * var(--vmd-font-scale, 1))' }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isDiffAdd = node.diff && line.startsWith('+');
              const isDiffDel = node.diff && line.startsWith('-');

              return (
                <tr
                  key={idx}
                  className={`${
                    isDiffAdd
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isDiffDel
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <td className="w-10 pr-4 text-right select-none text-[var(--text-muted)] opacity-50 font-mono text-xs align-top">
                    {lineNum}
                  </td>
                  <td className="whitespace-pre font-mono text-[var(--code-text)]">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
