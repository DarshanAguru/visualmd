import React, { useState } from 'react';
import { SnippetNode } from '@visualmd/compiler';
import { Copy, Check, FileCode, Play, ShieldCheck, Loader2, X } from 'lucide-react';

interface CodeBoxProps {
  node: SnippetNode;
}

interface SandboxResult {
  success: boolean;
  result?: any;
  output: string[];
  error?: string;
  durationMs: number;
}

function parseHighlightLines(highlight?: string): Set<number> {
  const result = new Set<number>();
  if (!highlight) return result;
  const parts = highlight.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          result.add(i);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) result.add(num);
    }
  }
  return result;
}

export const CodeBox: React.FC<CodeBoxProps> = React.memo(({ node }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);
  const highlightedLines = parseHighlightLines(node.highlight);

  const cleanLang = (node.lang || 'text').toLowerCase();
  const isRunnable = ['js', 'javascript', 'ts', 'typescript', 'node'].includes(cleanLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSandbox = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/sandbox/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: node.code, timeoutMs: 2500 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSandboxResult({
          success: false,
          output: [],
          error: errData.error || `HTTP ${res.status}: Failed to execute in sandbox`,
          durationMs: 0,
        });
      }
    } catch (err: any) {
      setSandboxResult({
        success: false,
        output: [],
        error: `Sandbox connection error: ${err.message || 'Server unavailable'}`,
        durationMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
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

        <div className="flex items-center gap-2">
          {isRunnable && (
            <button
              onClick={handleRunSandbox}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors text-xs font-sans font-medium cursor-pointer disabled:opacity-50"
              title="Run code in zero-permission isolated sandbox"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                  <span>Run Sandbox</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors text-xs font-sans cursor-pointer"
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
              const isHighlighted = highlightedLines.has(lineNum);

              return (
                <tr
                  key={idx}
                  className={`${
                    isDiffAdd
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isDiffDel
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : isHighlighted
                      ? 'bg-blue-500/15 border-l-2 border-blue-500 font-medium'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <td
                    className={`w-10 pr-4 text-right select-none font-mono text-xs align-top ${
                      isHighlighted
                        ? 'text-blue-500 font-bold opacity-100'
                        : 'text-[var(--text-muted)] opacity-50'
                    }`}
                  >
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

      {/* Interactive Sandboxed Output Console */}
      {sandboxResult && (
        <div className="border-t border-[var(--border-color)] bg-slate-950 text-slate-200 text-xs font-mono p-3">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800 select-none">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300">Sandbox Output</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                {sandboxResult.durationMs}ms
              </span>
              {sandboxResult.success ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                  ✓ Exited Cleanly (0 Host Access)
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950/70 text-rose-400 border border-rose-800/60">
                  ⚠ Execution Halted
                </span>
              )}
            </div>
            <button
              onClick={() => setSandboxResult(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
              title="Close output console"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {sandboxResult.output.length > 0 && (
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 max-h-48 overflow-y-auto mb-2 font-mono text-[11px] bg-slate-900/60 p-2.5 rounded border border-slate-800">
              {sandboxResult.output.join('\n')}
            </pre>
          )}

          {sandboxResult.error && (
            <div className="text-rose-400 bg-rose-950/50 p-2.5 rounded border border-rose-800/50 leading-relaxed font-mono text-[11px]">
              {sandboxResult.error}
            </div>
          )}

          {sandboxResult.output.length === 0 && !sandboxResult.error && (
            <div className="text-slate-500 italic text-[11px] py-1">
              Code executed with no output logged.
            </div>
          )}
        </div>
      )}
    </div>
  );
});
