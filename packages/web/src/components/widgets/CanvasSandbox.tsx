import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode } from '@visualmd/compiler';
import { RefreshCw, Play, ShieldAlert, Cpu } from 'lucide-react';

interface CanvasSandboxProps {
  node: CanvasNode;
}

export const CanvasSandbox: React.FC<CanvasSandboxProps> = ({ node }) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const height = node.height || 320;

  // Construct secure sandboxed HTML
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; connect-src 'none';">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 8px;
            background: #090d16;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: auto;
          }
        </style>
      </head>
      <body>
        ${node.code}
      </body>
    </html>
  `;

  return (
    <div className="my-6 rounded-2xl border border-indigo-500/30 bg-slate-950 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-950 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">
            {node.title || 'Interactive Canvas Simulation'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-900/50 text-indigo-300 font-mono border border-indigo-500/30 uppercase">
            {node.engine} sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setHasError(false);
              setReloadKey((prev) => prev + 1);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium"
            title="Restart simulation"
          >
            <RefreshCw className="w-3 h-3 text-indigo-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Sandboxed iframe container */}
      <div className="relative bg-slate-950 p-1" style={{ height: `${height}px` }}>
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-rose-400 text-xs gap-2 z-10">
            <ShieldAlert className="w-4 h-4" />
            <span>Execution halted by sandbox security guard</span>
          </div>
        )}
        <iframe
          key={reloadKey}
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          className="w-full h-full border-0 rounded-lg"
          onError={() => setHasError(true)}
          title={node.title || 'Canvas Sandbox'}
        />
      </div>
    </div>
  );
};
