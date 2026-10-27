import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MindMapNode, MindMapItem } from '@visualmd/compiler';
import {
  Brain,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Info,
  X,
} from 'lucide-react';

interface MindMapViewProps {
  node: MindMapNode;
}

interface FlattenedNode {
  item: MindMapItem;
  depth: number;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
  hasChildren: boolean;
  isCollapsed: boolean;
}

export const MindMapView: React.FC<MindMapViewProps> = ({ node }) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<MindMapItem | null>(null);
  const [copiedConcept, setCopiedConcept] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleCopyConcept = () => {
    if (!selectedNode) return;
    const text = `${selectedNode.text}\n\n${selectedNode.summary || ''}\n\nBadge: ${selectedNode.badge || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedConcept(true);
    setTimeout(() => setCopiedConcept(false), 2000);
  };

  const toggleCollapse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const allIds = new Set<string>();
    const collect = (item: MindMapItem, depth: number) => {
      if (depth > 0 && item.children && item.children.length > 0) {
        allIds.add(item.id);
      }
      item.children?.forEach((c) => collect(c, depth + 1));
    };
    collect(node.root, 0);
    setCollapsedIds(allIds);
  };

  // Layout calculation: calculate horizontal tree coordinates with generous node spacing
  const CARD_WIDTH = 250;
  const LEVEL_WIDTH = 350;
  const ROW_HEIGHT = 86;

  const { nodes, maxX, maxY } = useMemo(() => {
    const flattened: FlattenedNode[] = [];
    let currentY = 40;

    function layoutSubtree(
      item: MindMapItem,
      depth: number,
      parentX?: number,
      parentY?: number
    ): number {
      const isCollapsed = collapsedIds.has(item.id);
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const x = 30 + depth * LEVEL_WIDTH;

      if (!hasChildren || isCollapsed) {
        const y = currentY;
        currentY += ROW_HEIGHT;
        flattened.push({
          item,
          depth,
          x,
          y,
          parentX,
          parentY,
          hasChildren,
          isCollapsed,
        });
        return y;
      }

      const childYs: number[] = [];
      const itemIndex = flattened.length;
      flattened.push({
        item,
        depth,
        x,
        y: 0,
        parentX,
        parentY,
        hasChildren,
        isCollapsed,
      });

      for (const child of item.children!) {
        const childY = layoutSubtree(child, depth + 1, x + CARD_WIDTH, 0);
        childYs.push(childY);
      }

      const computedY = (childYs[0] + childYs[childYs.length - 1]) / 2;
      flattened[itemIndex].y = computedY;

      // Update parentY for all children
      for (let i = itemIndex + 1; i < flattened.length; i++) {
        if (flattened[i].depth === depth + 1 && flattened[i].parentX === x + CARD_WIDTH) {
          flattened[i].parentY = computedY;
        }
      }

      return computedY;
    }

    layoutSubtree(node.root, 0);

    let maxLayoutX = 500;
    let maxLayoutY = currentY + 60;
    for (const f of flattened) {
      if (f.x + CARD_WIDTH + 60 > maxLayoutX) maxLayoutX = f.x + CARD_WIDTH + 60;
    }

    return { nodes: flattened, maxX: maxLayoutX, maxY: maxLayoutY };
  }, [node.root, collapsedIds]);

  // Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const canvasRef = useRef<HTMLDivElement>(null);

  const resetPanAndZoom = useCallback(() => {
    setZoomScale(1);
    setPanOffset({ x: 30, y: 30 });
  }, []);

  // Native non-passive wheel handler: Prevents browser-level page zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || e.altKey) {
        const delta = -e.deltaY * 0.003;
        setZoomScale((prev) => Math.min(2.5, Math.max(0.35, Number((prev + delta).toFixed(3)))));
      } else {
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX * 0.8,
          y: prev.y - e.deltaY * 0.8,
        }));
      }
    };

    canvas.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  // Keyboard navigation & zoom shortcuts when canvas is focused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoomScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomScale((prev) => Math.max(0.35, Number((prev - 0.15).toFixed(2))));
      } else if (e.key === '0') {
        e.preventDefault();
        resetPanAndZoom();
      }
    };

    canvas.addEventListener('keydown', handleKeyDown);
    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetPanAndZoom]);

  const handleCopyMarkdown = () => {
    function serialize(item: MindMapItem, indent: number): string {
      const prefix = '  '.repeat(indent);
      let res = `${prefix}- ${item.text}\n`;
      if (item.children) {
        for (const c of item.children) {
          res += serialize(c, indent + 1);
        }
      }
      return res;
    }
    const md = `$MINDMAP$S?title=${encodeURIComponent(node.title || 'Mind Map')}\n${serialize(
      node.root,
      0
    )}$MINDMAP$E`;
    navigator.clipboard.writeText(md).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const depthColors = [
    { bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40', stroke: '#3b82f6' },
    { bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40', stroke: '#10b981' },
    { bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40', stroke: '#a855f7' },
    { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40', stroke: '#f59e0b' },
    { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40', stroke: '#f43f5e' },
  ];

  return (
    <div
      data-no-annotation
      data-mindmap-canvas
      className={`my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-4 z-[90] flex flex-col shadow-2xl bg-[var(--bg-card)]' : ''
      }`}
    >
      {/* MindMap Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <Brain className="w-4 h-4 text-purple-500 shrink-0" />
          <h4
            className="font-semibold text-[var(--text-primary)] truncate"
            style={{ fontSize: 'calc(0.9375rem * var(--vmd-font-scale, 1))' }}
          >
            {node.title || 'Interactive Mind Map'}
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] shrink-0 hidden sm:inline">
            {nodes.length} nodes
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setZoomScale((s) => Math.max(0.35, Number((s - 0.15).toFixed(2))))}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Zoom Out (Key: -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-[var(--text-muted)] min-w-[36px] text-center select-none">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Zoom In (Key: +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetPanAndZoom}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Reset Pan & Zoom (Key: 0)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-[var(--border-color)] mx-1" />
          <button
            onClick={expandAll}
            className="px-2 py-0.5 text-[11px] rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium transition-colors"
            title="Expand all branches"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-0.5 text-[11px] rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-medium transition-colors"
            title="Collapse sub-branches"
          >
            Collapse
          </button>
          <div className="w-[1px] h-3.5 bg-[var(--border-color)] mx-1" />
          <button
            onClick={handleCopyMarkdown}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy Mind Map Markdown"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mind Map'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* SVG Canvas Area with Click-and-Drag Pan, Zoom, and Canvas Pattern */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        tabIndex={0}
        className={`w-full overflow-hidden p-4 select-none relative bg-[var(--bg-card)] outline-none focus:ring-1 focus:ring-blue-500/30 ${
          isFullscreen ? 'flex-1' : 'h-[460px]'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--border-color) 1.2px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: '0 0',
            width: `${maxX + 100}px`,
            height: `${maxY + 100}px`,
            position: 'absolute',
            top: 0,
            left: 0,
            transition: isDragging ? 'none' : 'transform 75ms ease-out',
          }}
        >
          {/* SVG Connector Bezier Curves */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={maxX + 100}
            height={maxY + 100}
            style={{ overflow: 'visible' }}
          >
            {nodes.map((n) => {
              if (n.parentX === undefined || n.parentY === undefined) return null;
              const x1 = n.parentX;
              const y1 = n.parentY;
              const x2 = n.x;
              const y2 = n.y;
              const dx = (x2 - x1) * 0.55;
              const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const strokeColor = depthColors[Math.min(n.depth, depthColors.length - 1)].stroke;

              return (
                <path
                  key={`edge-${n.item.id}`}
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeOpacity="0.45"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Interactive HTML MindMap Nodes */}
          {nodes.map((n) => {
            const colorCfg = depthColors[Math.min(n.depth, depthColors.length - 1)];
            const isRoot = n.depth === 0;
            const isSelected = selectedNode?.id === n.item.id;

            return (
              <div
                key={n.item.id}
                onClick={() => {
                  setSelectedNode(n.item);
                }}
                style={{
                  left: `${n.x}px`,
                  top: `${n.y}px`,
                  transform: 'translateY(-50%)',
                  width: `${CARD_WIDTH}px`,
                }}
                className={`absolute z-10 flex flex-col justify-between px-3 py-2 rounded-xl border text-xs shadow-xs transition-all duration-200 cursor-pointer ${
                  colorCfg.bg
                } ${
                  isSelected
                    ? 'ring-2 ring-purple-500 scale-[1.03] shadow-md z-30'
                    : 'hover:scale-[1.02] hover:shadow-sm'
                } ${isRoot ? 'font-bold ring-2 ring-blue-500/20 py-2.5' : 'font-medium'}`}
              >
                {/* Node Top Row: Text, Badge & Expand/Collapse */}
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="font-semibold truncate text-[var(--text-primary)]">
                    {n.item.text}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {n.item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                        {n.item.badge}
                      </span>
                    )}
                    {n.hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(n.item.id, e);
                        }}
                        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                        title={n.isCollapsed ? 'Expand branch' : 'Collapse branch'}
                      >
                        {n.isCollapsed ? (
                          <span className="flex items-center text-[10px] font-mono px-1 rounded bg-black/10 dark:bg-white/10">
                            +{n.item.children?.length}
                          </span>
                        ) : (
                          <ChevronDown className="w-3 h-3 opacity-70" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Node Summary Preview */}
                {n.item.summary && (
                  <div className="text-[10px] text-[var(--text-muted)] line-clamp-1 leading-snug font-normal mt-1 select-none">
                    {n.item.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating In-Widget Concept Inspector Drawer */}
        {selectedNode && (
          <div
            data-no-annotation
            className="absolute top-3 right-3 bottom-3 w-80 max-w-[calc(100%-24px)] z-30 flex flex-col bg-[var(--bg-card)]/95 backdrop-blur-md rounded-2xl border border-[var(--border-color)] shadow-2xl animate-in slide-in-from-right-4 duration-200 overflow-hidden"
          >
            {/* Inspector Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/70">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Concept Inspector
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-bold uppercase tracking-wider">
                    {selectedNode.badge || selectedNode.type || 'Concept'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                  {selectedNode.text}
                </h4>
              </div>

              {/* Summary / Takeaway */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Summary & Key Takeaway
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] leading-relaxed select-text">
                  {selectedNode.summary ||
                    (selectedNode.children && selectedNode.children.length > 0
                      ? `Section covering ${selectedNode.children.length} sub-topics across this document branch.`
                      : `Key concept in "${selectedNode.text}". Explore its relationship with parent and sibling nodes.`)}
                </div>
              </div>

              {/* Child Sub-Branches */}
              {selectedNode.children && selectedNode.children.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                    <span>Sub-Branches ({selectedNode.children.length})</span>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(selectedNode.id)}
                      className="text-purple-500 hover:underline cursor-pointer"
                    >
                      {collapsedIds.has(selectedNode.id) ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {selectedNode.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedNode(child)}
                        className="w-full text-left p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[11px] text-[var(--text-primary)] flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <span className="truncate">{child.text}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopyConcept}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {copiedConcept ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Concept</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Floating Pan Hint */}
        <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] shadow-xs select-none pointer-events-none">
          <Move className="w-3 h-3 text-purple-500" />
          <span>Click & drag canvas to explore</span>
        </div>
      </div>
    </div>
  );
};
