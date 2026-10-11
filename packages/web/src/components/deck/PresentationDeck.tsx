import React, { useState, useEffect, useRef } from 'react';
import { VmdDocument, VmdNode } from '@visualmd/compiler';
import { ThemeType } from '../../types';
import { CodeBox } from '../widgets/CodeBox';
import { Stepper } from '../widgets/Stepper';
import { CanvasSandbox } from '../widgets/CanvasSandbox';
import { TabsView } from '../widgets/TabsView';
import { CalloutBox } from '../widgets/CalloutBox';
import { MetricsGrid } from '../widgets/MetricsGrid';
import { QuizBox } from '../widgets/QuizBox';
import { MarkdownRenderer } from '../document/MarkdownRenderer';
import { VisualMDLogo } from '../brand/VisualMDLogo';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  PenTool,
  Eraser,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  Plus,
  HelpCircle,
  LayoutGrid,
  Palette,
  ChevronDown,
  Check,
  Moon,
  Sun,
} from 'lucide-react';

interface ThemeOption {
  id: ThemeType;
  name: string;
  category: 'Dark & Modern' | 'Light & Paper';
  bgHex: string;
  accentHex: string;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  // 7 Dark Themes
  {
    id: 'dark',
    name: 'Obsidian Dark',
    category: 'Dark & Modern',
    bgHex: '#09090b',
    accentHex: '#3b82f6',
    description: 'Matte obsidian with crisp slate typography & electric blue',
  },
  {
    id: 'midnight',
    name: 'Midnight Navy',
    category: 'Dark & Modern',
    bgHex: '#0b0f19',
    accentHex: '#6366f1',
    description: 'Deep space cosmic navy with soft luminous indigo',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    category: 'Dark & Modern',
    bgHex: '#1a1b26',
    accentHex: '#7aa2f7',
    description: 'Cyber neon indigo with vivid cyan & lavender accents',
  },
  {
    id: 'dracula',
    name: 'Dracula Velvet',
    category: 'Dark & Modern',
    bgHex: '#282a36',
    accentHex: '#bd93f9',
    description: 'Vampire dark purple with pastel orchid & pink highlights',
  },
  {
    id: 'forest',
    name: 'Forest Dark',
    category: 'Dark & Modern',
    bgHex: '#0c1512',
    accentHex: '#10b981',
    description: 'Deep pine emerald with luminous jade accents',
  },
  {
    id: 'nord',
    name: 'Nord Arctic',
    category: 'Dark & Modern',
    bgHex: '#242933',
    accentHex: '#88c0d0',
    description: 'Polar slate & arctic frost ice blue typography',
  },
  {
    id: 'retro',
    name: 'CRT Terminal',
    category: 'Dark & Modern',
    bgHex: '#0c0d0e',
    accentHex: '#f59e0b',
    description: 'Phosphor amber monospace CRT on matte charcoal',
  },
  // 4 Light & Paper Themes
  {
    id: 'light',
    name: 'Editorial Light',
    category: 'Light & Paper',
    bgHex: '#ffffff',
    accentHex: '#18181b',
    description: 'Crisp editorial white with dark charcoal typography',
  },
  {
    id: 'notebook',
    name: 'Warm Notebook',
    category: 'Light & Paper',
    bgHex: '#fbf7ee',
    accentHex: '#b45309',
    description: 'Ruled rich cream paper with deep fountain pen ink',
  },
  {
    id: 'sepia',
    name: 'Literary Sepia',
    category: 'Light & Paper',
    bgHex: '#f4ecd8',
    accentHex: '#9a3412',
    description: 'Antique library parchment with warm espresso serif',
  },
  {
    id: 'paper',
    name: 'Minimal Paper',
    category: 'Light & Paper',
    bgHex: '#f8f9fa',
    accentHex: '#2563eb',
    description: 'Soft eggshell paper with clean modern typography',
  },
];

interface PresentationDeckProps {
  document: VmdDocument;
  theme?: ThemeType;
  onThemeChange?: (theme: ThemeType) => void;
  onExit: () => void;
}

interface SlideItem {
  id: string;
  title: string;
  isBlank?: boolean;
  blankType?: 'whiteboard' | 'blackboard' | 'grid';
  nodes: VmdNode[];
}

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
  isEraser?: boolean;
}

/**
 * Cohesively groups document nodes (markdown and interactive widgets) into logical presentation slides.
 * Major headings (# or ##) and horizontal dividers (---) define slide boundaries.
 * Widgets immediately following a heading or section are grouped together with that section instead of
 * creating orphaned slides where one slide only has the heading and the next has the widget.
 */
function buildPresentationSlides(doc: VmdDocument): SlideItem[] {
  const slides: SlideItem[] = [];
  let currentTitle = doc.title || 'Overview';
  let currentNodes: VmdNode[] = [];
  let slideCounter = 0;

  function flushSlide(nextTitle?: string) {
    // Filter out whitespace-only or divider-only markdown nodes
    const activeNodes = currentNodes.filter((n) => {
      if (n.type === 'markdown') {
        const cleaned = (n.content || '').replace(/^---+\s*$/gm, '').trim();
        return cleaned.length > 0;
      }
      return true;
    });

    if (activeNodes.length > 0) {
      slideCounter++;
      slides.push({
        id: `slide-${slideCounter}`,
        title: currentTitle,
        nodes: activeNodes,
      });
    }
    currentNodes = [];
    if (nextTitle) {
      currentTitle = nextTitle;
    }
  }

  for (let i = 0; i < doc.nodes.length; i++) {
    const node = doc.nodes[i];

    if (node.type === 'markdown') {
      const lines = node.content.split(/\r?\n/);
      let buffer: string[] = [];
      let inCodeBlock = false;

      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        const trimmed = line.trim();

        // Preserve code blocks completely intact without interpreting `#` or `---` inside them
        if (/^(?:```|~~~)/.test(trimmed)) {
          inCodeBlock = !inCodeBlock;
          buffer.push(line);
          continue;
        }

        if (!inCodeBlock) {
          const isDivider = /^(?:---|\*\*\*)\s*$/.test(trimmed);
          const headingMatch = trimmed.match(/^(#{1,2})\s+(.+)$/);

          if (isDivider) {
            const hasMeaningfulBuffer = buffer.some((l) => l.trim().length > 0 && !/^(?:---|\*\*\*)\s*$/.test(l.trim()));
            if (hasMeaningfulBuffer) {
              currentNodes.push({ id: `${node.id}-part-${j}`, type: 'markdown', content: buffer.join('\n') } as VmdNode);
            }
            buffer = [];

            // Only flush if we actually have accumulated content for this slide.
            // If currentNodes is empty, this divider was placed right under a heading (# Title\n---)
            if (currentNodes.length > 0) {
              flushSlide();
            }
            continue;
          }

          if (headingMatch) {
            const hasMeaningfulBuffer = buffer.some((l) => l.trim().length > 0 && !/^(?:---|\*\*\*)\s*$/.test(l.trim()));
            if (hasMeaningfulBuffer) {
              currentNodes.push({ id: `${node.id}-part-${j}`, type: 'markdown', content: buffer.join('\n') } as VmdNode);
            }
            buffer = [];

            const headingText = headingMatch[2].trim();
            // If current slide already has content, flush it to start a new slide with this heading
            if (currentNodes.length > 0) {
              flushSlide(headingText);
            } else {
              // Current slide was empty, simply adopt this heading as title without creating an empty slide
              currentTitle = headingText;
            }
            continue;
          }
        }

        buffer.push(line);
      }

      if (buffer.length > 0 && buffer.some((l) => l.trim().length > 0 && !/^(?:---|\*\*\*)\s*$/.test(l.trim()))) {
        currentNodes.push({ id: `${node.id}-end`, type: 'markdown', content: buffer.join('\n') } as VmdNode);
      }
    } else {
      // Interactive widget node (tabs, stepper, canvas, snippet, quiz, metrics, callout)
      // If we don't have a distinct section title yet and the widget has a title, adopt it
      if ((!currentTitle || currentTitle === doc.title) && ((node as any).title || (node as any).caption)) {
        currentTitle = (node as any).title || (node as any).caption;
      }
      currentNodes.push(node);
    }
  }

  flushSlide();

  return slides.length > 0 ? slides : [{ id: 'slide-0', title: doc.title, nodes: doc.nodes }];
}

export const PresentationDeck: React.FC<PresentationDeckProps> = ({
  document: doc,
  theme = 'light',
  onThemeChange,
  onExit,
}) => {
  // Theme state
  const [activeTheme, setActiveTheme] = useState<ThemeType>(theme || 'light');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  const handleSelectTheme = (t: ThemeType) => {
    setActiveTheme(t);
    setIsThemeMenuOpen(false);
    if (onThemeChange) {
      onThemeChange(t);
    }
  };

  const isDarkTheme = ['dark', 'obsidian', 'midnight', 'tokyo', 'dracula', 'forest', 'nord', 'retro'].includes(activeTheme);
  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === activeTheme) || THEME_OPTIONS[0];

  // Generate cohesive slides from document nodes
  const initialSlides = React.useMemo<SlideItem[]>(() => {
    return buildPresentationSlides(doc);
  }, [doc]);

  const [slides, setSlides] = useState<SlideItem[]>(initialSlides);

  // Sync slides if document updates
  useEffect(() => {
    setSlides(buildPresentationSlides(doc));
    setCurrentSlideIdx(0);
  }, [doc]);

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);


  // Presenter Tools State
  const [isDrawActive, setIsDrawActive] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [drawingsMap, setDrawingsMap] = useState<Record<string, Stroke[]>>({});
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Laser Pointer State
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [laserRipples, setLaserRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Screen modes
  const [isBlackout, setIsBlackout] = useState(false);
  const [isWhiteout, setIsWhiteout] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Canvas Refs
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPaintingRef = useRef(false);

  const currentSlide = slides[currentSlideIdx] || slides[0];

  // Pen palette colors tailored for dark vs light contrast
  const penColors = isDarkTheme
    ? [
        { color: '#ef4444', label: 'Red' },
        { color: '#facc15', label: 'Yellow' },
        { color: '#38bdf8', label: 'Cyan' },
        { color: '#10b981', label: 'Emerald' },
        { color: '#c084fc', label: 'Violet' },
        { color: '#ffffff', label: 'White' },
      ]
    : [
        { color: '#dc2626', label: 'Red' },
        { color: '#2563eb', label: 'Blue' },
        { color: '#059669', label: 'Emerald' },
        { color: '#7c3aed', label: 'Purple' },
        { color: '#d97706', label: 'Amber' },
        { color: '#18181b', label: 'Charcoal' },
      ];

  // Timer counter
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIdx(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIdx(slides.length - 1);
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDrawActive((prev) => !prev);
        setIsLaserActive(false);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsLaserActive((prev) => !prev);
        setIsDrawActive(false);
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsBlackout((prev) => !prev);
        setIsWhiteout(false);
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setIsWhiteout((prev) => !prev);
        setIsBlackout(false);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setShowOverviewModal((prev) => !prev);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showOverviewModal) {
          setShowOverviewModal(false);
        } else if (showHelpModal) {
          setShowHelpModal(false);
        } else if (isBlackout || isWhiteout) {
          setIsBlackout(false);
          setIsWhiteout(false);
        } else {
          onExit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onExit, showOverviewModal, showHelpModal, isBlackout, isWhiteout]);

  // Fullscreen Handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Add Blank Explanation Slide
  const handleAddBlankSlide = (type: 'whiteboard' | 'blackboard' | 'grid' = 'whiteboard') => {
    const newSlide: SlideItem = {
      id: `blank-${Date.now()}`,
      title: type === 'whiteboard' ? 'Whiteboard Canvas' : type === 'blackboard' ? 'Blackboard Sketch' : 'Grid Sketchpad',
      isBlank: true,
      blankType: type,
      nodes: [],
    };

    const updated = [...slides];
    updated.splice(currentSlideIdx + 1, 0, newSlide);
    setSlides(updated);
    setCurrentSlideIdx(currentSlideIdx + 1);
    setIsDrawActive(true);
  };

  const handleRemoveCurrentBlankSlide = () => {
    if (!currentSlide.isBlank || slides.length <= 1) return;
    const updated = slides.filter((_, idx) => idx !== currentSlideIdx);
    setSlides(updated);
    setCurrentSlideIdx((prev) => Math.max(0, prev - 1));
  };

  // Redraw Canvas Strokes when slide changes or drawings update
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const slideStrokes = drawingsMap[currentSlide.id] || [];
    const allStrokes = currentStroke ? [...slideStrokes, currentStroke] : slideStrokes;

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.isEraser ? '#000000' : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  }, [drawingsMap, currentSlide.id, currentStroke]);

  useEffect(() => {
    const updateSize = () => {
      if (drawCanvasRef.current) {
        drawCanvasRef.current.width = window.innerWidth;
        drawCanvasRef.current.height = window.innerHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawActive) return;
    isPaintingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentStroke({
      points: [point],
      color: drawColor,
      width: isEraser ? drawWidth * 4 : drawWidth,
      isEraser,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLaserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }

    if (!isDrawActive || !isPaintingRef.current || !currentStroke) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, point] } : null));
  };

  const handleMouseUp = () => {
    if (!isDrawActive || !isPaintingRef.current || !currentStroke) return;
    isPaintingRef.current = false;
    setDrawingsMap((prev) => {
      const existing = prev[currentSlide.id] || [];
      return { ...prev, [currentSlide.id]: [...existing, currentStroke] };
    });
    setCurrentStroke(null);
  };

  const handleClearSlideDrawings = () => {
    setDrawingsMap((prev) => ({ ...prev, [currentSlide.id]: [] }));
  };

  const handleUndoDrawing = () => {
    setDrawingsMap((prev) => {
      const existing = prev[currentSlide.id] || [];
      return { ...prev, [currentSlide.id]: existing.slice(0, -1) };
    });
  };

  const handleArenaClick = (e: React.MouseEvent) => {
    if (isLaserActive) {
      const rippleId = Date.now();
      setLaserRipples((prev) => [...prev, { id: rippleId, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setLaserRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 700);
    }
  };

  const blankSlideBgClass =
    currentSlide.blankType === 'whiteboard'
      ? 'bg-white text-zinc-900 border-2 border-zinc-200 shadow-2xl'
      : currentSlide.blankType === 'blackboard'
      ? 'bg-[#0b0f19] text-slate-100 border border-slate-800 shadow-2xl'
      : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-2xl';

  return (
    <div
      data-theme={activeTheme}
      onMouseMove={(e) => isLaserActive && setLaserPos({ x: e.clientX, y: e.clientY })}
      onClick={handleArenaClick}
      className="fixed inset-0 z-50 bg-[var(--bg-primary)] text-[var(--text-primary)] vmd-document-bg flex flex-col justify-between overflow-hidden select-none font-[var(--font-family)] transition-colors"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* Blackout / Whiteout overlay */}
      {isBlackout && (
        <div
          onClick={() => setIsBlackout(false)}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center cursor-pointer"
        >
          <span className="text-xs font-mono text-zinc-400">Screen Blacked Out • Click or press 'B' to restore</span>
        </div>
      )}
      {isWhiteout && (
        <div
          onClick={() => setIsWhiteout(false)}
          className="fixed inset-0 z-[100] bg-white flex items-center justify-center cursor-pointer"
        >
          <span className="text-xs font-mono text-zinc-600">Screen Whited Out • Click or press 'W' to restore</span>
        </div>
      )}

      {/* Laser Pointer Glowing Element */}
      {isLaserActive && laserPos && (
        <div
          className="fixed pointer-events-none z-[80] w-4 h-4 rounded-full bg-red-500 shadow-[0_0_16px_4px_#ef4444,0_0_30px_8px_rgba(239,68,68,0.5)] transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out animate-pulse"
          style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
        >
          <div className="absolute inset-1 rounded-full bg-white opacity-90" />
        </div>
      )}

      {/* Laser Click Ripples */}
      {laserRipples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none z-[79] w-12 h-12 rounded-full border-2 border-red-500 transform -translate-x-1/2 -translate-y-1/2 animate-ping"
          style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
        />
      ))}

      {/* Drawing Canvas Overlay */}
      <canvas
        ref={drawCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`fixed inset-0 z-30 ${isDrawActive ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      />

      {/* Top Presenter Toolbar */}
      <header className="px-6 py-3.5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl z-40 shrink-0 text-[var(--text-primary)] transition-colors">
        <div className="flex items-center gap-3">
          <VisualMDLogo size={24} />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Presentation
          </span>
          <span className="text-[var(--border-color)]">•</span>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-sm">
            {doc.title}
          </span>
          {currentSlide.isBlank && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--border-color)]">
              Blank Slide
            </span>
          )}
        </div>

        {/* Center: Live Presenter Timer & Slide counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-primary)] shadow-xs">
            <button
              onClick={() => setIsTimerRunning((prev) => !prev)}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] p-0.5 transition-colors"
              title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <span className="font-semibold">{formatTimer(timerSeconds)}</span>
          </div>

          <button
            onClick={() => setShowOverviewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-xs"
            title="Slide Overview (O)"
          >
            <LayoutGrid className="w-3 h-3 text-[var(--accent)]" />
            <span>{currentSlideIdx + 1} / {slides.length}</span>
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {/* Theme Selector Dropdown */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-all shadow-xs"
              title="Select visual theme"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-white/20"
                style={{ backgroundColor: currentThemeObj.accentHex }}
              />
              <span className="max-w-[110px] truncate hidden md:inline">{currentThemeObj.name}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
                <div className="px-2.5 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                    <Palette className="w-3.5 h-3.5 text-blue-500" />
                    <span>Presentation Themes</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {THEME_OPTIONS.length} Themes
                  </span>
                </div>

                {/* Dark Themes */}
                <div className="mt-2">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-400" />
                    <span>Dark & Modern</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {THEME_OPTIONS.filter((t) => t.category === 'Dark & Modern').map((opt) => {
                      const isSelected = opt.id === activeTheme;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectTheme(opt.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold border border-[var(--border-color)]'
                              : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full shrink-0 border border-slate-700 flex items-center justify-center shadow-xs"
                              style={{ backgroundColor: opt.bgHex }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: opt.accentHex }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium leading-tight truncate">{opt.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] leading-tight truncate">{opt.description}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Light & Paper Themes */}
                <div className="mt-3 pt-2 border-t border-[var(--border-color)]">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Light & Paper</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {THEME_OPTIONS.filter((t) => t.category === 'Light & Paper').map((opt) => {
                      const isSelected = opt.id === activeTheme;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectTheme(opt.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold border border-[var(--border-color)]'
                              : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full shrink-0 border border-slate-300 flex items-center justify-center shadow-xs"
                              style={{ backgroundColor: opt.bgHex }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: opt.accentHex }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium leading-tight truncate">{opt.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] leading-tight truncate">{opt.description}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Laser Pointer Toggle */}
          <button
            onClick={() => {
              setIsLaserActive((prev) => !prev);
              setIsDrawActive(false);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isLaserActive
                ? 'bg-red-500/15 border-red-500/50 text-red-500 shadow-sm'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            title="Toggle Laser Pointer (L)"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
            <span>Laser</span>
          </button>

          {/* Draw Pen Toggle */}
          <button
            onClick={() => {
              setIsDrawActive((prev) => !prev);
              setIsLaserActive(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isDrawActive
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            title="Draw Annotation Mode (D)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>

          {/* Add Blank Slide Dropdown / Button */}
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-0.5 shadow-xs">
            <button
              onClick={() => handleAddBlankSlide('whiteboard')}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Insert a Whiteboard Blank Slide for explanation"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Blank</span>
            </button>
            <button
              onClick={() => handleAddBlankSlide('grid')}
              className="px-1.5 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Add Grid Sketchpad Slide"
            >
              ⊞
            </button>
            <button
              onClick={() => handleAddBlankSlide('blackboard')}
              className="px-1.5 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Add Dark Blackboard Slide"
            >
              ⬛
            </button>
          </div>

          {currentSlide.isBlank && (
            <button
              onClick={handleRemoveCurrentBlankSlide}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 text-xs font-medium transition-colors"
              title="Remove this blank explanation slide"
            >
              Remove Slide
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors shadow-xs"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Keyboard Shortcuts Help */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors shadow-xs"
            title="Presenter Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Exit */}
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--border-color)] hover:border-rose-500/30 transition-colors shadow-xs"
            title="Exit Presentation (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* In-Draw Mode Palette Bar (Floating at top when drawing is active) */}
      {isDrawActive && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pen:</span>

          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {penColors.map((c) => (
              <button
                key={c.color}
                onClick={() => {
                  setDrawColor(c.color);
                  setIsEraser(false);
                }}
                className={`w-5 h-5 rounded-full border border-black/20 dark:border-white/20 transition-transform ${
                  drawColor === c.color && !isEraser ? 'scale-125 ring-2 ring-[var(--accent)] ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>

          <div className="w-[1px] h-4 bg-[var(--border-color)]" />

          {/* Thickness */}
          <div className="flex items-center gap-1">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setDrawWidth(w)}
                className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                  drawWidth === w ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
                title={`${w}px thickness`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: `${w + 2}px`, height: `${w + 2}px` }}
                />
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-[var(--border-color)]" />

          {/* Eraser */}
          <button
            onClick={() => setIsEraser((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
              isEraser
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent hover:bg-[var(--bg-tertiary)]'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          {/* Undo */}
          <button
            onClick={handleUndoDrawing}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            title="Undo stroke (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={handleClearSlideDrawings}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-tertiary)]"
            title="Clear all drawings on this slide (C)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Slide Presentation Arena */}
      <main className="flex-1 overflow-hidden px-4 md:px-12 py-4 flex flex-col justify-center items-center max-w-5xl mx-auto w-full z-20 min-h-0">
        {currentSlide.isBlank ? (
          /* Blank Explanation Slide View - Clean unobstructed drawing canvas */
          <div className={`w-full h-full min-h-[500px] max-h-[calc(100vh-140px)] rounded-3xl p-6 flex flex-col justify-between ${blankSlideBgClass} transition-all overflow-hidden relative shadow-2xl`}>
            {/* Subtle top indicator */}
            <div className="flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity select-none pointer-events-none">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">{currentSlide.title}</span>
              <span className="text-[10px] font-mono">Slide {currentSlideIdx + 1} / {slides.length}</span>
            </div>

            {/* Ruled paper lines if grid */}
            {currentSlide.blankType === 'grid' && (
              <div
                className="absolute inset-4 rounded-2xl border border-current/10 pointer-events-none"
                style={{
                  backgroundImage: isDarkTheme
                    ? 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)'
                    : 'radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
            )}
          </div>
        ) : (
          /* Content Slide View - Neatly constrained to slide bounds with internal scrolling and smooth fade transition */
          <div
            key={currentSlide.id}
            className="w-full max-h-[calc(100vh-140px)] rounded-3xl p-6 md:p-10 flex flex-col justify-between bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl transition-all overflow-hidden animate-in fade-in zoom-in-[0.99] duration-150"
          >
            <div className="shrink-0 mb-4 pb-2 border-b border-[var(--border-color)]/60">
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] mb-1">
                <span>SLIDE {currentSlideIdx + 1} OF {slides.length}</span>
                <span>•</span>
                <span className="uppercase">{currentThemeObj.name}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
                {currentSlide.title}
              </h1>
              <div className="h-1.5 w-20 bg-[var(--accent)] rounded-full mt-2 shadow-xs" />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-2">
              {currentSlide.nodes.map((node) => {
                switch (node.type) {
                  case 'snippet':
                    return <CodeBox key={node.id} node={node as any} />;
                  case 'stepper':
                    return <Stepper key={node.id} node={node as any} />;
                  case 'canvas':
                    return <CanvasSandbox key={node.id} node={node as any} />;
                  case 'tabs':
                    return <TabsView key={node.id} node={node as any} />;
                  case 'callout':
                    return <CalloutBox key={node.id} node={node as any} />;
                  case 'metrics':
                    return <MetricsGrid key={node.id} node={node as any} />;
                  case 'quiz':
                    return <QuizBox key={node.id} node={node as any} />;
                  case 'markdown':
                    return <MarkdownRenderer key={node.id} content={(node as any).content} />;
                  default:
                    return null;
                }
              })}
            </div>

            <div className="shrink-0 mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span className="truncate max-w-sm">{doc.title}</span>
              <span>VisualMD Presentation</span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Control & Progress Bar */}
      <footer className="px-8 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl flex items-center justify-between z-40 shrink-0 text-[var(--text-primary)] transition-colors">
        <div className="text-xs text-[var(--text-muted)] font-mono hidden sm:block">
          ← / → to slide • D Draw • L Laser • B Blackout • F Fullscreen • Esc Exit
        </div>

        {/* Global Progress Track & Quick Jump Dots */}
        <div className="flex flex-col items-center gap-1.5 max-w-sm sm:max-w-md w-full px-2">
          <div className="w-full h-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${((currentSlideIdx + 1) / slides.length) * 100}%` }}
            />
          </div>
          {/* Quick Jump Slide Dots (clickable) */}
          <div className="flex items-center justify-center gap-1 overflow-x-auto max-w-full py-0.5">
            {slides.length <= 25 ? (
              slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentSlideIdx(idx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    idx === currentSlideIdx
                      ? 'w-4 h-1.5 bg-[var(--accent)]'
                      : 'w-1.5 h-1.5 bg-[var(--border-color)] hover:bg-[var(--text-muted)]'
                  }`}
                  title={`Slide ${idx + 1}: ${s.title}`}
                />
              ))
            ) : (
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Slide {currentSlideIdx + 1} of {slides.length}
              </span>
            )}
          </div>
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlideIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentSlideIdx === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors text-xs font-semibold shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button
            onClick={() => setCurrentSlideIdx((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlideIdx === slides.length - 1}
            className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-sm transition-all text-xs font-semibold"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Slide Overview Grid Modal (Press 'O') */}
      {showOverviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Slide Overview ({slides.length} slides)
                </h3>
              </div>
              <button
                onClick={() => setShowOverviewModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto flex-1">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentSlideIdx(idx);
                    setShowOverviewModal(false);
                  }}
                  className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between h-32 ${
                    idx === currentSlideIdx
                      ? 'bg-[var(--accent-surface)] border-[var(--accent)] ring-2 ring-[var(--accent)]/40 font-semibold'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-[var(--accent)]">Slide {idx + 1}</span>
                  <span className="text-xs font-semibold line-clamp-2 text-[var(--text-primary)]">{s.title}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {s.isBlank ? 'Explanation Canvas' : `${s.nodes.length} element(s)`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Speaker Shortcuts Help Modal (Press '?') */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Presenter Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-2.5 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Next Slide</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">→ / Space / PageDown</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Previous Slide</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">← / PageUp</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Laser Pointer</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">L</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Draw Pen Mode</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">D</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Slide Overview Matrix</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">O</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Fullscreen</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">F</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Blackout Screen</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">B</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]/60">
                <span className="font-semibold text-[var(--text-primary)]">Whiteout Screen</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">W</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-[var(--text-primary)]">Exit Presentation</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
