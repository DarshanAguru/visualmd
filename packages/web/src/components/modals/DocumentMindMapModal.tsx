import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { VmdDocument, buildDocumentMindMap, MindMapItem, MindMapItemType, MindMapNode } from '@visualmd/compiler';
import {
  Brain,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Move,
  Maximize2,
  Copy,
  Check,
  BookOpen,
  Info,
  CheckCircle2,
  HelpCircle,
  Gauge,
  Lightbulb,
  FileText,
  Sparkles,
  Layers,
  Upload,
} from 'lucide-react';

interface DocumentMindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VmdDocument;
  onJumpToHeading?: (headingText: string) => void;
  onOpenHistoryUpload?: () => void;
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

export const DocumentMindMapModal: React.FC<DocumentMindMapModalProps> = ({
  isOpen,
  onClose,
  document: vmdDoc,
  onJumpToHeading,
  onOpenHistoryUpload,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<MindMapItem | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);

  // Check if document has an embedded custom MindMap block
  const embeddedCustomMindMap = useMemo(() => {
    const mmNode = vmdDoc.nodes?.find((n) => n.type === 'mindmap') as MindMapNode | undefined;
    return mmNode ? mmNode.root : null;
  }, [vmdDoc.nodes]);

  const [activeViewMode, setActiveViewMode] = useState<'auto' | 'custom'>(() => {
    return embeddedCustomMindMap ? 'custom' : 'auto';
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const autoMindMapRoot = useMemo(() => {
    return buildDocumentMindMap(vmdDoc);
  }, [vmdDoc]);

  const activeMindMapRoot = useMemo(() => {
    if (activeViewMode === 'custom' && embeddedCustomMindMap) {
      return embeddedCustomMindMap;
    }
    return autoMindMapRoot;
  }, [activeViewMode, embeddedCustomMindMap, autoMindMapRoot]);

  // Reset viewport when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoomScale(1);
      setPanOffset({ x: 80, y: 80 });
      setSelectedNode(null);
      if (embeddedCustomMindMap) {
        setActiveViewMode('custom');
      } else {
        setActiveViewMode('auto');
      }
    }
  }, [isOpen, vmdDoc.title, embeddedCustomMindMap]);

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
    collect(activeMindMapRoot, 0);
    setCollapsedIds(allIds);
  };

  const handleCopyAiPrompt = () => {
    const headings = vmdDoc.nodes
      .filter((n) => n.type === 'markdown')
      .map((n) => (n as any).content.match(/^#{1,4}\s+.*$/gm) || [])
      .flat()
      .slice(0, 15)
      .join('\n');
    const prompt = `Please create a comprehensive, multi-level hierarchical Mind Map for the topic: "${vmdDoc.title}".
Format the output as a clean VisualMD $MINDMAP$ block:

$MINDMAP$S
- ${vmdDoc.title}
  - Pillar 1
    - Core Concept A
    - Key Takeaway
  - Pillar 2
    - Concept B
$MINDMAP$E

Here are existing outline headings from the document for guidance:
${headings || '(None provided)'}
`;
    navigator.clipboard.writeText(prompt);
    setCopiedAiPrompt(true);
    setTimeout(() => setCopiedAiPrompt(false), 2000);
  };

  // Generous Layout calculation to completely prevent card overlap
  // CARD_WIDTH: 260px
  // LEVEL_WIDTH: 380px gives 120px clear horizontal curve span
  // ROW_HEIGHT: 114px gives 35-50px vertical clearance between cards
  const CARD_WIDTH = 260;
  const LEVEL_WIDTH = 380;
  const ROW_HEIGHT = 114;

  const { nodes, maxX, maxY } = useMemo(() => {
    const flattened: FlattenedNode[] = [];
    let currentY = 70;

    function layoutSubtree(
      item: MindMapItem,
      depth: number,
      parentX?: number,
      parentY?: number
    ): number {
      const isCollapsed = collapsedIds.has(item.id);
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const x = 60 + depth * LEVEL_WIDTH;

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

      // Update parentY for all direct children
      for (let i = itemIndex + 1; i < flattened.length; i++) {
        if (flattened[i].depth === depth + 1 && flattened[i].parentX === x + CARD_WIDTH) {
          flattened[i].parentY = computedY;
        }
      }

      return computedY;
    }

    layoutSubtree(activeMindMapRoot, 0);

    let maxLayoutX = 900;
    let maxLayoutY = currentY + 140;
    for (const f of flattened) {
      if (f.x + CARD_WIDTH + 80 > maxLayoutX) maxLayoutX = f.x + CARD_WIDTH + 80;
    }

    return { nodes: flattened, maxX: maxLayoutX, maxY: maxLayoutY };
  }, [activeMindMapRoot, collapsedIds]);

  // Interactive Pan / Drag handlers
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

  const fitToView = useCallback(() => {
    setZoomScale(0.85);
    setPanOffset({ x: 80, y: 80 });
  }, []);

  // Native non-passive wheel handler: Prevents browser-level page zoom and delivers smooth pan/zoom
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const onNativeWheel = (e: WheelEvent) => {
      // Crucial: Stop browser page from zooming or scrolling
      e.preventDefault();

      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Trackpad pinch-to-zoom or Ctrl/Alt+Wheel
        const delta = -e.deltaY * 0.003;
        setZoomScale((prev) => Math.min(3.0, Math.max(0.25, Number((prev + delta).toFixed(3)))));
      } else {
        // Smooth canvas panning
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX * 0.9,
          y: prev.y - e.deltaY * 0.9,
        }));
      }
    };

    container.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onNativeWheel);
    };
  }, [isOpen]);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in a search input
      const targetTag = (document.activeElement?.tagName || '').toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        setZoomScale((s) => Math.min(3.0, Number((s + 0.15).toFixed(2))));
      } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        setZoomScale((s) => Math.max(0.25, Number((s - 0.15).toFixed(2))));
      } else if (e.key === '0' || e.code === 'Numpad0') {
        e.preventDefault();
        setZoomScale(1.0);
      } else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fitToView();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedNode) {
          setSelectedNode(null);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        setPanOffset((prev) => ({ ...prev, x: prev.x + 60 }));
      } else if (e.key === 'ArrowRight') {
        setPanOffset((prev) => ({ ...prev, x: prev.x - 60 }));
      } else if (e.key === 'ArrowUp') {
        setPanOffset((prev) => ({ ...prev, y: prev.y + 60 }));
      } else if (e.key === 'ArrowDown') {
        setPanOffset((prev) => ({ ...prev, y: prev.y - 60 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedNode, onClose, fitToView]);

  const handleCopyConcept = () => {
    if (!selectedNode) return;
    const text = `${selectedNode.text}\n\n${selectedNode.summary || ''}\n\nBadge: ${selectedNode.badge || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // High contrast category styles optimized for solid black background
  const getTypeConfig = (type?: MindMapItemType) => {
    switch (type) {
      case 'root':
        return {
          icon: Brain,
          badgeBg: 'bg-blue-950/80 text-blue-400 border-blue-500/50',
          boxBg: 'bg-[#0f172a] border-blue-500/50',
          stroke: '#3b82f6',
          label: 'Root Subject',
        };
      case 'heading':
        return {
          icon: BookOpen,
          badgeBg: 'bg-indigo-950/80 text-indigo-400 border-indigo-500/50',
          boxBg: 'bg-[#181825] border-indigo-500/40',
          stroke: '#6366f1',
          label: 'Section Heading',
        };
      case 'step':
        return {
          icon: CheckCircle2,
          badgeBg: 'bg-purple-950/80 text-purple-400 border-purple-500/50',
          boxBg: 'bg-[#1e132c] border-purple-500/40',
          stroke: '#a855f7',
          label: 'Workflow Step',
        };
      case 'quiz':
        return {
          icon: HelpCircle,
          badgeBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50',
          boxBg: 'bg-[#062419] border-emerald-500/40',
          stroke: '#10b981',
          label: 'Active Recall',
        };
      case 'metric':
        return {
          icon: Gauge,
          badgeBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50',
          boxBg: 'bg-[#062419] border-emerald-500/40',
          stroke: '#10b981',
          label: 'Metric / KPI',
        };
      case 'callout':
        return {
          icon: Info,
          badgeBg: 'bg-amber-950/80 text-amber-400 border-amber-500/50',
          boxBg: 'bg-[#261806] border-amber-500/40',
          stroke: '#f59e0b',
          label: 'Critical Note',
        };
      case 'concept':
      default:
        return {
          icon: Lightbulb,
          badgeBg: 'bg-sky-950/80 text-sky-400 border-sky-500/50',
          boxBg: 'bg-[#111827] border-sky-500/30',
          stroke: '#0ea5e9',
          label: 'Core Concept',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-no-annotation
      data-mindmap-canvas
      className="mindmap-modal fixed inset-0 z-[100] flex flex-col bg-[#000000] text-zinc-100 animate-in fade-in duration-150 select-none"
    >
      {/* Top Header - Solid Obsidian Dark */}
      <header className="h-14 border-b border-[#27272a] px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#09090b] z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 truncate">
                {vmdDoc.title || 'Document Mind Map'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 shrink-0 hidden sm:inline">
                {nodes.length} nodes
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 truncate hidden sm:block">
              Click & drag canvas to explore • Scroll to zoom • Select node for deep learning inspector
            </div>
          </div>
        </div>

        {/* View Switcher: Auto-Generated Graph vs Custom Curated Mind Map */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveViewMode('auto')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeViewMode === 'auto'
                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Auto-generated knowledge graph from document outline & widgets"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Auto Knowledge Graph</span>
          </button>

          {embeddedCustomMindMap ? (
            <button
              onClick={() => setActiveViewMode('custom')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeViewMode === 'custom'
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Curated dedicated mind map uploaded or embedded in document"
            >
              <Brain className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">Curated Mind Map</span>
            </button>
          ) : onOpenHistoryUpload ? (
            <button
              onClick={() => {
                onClose();
                onOpenHistoryUpload();
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-zinc-800/80 transition-colors"
              title="Upload a dedicated mind map version to this document"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Upload Custom Map</span>
            </button>
          ) : null}
        </div>

        {/* Search Filter */}
        <div className="hidden xl:flex items-center gap-2 relative max-w-xs w-full mx-2">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, metrics..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Zoom & Window Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoomScale((s) => Math.max(0.35, s - 0.15))}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-zinc-400 select-none min-w-[38px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((s) => Math.min(2.5, s + 0.15))}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToView}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Fit to Screen (Recenter)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={expandAll}
            className="hidden sm:inline-flex px-2 py-1 text-xs rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors"
            title="Expand all branches"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="hidden sm:inline-flex px-2 py-1 text-xs rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors"
            title="Collapse branches"
          >
            Collapse
          </button>
          <button
            onClick={handleCopyAiPrompt}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-medium transition-colors cursor-pointer"
            title="Copy an AI prompt to generate or enhance this mind map hierarchy"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{copiedAiPrompt ? 'Prompt Copied!' : 'AI Prompt'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Close Mind Map (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Solid Black Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex min-w-0 bg-[#000000]">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className={`flex-1 w-full h-full relative overflow-hidden bg-[#000000] ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1.2px, #000000 0)',
            backgroundSize: '28px 28px',
          }}
        >
          {/* Pan & Zoom Transformed Container */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
              transformOrigin: '0 0',
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${maxX + 240}px`,
              height: `${maxY + 240}px`,
              transition: isDragging ? 'none' : 'transform 75ms ease-out',
            }}
          >
            {/* SVG Connector Bezier Curves */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={maxX + 240}
              height={maxY + 240}
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
                const cfg = getTypeConfig(n.item.type);

                return (
                  <path
                    key={`edge-${n.item.id}`}
                    d={pathData}
                    fill="none"
                    stroke={cfg.stroke}
                    strokeWidth="2.5"
                    strokeOpacity="0.55"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Interactive HTML MindMap Nodes - Guaranteed generous gaps to prevent overlap */}
            {nodes.map((n) => {
              const cfg = getTypeConfig(n.item.type);
              const isRoot = n.depth === 0;
              const isSelected = selectedNode?.id === n.item.id;
              const Icon = cfg.icon;

              const isMatched =
                searchQuery.trim().length > 0 &&
                (n.item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (n.item.summary && n.item.summary.toLowerCase().includes(searchQuery.toLowerCase())));

              return (
                <div
                  key={n.item.id}
                  style={{
                    left: `${n.x}px`,
                    top: `${n.y}px`,
                    transform: 'translateY(-50%)',
                  }}
                  className="absolute z-10"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(n.item);
                    }}
                    style={{
                      width: `${CARD_WIDTH}px`,
                    }}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border shadow-lg transition-all duration-150 cursor-pointer ${
                      cfg.boxBg
                    } ${
                      isSelected
                        ? 'ring-2 ring-purple-400 shadow-2xl scale-105 border-purple-400'
                        : isMatched
                        ? 'ring-2 ring-purple-500 shadow-xl scale-105 border-purple-500'
                        : 'hover:scale-[1.03] active:scale-95 hover:shadow-xl'
                    } ${isRoot ? 'ring-2 ring-blue-500/60 shadow-xl py-3.5' : ''}`}
                  >
                    {/* Node Header Pill: Icon + Badge + Collapse Button */}
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${cfg.badgeBg} truncate`}>
                          {n.item.badge || cfg.label}
                        </span>
                      </div>

                      {n.hasChildren && (
                        <button
                          onClick={(e) => toggleCollapse(n.item.id, e)}
                          className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
                          title={n.isCollapsed ? 'Expand branch' : 'Collapse branch'}
                        >
                          {n.isCollapsed ? (
                            <span className="flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40">
                              +{n.item.children?.length}
                            </span>
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Node Title */}
                    <div className={`text-xs text-zinc-100 font-semibold truncate ${isRoot ? 'text-sm font-bold text-white' : ''}`}>
                      {n.item.text}
                    </div>

                    {/* Summary Snippet Preview if present */}
                    {n.item.summary && (
                      <div className="text-[10px] text-zinc-400 line-clamp-1 leading-snug font-normal">
                        {n.item.summary}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Canvas Navigation Hint */}
          <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 shadow-xl select-none pointer-events-none">
            <Move className="w-3.5 h-3.5 text-purple-400" />
            <span>Drag canvas to pan • Keys: <kbd className="font-mono text-zinc-200">+/-</kbd> to zoom, <kbd className="font-mono text-zinc-200">0</kbd> reset, <kbd className="font-mono text-zinc-200">F</kbd> fit</span>
          </div>

          {/* Dedicated Floating Zoom & Fit Toolbar */}
          <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl text-xs select-none">
            <button
              onClick={() => setZoomScale((s) => Math.max(0.25, Number((s - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out (Key: -)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomScale(1.0)}
              className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] font-semibold transition-colors cursor-pointer"
              title="Reset Zoom to 100% (Key: 0)"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={() => setZoomScale((s) => Math.min(3.0, Number((s + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In (Key: +)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />
            <button
              onClick={fitToView}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Fit to Screen (Key: F / R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fit</span>
            </button>
          </div>
        </div>

        {/* Selected Concept Inspector Drawer */}
        {selectedNode && (
          <aside
            data-no-annotation
            className="w-80 md:w-96 border-l border-zinc-800 bg-[#09090b] flex flex-col z-30 shadow-2xl animate-in slide-in-from-right-4 duration-150 shrink-0"
          >
            {/* Inspector Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Concept Inspector
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Type Badge & Label */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                    getTypeConfig(selectedNode.type).badgeBg
                  }`}
                >
                  {selectedNode.badge || getTypeConfig(selectedNode.type).label}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {selectedNode.type ? selectedNode.type.toUpperCase() : 'CONCEPT'}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-zinc-100 leading-snug">
                {selectedNode.text}
              </h3>

              {/* Full Summary / Key Takeaway */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Summary & Takeaway
                </div>
                <div className="text-xs leading-relaxed text-zinc-300 bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl whitespace-pre-wrap select-text">
                  {selectedNode.summary ||
                    (selectedNode.children && selectedNode.children.length > 0
                      ? `Section covering ${selectedNode.children.length} sub-topics across this document branch.`
                      : `Key concept in "${selectedNode.text}". Explore its connections with parent and sibling nodes.`)}
                </div>
              </div>

              {/* Sub-branches / Child Concepts */}
              {selectedNode.children && selectedNode.children.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Sub-Branches ({selectedNode.children.length})</span>
                    <button
                      onClick={() => toggleCollapse(selectedNode.id)}
                      className="text-purple-400 hover:underline cursor-pointer"
                    >
                      {collapsedIds.has(selectedNode.id) ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {selectedNode.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedNode(child)}
                        className="w-full text-left p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <span className="truncate">{child.text}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex flex-col gap-2 shrink-0">
              {onJumpToHeading && selectedNode.type !== 'root' && (
                <button
                  onClick={() => {
                    onJumpToHeading(selectedNode.text);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Jump to Section in Document</span>
                </button>
              )}

              <button
                onClick={handleCopyConcept}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Concept!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Concept Notes</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
