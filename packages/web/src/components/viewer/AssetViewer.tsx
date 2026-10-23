import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceAsset } from '../../types';
import {
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Copy,
  Check,
  X,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  PanelLeftClose,
  PanelLeft,
  Folder,
} from 'lucide-react';

interface AssetViewerProps {
  asset: WorkspaceAsset;
  onClose: () => void;
  onDelete?: (asset: WorkspaceAsset) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const AssetViewer: React.FC<AssetViewerProps> = ({
  asset,
  onClose,
  onDelete,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isFitToScreen, setIsFitToScreen] = useState<boolean>(true);

  // Reset zoom and dimensions when asset changes
  useEffect(() => {
    setZoomLevel(1);
    setIsFitToScreen(true);
    setImgDimensions(null);
    setCopied(false);
  }, [asset.relativePath]);

  const assetUrl = `/api/assets/${encodeURI(asset.relativePath)}`;

  const handleCopyTag = () => {
    const snippet = asset.isImage
      ? `![${asset.name}](./${asset.relativePath})`
      : `[${asset.name}](./${asset.relativePath})`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Header Toolbar */}
      <div className="h-14 px-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between shrink-0 select-none z-10">
        {/* Left: Sidebar Toggle & File Identification */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            {asset.isPdf ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                <FileText className="w-3 h-3" />
                <span>PDF</span>
              </span>
            ) : asset.isImage ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-500 border border-purple-500/30 shrink-0">
                <ImageIcon className="w-3 h-3" />
                <span>IMAGE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-500 border border-blue-500/30 shrink-0">
                <FileText className="w-3 h-3" />
                <span>RESOURCE</span>
              </span>
            )}

            <h1 className="text-sm font-semibold truncate max-w-xs sm:max-w-md" title={asset.name}>
              {asset.name}
            </h1>

            {/* Folder badge */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-md border border-[var(--border-color)] truncate">
              <Folder className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">
                {asset.folderName ? `${asset.folderName} / assets` : 'assets'}
              </span>
            </div>

            <span className="hidden sm:inline-block text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              {formatFileSize(asset.size)}
            </span>

            {imgDimensions && (
              <span className="hidden lg:inline-block text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                {imgDimensions.width} × {imgDimensions.height}px
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Copy Tag, Zoom, Download, Open External, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Copy Markdown Tag */}
          <button
            onClick={handleCopyTag}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-semibold'
                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)]'
            }`}
            title="Copy Markdown tag to embed into any document"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied Tag!' : 'Copy Tag'}</span>
          </button>

          {/* Image-only Zoom Controls */}
          {asset.isImage && (
            <div className="hidden sm:flex items-center gap-0.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-0.5">
              <button
                onClick={() => {
                  setIsFitToScreen(false);
                  setZoomLevel((prev) => Math.max(0.25, prev - 0.25));
                }}
                className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsFitToScreen(false);
                  setZoomLevel(1);
                }}
                className="px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Reset to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                onClick={() => {
                  setIsFitToScreen(false);
                  setZoomLevel((prev) => Math.min(4, prev + 0.25));
                }}
                className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsFitToScreen((prev) => !prev);
                  setZoomLevel(1);
                }}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isFitToScreen
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Fit to Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Download */}
          <a
            href={assetUrl}
            download={asset.name}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors cursor-pointer"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {/* Open in new tab */}
          <a
            href={assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors cursor-pointer"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Delete Asset */}
          {onDelete && (
            <button
              onClick={() => onDelete(asset)}
              className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 border border-[var(--border-color)] hover:border-rose-500/30 transition-colors cursor-pointer"
              title="Delete resource"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close / Return to Notes */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--text-muted)] border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer ml-1"
            title="Close resource viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        {asset.isPdf ? (
          /* Native Embedded PDF Reader with toolbar and page navigation */
          <div className="w-full h-full flex flex-col p-2 sm:p-4">
            <iframe
              src={`${assetUrl}#toolbar=1&navpanes=1`}
              title={asset.name}
              className="w-full h-full flex-1 rounded-xl border border-[var(--border-color)] bg-white shadow-md"
            />
          </div>
        ) : asset.isImage ? (
          /* Interactive High-Res Image Canvas */
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4 sm:p-8 select-none">
            <div
              className="relative inline-block transition-transform duration-100 ease-out shadow-2xl rounded-xl border border-[var(--border-color)]/80 overflow-hidden bg-[var(--bg-card)]"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={assetUrl}
                alt={asset.name}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setImgDimensions({ width: target.naturalWidth, height: target.naturalHeight });
                }}
                className={`max-w-full object-contain ${
                  isFitToScreen ? 'max-h-[calc(100vh-140px)] w-auto' : ''
                }`}
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
        ) : (
          /* Generic Resource Card */
          <div className="p-8 max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{asset.name}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                {asset.relativePath} ({formatFileSize(asset.size)})
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <a
                href={assetUrl}
                download={asset.name}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
              <a
                href={assetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-medium transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open File</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
