import React, { useState, useEffect, useRef } from 'react';
import { FullDocument, ThemeType, Folder, DocumentVersion } from '../../types';
import { parseVisualMD } from '@visualmd/compiler';
import { CodeBox } from '../widgets/CodeBox';
import { Stepper } from '../widgets/Stepper';
import { CanvasSandbox } from '../widgets/CanvasSandbox';
import { TabsView } from '../widgets/TabsView';
import { CalloutBox } from '../widgets/CalloutBox';
import { MetricsGrid } from '../widgets/MetricsGrid';
import { QuizBox } from '../widgets/QuizBox';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  Bookmark as BookmarkIcon,
  Presentation,
  Check,
  ZoomIn,
  ZoomOut,
  Edit2,
  Bot,
  Palette,
  ChevronDown,
  X,
  PanelLeft,
  Moon,
  Sun,
  Type,
  Folder as FolderIcon,
  FolderInput,
  MessageSquare,
  MessageSquarePlus,
  Download,
  Printer,
  Copy,
  History,
  Maximize2,
  Minimize2,
  Columns,
  Tv,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  HelpCircle,
  Settings,
  Flame,
} from 'lucide-react';
import { HistoryDrawer } from '../modals/HistoryDrawer';
import { PomodoroTimer } from '../study/PomodoroTimer';
import { SettingsTab } from '../modals/SettingsModal';

interface DocumentViewerProps {
  document: FullDocument;
  theme: ThemeType;
  folders?: Folder[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onThemeChange: (theme: ThemeType) => void;
  onToggleBookmark: (nodeId: string, label?: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddAnnotation?: (anno: {
    nodeId: string;
    selectedText: string;
    note: string;
    color: string;
    occurrenceIndex?: number;
    tableCell?: string | null;
  }) => void;
  onOpenNotesDrawer: () => void;
  onOpenPromptsModal: () => void;
  onOpenStudyStats?: () => void;
  onOpenTutorial?: () => void;
  onOpenSettings?: (tab?: SettingsTab) => void;
  onStartPresentation: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateScrollPosition: (scrollPos: number, nodeId: string | null) => void;
  onUpdateContent?: (newContent: string) => void;
  onMoveDoc?: (docId: string, folderId: string | null) => void;
  contentWidth?: ContentWidthMode;
  onContentWidthChange?: (width: ContentWidthMode) => void;
  fontScaleIndex?: number;
  onFontScaleIndexChange?: (index: number) => void;
}

interface ThemeOption {
  id: ThemeType;
  name: string;
  category: 'Dark & Modern' | 'Light & Paper';
  bgHex: string;
  accentHex: string;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  // 4 Curated Dark Modes
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
    id: 'retro',
    name: 'CRT Terminal',
    category: 'Dark & Modern',
    bgHex: '#0c0d0e',
    accentHex: '#f59e0b',
    description: 'Phosphor amber monospace CRT on matte charcoal',
  },
  // 3 Curated Light & Paper Modes
  {
    id: 'light',
    name: 'Modern Clean Paper',
    category: 'Light & Paper',
    bgHex: '#ffffff',
    accentHex: '#2563eb',
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
];

interface FontScalePresetItem {
  id: string;
  label: string;
  percent: number;
  scale: number;
  desc: string;
}

const FONT_SCALE_PRESETS: FontScalePresetItem[] = [
  { id: 'tiny', label: 'Extra Compact', percent: 75, scale: 0.75, desc: '75% - Maximum content density' },
  { id: 'compact', label: 'Compact', percent: 85, scale: 0.85, desc: '85% - Code & data intensive' },
  { id: 'small', label: 'Small', percent: 95, scale: 0.95, desc: '95% - Condensed reading' },
  { id: 'default', label: 'Default Normal', percent: 100, scale: 1.0, desc: '100% - Standard balanced size' },
  { id: 'reading', label: 'Comfortable', percent: 110, scale: 1.1, desc: '110% - Extended reading mode' },
  { id: 'medium', label: 'Medium', percent: 125, scale: 1.25, desc: '125% - High readability' },
  { id: 'large', label: 'Large', percent: 140, scale: 1.4, desc: '140% - Large text view' },
  { id: 'xlarge', label: 'Extra Large', percent: 160, scale: 1.6, desc: '160% - High visibility' },
  { id: 'projector', label: 'Projector Normal', percent: 180, scale: 1.8, desc: '180% - Presentation / Projector' },
  { id: 'projector-2x', label: 'Maximum Projector 2x', percent: 200, scale: 2.0, desc: '200% - Conference hall / 4K Projector' },
];

export type ContentWidthMode = 'compact' | 'standard' | 'wide' | 'projector';

interface WidthPresetItem {
  id: ContentWidthMode;
  label: string;
  iconLabel: string;
  className: string;
  desc: string;
}

const WIDTH_PRESETS: WidthPresetItem[] = [
  {
    id: 'compact',
    label: 'Compact Reader',
    iconLabel: 'Compact',
    className: 'max-w-3xl',
    desc: '768px - Ideal for 12" screens, split windows & narrow reading',
  },
  {
    id: 'standard',
    label: 'Standard',
    iconLabel: 'Normal',
    className: 'max-w-4xl',
    desc: '896px - Default balanced editorial width',
  },
  {
    id: 'wide',
    label: 'Wide Desktop',
    iconLabel: 'Wide',
    className: 'max-w-6xl',
    desc: '1152px - Spacious for tables, metrics & code',
  },
  {
    id: 'projector',
    label: 'Projector / Full Canvas',
    iconLabel: 'Projector',
    className: 'max-w-[95%] 2xl:max-w-[90%]',
    desc: 'Full Width - Fits conference projectors & ultra-wide displays',
  },
];


export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document: doc,
  theme,
  isSidebarOpen,
  folders = [],
  onToggleSidebar,
  onThemeChange,
  onToggleBookmark,
  onDeleteAnnotation,
  onAddAnnotation,
  onOpenNotesDrawer,
  onOpenPromptsModal,
  onOpenStudyStats,
  onOpenTutorial,
  onOpenSettings,
  onStartPresentation,
  onUpdateTitle,
  onUpdateScrollPosition,
  onUpdateContent,
  onMoveDoc,
  contentWidth: propContentWidth,
  onContentWidthChange: propOnContentWidthChange,
  fontScaleIndex: propFontScaleIndex,
  onFontScaleIndexChange: propOnFontScaleIndexChange,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(doc.title);
  const [activeNoteNodeId, setActiveNoteNodeId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState('');
  const [activeNoteColor, setActiveNoteColor] = useState('yellow');

  // Granular Font Scale State (index 3 = 100% default)
  const [internalFontScaleIndex, setInternalFontScaleIndex] = useState<number>(() => {
    const saved = localStorage.getItem('visualmd-font-scale-index');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < FONT_SCALE_PRESETS.length) {
        return parsed;
      }
    }
    return 3; // Default is index 3 (100%)
  });

  const [internalContentWidth, setInternalContentWidth] = useState<ContentWidthMode>(() => {
    const saved = localStorage.getItem('visualmd-content-width') as ContentWidthMode | null;
    if (saved && WIDTH_PRESETS.some((p) => p.id === saved)) {
      return saved;
    }
    return 'standard';
  });

  const fontScaleIndex = propFontScaleIndex !== undefined ? propFontScaleIndex : internalFontScaleIndex;
  const setFontScaleIndex = (idx: number | ((prev: number) => number)) => {
    if (typeof idx === 'function') {
      const nextVal = idx(fontScaleIndex);
      if (propOnFontScaleIndexChange) propOnFontScaleIndexChange(nextVal);
      else setInternalFontScaleIndex(nextVal);
    } else {
      if (propOnFontScaleIndexChange) propOnFontScaleIndexChange(idx);
      else setInternalFontScaleIndex(idx);
    }
  };

  const contentWidth = propContentWidth !== undefined ? propContentWidth : internalContentWidth;
  const setContentWidth = (w: ContentWidthMode) => {
    if (propOnContentWidthChange) propOnContentWidthChange(w);
    else setInternalContentWidth(w);
  };

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);

  // Clear preview when switching documents
  useEffect(() => {
    setPreviewVersion(null);
  }, [doc.id]);

  const effectiveTitle = previewVersion ? (previewVersion.title || doc.title) : doc.title;
  const effectiveContent = previewVersion ? previewVersion.content : doc.content;

  const effectiveParsedDoc = React.useMemo(() => {
    if (previewVersion && previewVersion.content) {
      try {
        return parseVisualMD(previewVersion.content);
      } catch (err) {
        console.error('Failed to parse preview document:', err);
        return doc.parsedDoc;
      }
    }
    return doc.parsedDoc;
  }, [previewVersion, doc.parsedDoc]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFull = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        (window.innerHeight === screen.height && window.innerWidth === screen.width)
      );
      setIsFullscreen(isFull);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('resize', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('resize', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    const doc = document as any;
    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    if (!isFull) {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/docs/${doc.id}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.document) {
          if (onUpdateContent && data.document.content) {
            onUpdateContent(data.document.content);
          }
          if (onUpdateTitle && data.document.title && data.document.title !== doc.title) {
            onUpdateTitle(data.document.title);
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isExportMenuOpen]);

  useEffect(() => {
    localStorage.setItem('visualmd-content-width', contentWidth);
  }, [contentWidth]);

  const handleDownloadMarkdown = () => {
    const filename = `${(effectiveTitle || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.vmd`;
    const blob = new Blob([effectiveContent || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(effectiveContent || '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const wordCount = React.useMemo(() => {
    const text = (effectiveContent || '').trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [effectiveContent]);

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDone = useRef(false);

  const currentScalePreset = FONT_SCALE_PRESETS[fontScaleIndex] || FONT_SCALE_PRESETS[3];
  const currentWidthPreset = WIDTH_PRESETS.find((w) => w.id === contentWidth) || WIDTH_PRESETS[1];

  // Apply font scale CSS variables dynamically to document & persist
  useEffect(() => {
    document.documentElement.style.setProperty('--vmd-font-scale', String(currentScalePreset.scale));
    document.body.style.setProperty('--vmd-font-scale', String(currentScalePreset.scale));
    localStorage.setItem('visualmd-font-scale-index', String(fontScaleIndex));
    fetch('/api/settings/font_scale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: currentScalePreset.scale }),
    }).catch(() => {});
  }, [fontScaleIndex, currentScalePreset.scale]);

  // Keyboard zoom shortcuts: Cmd/Ctrl + '+', Cmd/Ctrl + '-', Cmd/Ctrl + '0'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setFontScaleIndex((prev) => Math.min(FONT_SCALE_PRESETS.length - 1, prev + 1));
        } else if (e.key === '-') {
          e.preventDefault();
          setFontScaleIndex((prev) => Math.max(0, prev - 1));
        } else if (e.key === '0') {
          e.preventDefault();
          setFontScaleIndex(3); // Reset to 100%
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load persisted font scale from DB on mount
  useEffect(() => {
    fetch('/api/settings/font_scale')
      .then((r) => r.json())
      .then((data) => {
        if (data.value) {
          const val = parseFloat(data.value);
          const matchIdx = FONT_SCALE_PRESETS.findIndex((p) => Math.abs(p.scale - val) < 0.05);
          if (matchIdx !== -1) {
            setFontScaleIndex(matchIdx);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTitleText(doc.title);
    isInitialScrollDone.current = false;
  }, [doc.id]);



  useEffect(() => {
    if (!isInitialScrollDone.current && scrollContainerRef.current) {
      if (doc.last_read_position && doc.last_read_position > 0) {
        scrollContainerRef.current.scrollTop = doc.last_read_position;
      }
      isInitialScrollDone.current = true;
    }
  }, [doc.id, doc.last_read_position]);

  const scrollDebounceRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (!scrollContainerRef.current) return;
      const pos = scrollContainerRef.current.scrollTop;
      const nodeElements = scrollContainerRef.current.querySelectorAll('[data-node-id]');
      let currentVisibleNode: string | null = null;
      for (let i = 0; i < nodeElements.length; i++) {
        const el = nodeElements[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
          currentVisibleNode = el.dataset.nodeId || null;
          break;
        }
      }
      onUpdateScrollPosition(pos, currentVisibleNode);
    }, 800);
  };

  const handleSaveTitle = () => {
    if (titleText.trim() && titleText !== doc.title) {
      onUpdateTitle(titleText.trim());
    }
    setIsEditingTitle(false);
  };

  const parsedNodes = effectiveParsedDoc?.nodes || [];

  const bookmarkNodeIds = new Set((doc.bookmarks || []).map((b) => b.node_id));

  const currentThemeObj =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden vmd-app">
      {/* Top Navigation Bar */}
      <header className="relative z-40 h-14 border-b border-[var(--border-color)] px-4 md:px-6 flex items-center justify-between shrink-0 bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {/* Toggle Sidebar Button if collapsed */}
          {!isSidebarOpen && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mr-1"
              title="Open Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="bg-[var(--bg-card)] border border-blue-500 rounded-md px-2.5 py-1 text-sm font-semibold text-[var(--text-primary)] focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-emerald-500 hover:text-emerald-400"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group min-w-0">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs lg:max-w-md">
                {effectiveTitle}
              </h2>
              {!previewVersion && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                  title="Edit document title"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Pomodoro Study Timer */}
          <PomodoroTimer onOpenSettings={() => onOpenSettings && onOpenSettings('pomodoro')} />

          {/* Study Activity & LeetCode Heatmap Button */}
          {onOpenStudyStats && (
            <button
              onClick={onOpenStudyStats}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs cursor-pointer group"
              title="View Study Activity, LeetCode Heatmap & Streaks"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Activity</span>
            </button>
          )}

          {/* AI Prompts & Skills Button */}
          <button
            onClick={onOpenPromptsModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs cursor-pointer group"
            title="AI Prompts & Agent Skills for ChatGPT, Claude, Cursor, and Gemini"
          >
            <Bot className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="hidden lg:inline">AI Prompts</span>
          </button>

          {/* Bookmarks & Notes Button */}
          <button
            onClick={onOpenNotesDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs cursor-pointer"
            title="Bookmarks & Notes"
          >
            <BookmarkIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden xl:inline">Notes</span>
            {((doc.bookmarks?.length || 0) > 0 || (doc.annotations?.length || 0) > 0) && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-mono">
                {(doc.bookmarks?.length || 0) + (doc.annotations?.length || 0)}
              </span>
            )}
          </button>

          {/* Document Export & Print Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs cursor-pointer"
              title="Export, download, or print document"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden xl:inline">Export</span>
              <ChevronDown
                className={`w-3 h-3 opacity-60 ml-0.5 transition-transform duration-200 ${
                  isExportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[65]"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-32px)] rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      handleDownloadMarkdown();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">Download .vmd</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">Save markdown file to disk</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handleCopyMarkdown();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{isCopied ? 'Copied to Clipboard!' : 'Copy Markdown'}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">Copy raw content to clipboard</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-[var(--border-color)]" />

                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      window.print();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">Export Clean PDF / Print</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">Print preview or PDF export (Ctrl+P)</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Version History (VCS) */}
          <button
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-xs cursor-pointer ${
              isHistoryOpen
                ? 'bg-[var(--accent-surface)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Version History & Revisions"
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden xl:inline">History</span>
          </button>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-xs cursor-pointer ${
              isFullscreen
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (F11 / Esc)' : 'View Fullscreen in Browser (F11)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          {/* Slide Deck Presentation Mode */}
          <button
            onClick={onStartPresentation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 text-xs font-semibold shadow-xs transition-opacity cursor-pointer"
            title="Present as Slides (P)"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Present</span>
          </button>
        </div>
      </header>

      {/* Main Reading Canvas & Side-by-Side In-Flow History Drawer */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Version Preview Mode Alert Banner */}
      {previewVersion && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 sm:px-6 py-2.5 flex items-center justify-between backdrop-blur-md text-[var(--text-primary)] shrink-0 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div className="text-xs truncate">
              <span className="font-bold text-amber-600 dark:text-amber-400">
                Previewing Version {previewVersion.version_number ? `v${previewVersion.version_number}` : 'Draft'}:
              </span>{' '}
              <span className="text-[var(--text-primary)] font-medium">
                {previewVersion.summary || 'Historical Revision'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono ml-2 hidden lg:inline">
                ({previewVersion.content ? `${previewVersion.content.split(/\s+/).filter(Boolean).length} words` : '0 words'} • {new Date(previewVersion.created_at).toLocaleString()})
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              Read-Only Preview
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                if (previewVersion.id === 'draft') {
                  try {
                    const res = await fetch(`/api/docs/${doc.id}/versions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content: previewVersion.content,
                        title: previewVersion.title || doc.title,
                        summary: previewVersion.summary || 'Uploaded draft',
                        set_as_latest: true,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.document) {
                        if (onUpdateContent && data.document.content) onUpdateContent(data.document.content);
                        if (onUpdateTitle && data.document.title) onUpdateTitle(data.document.title);
                      }
                    }
                  } catch (err) {
                    console.error('Failed to set draft as latest:', err);
                  }
                } else {
                  await handleRestoreVersion(previewVersion.id);
                }
                setPreviewVersion(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Promote this version to be the active document"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Set as Latest</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewVersion(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
              title="Exit preview and return to active document"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Scroll Area with Dynamic Font Scaling & Document Texture */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          '--vmd-font-scale': currentScalePreset.scale,
          fontSize: `${16 * currentScalePreset.scale}px`,
        } as React.CSSProperties}
        className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-10 mx-auto w-full vmd-document-bg transition-colors ${currentWidthPreset.className}`}
      >
        {/* Document Hero */}
        <div className="mb-8 pb-6 border-b border-[var(--border-color)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)] mb-2">
            <span>VISUALMD SPECIFICATION</span>
            <span>•</span>
            <span>{wordCount.toLocaleString()} Words</span>
            <span>•</span>
            <span>~{readTimeMinutes} min read</span>
            <span>•</span>
            <span>{parsedNodes.length} Elements</span>
            <span>•</span>
            <span>Scale: {currentScalePreset.percent}%</span>
          </div>
          <h1
            style={{ fontSize: `calc(2.25rem * ${currentScalePreset.scale})` }}
            className="font-extrabold text-[var(--text-primary)] tracking-tight leading-tight transition-all duration-150"
          >
            {effectiveTitle}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Tip: Double-click any section header or text block to drop a bookmark. Select text to highlight or add notes.
          </p>
        </div>

        {/* Nodes stream */}
        <div className="space-y-6">
          {parsedNodes.map((node) => {
            const isBookmarked = bookmarkNodeIds.has(node.id);
            const bookmarkItem = (doc.bookmarks || []).find((b) => b.node_id === node.id);

            // Extract human-readable title from node if present
            const getNodeTitle = (n: any): string | null => {
              if (!n) return null;
              if (n.sectionTitle && typeof n.sectionTitle === 'string' && n.sectionTitle.trim()) {
                return n.sectionTitle.trim();
              }
              if (n.title && typeof n.title === 'string' && n.title.trim()) {
                return n.title.trim();
              }
              if (n.type === 'markdown' && n.content) {
                const lines = n.content.split('\n');
                for (const l of lines) {
                  const trimmed = l.trim();
                  if (trimmed.startsWith('#')) {
                    return trimmed.replace(/^#+\s*/, '').trim();
                  }
                }
                for (const l of lines) {
                  const trimmed = l.trim();
                  if (trimmed && !trimmed.startsWith('$')) {
                    return trimmed.length > 40 ? trimmed.substring(0, 37) + '...' : trimmed;
                  }
                }
              }
              return null;
            };

            const nodeTitle = getNodeTitle(node);
            const handleToggleThisNodeBookmark = () => {
              onToggleBookmark(node.id, nodeTitle || undefined);
            };

            const rawLabel = bookmarkItem?.label;
            const isRawNodeId = !rawLabel || rawLabel.startsWith('node-') || rawLabel.startsWith('Section node-') || rawLabel.startsWith('Section ');
            const displayTitle = !isRawNodeId ? rawLabel : nodeTitle;

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onDoubleClick={handleToggleThisNodeBookmark}
                className={`relative group rounded-xl transition-all ${
                  isBookmarked
                    ? 'ring-1 ring-blue-500/50 bg-[var(--accent-surface)] p-3 -m-3 shadow-xs'
                    : 'p-1 -m-1'
                }`}
              >
                {/* Margin Quick Action Icons: Bookmark & Section Note */}
                <div className="absolute -left-7 top-2 flex flex-col items-center gap-1.5 z-10">
                  <button
                    onClick={handleToggleThisNodeBookmark}
                    className={`p-1 rounded-md transition-all ${
                      isBookmarked
                        ? 'opacity-100 text-blue-500 scale-105'
                        : 'opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-blue-500'
                    }`}
                    title={isBookmarked ? 'Bookmarked! Double click to remove' : 'Double click to bookmark'}
                  >
                    <BookmarkIcon
                      className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`}
                    />
                  </button>
                  {onAddAnnotation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveNoteNodeId((prev) => (prev === node.id ? null : node.id));
                        setActiveNoteText('');
                      }}
                      className="p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      title="Add comment to this section"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bookmark Pill if active */}
                {isBookmarked && (
                  <div className="flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400 bg-[var(--bg-card)] border border-blue-500/30 px-2.5 py-0.5 rounded-full w-fit mb-2 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <BookmarkIcon className="w-3 h-3 fill-blue-500 text-blue-500" />
                      <span>{displayTitle ? `Bookmarked : ${displayTitle}` : 'Bookmarked'}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleThisNodeBookmark();
                      }}
                      className="ml-2 text-[var(--text-muted)] hover:text-rose-500"
                      title="Remove bookmark"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Inline Section Note / Comment Composer */}
                {activeNoteNodeId === node.id && onAddAnnotation && (
                  <div className="mb-3 p-3 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-card)] shadow-xl z-20 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-[var(--accent)]/10">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)] text-xs">
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Section Note</span>
                        {displayTitle && (
                          <span className="text-[10px] text-[var(--text-muted)] font-normal truncate max-w-[200px]">
                            • {displayTitle}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveNoteNodeId(null)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 8 Color Selection Circles */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mr-1">Color:</span>
                      {[
                        { name: 'yellow', bg: '#facc15' },
                        { name: 'emerald', bg: '#34d399' },
                        { name: 'sky', bg: '#38bdf8' },
                        { name: 'rose', bg: '#fb7185' },
                        { name: 'purple', bg: '#c084fc' },
                        { name: 'orange', bg: '#fb923c' },
                        { name: 'teal', bg: '#2dd4bf' },
                        { name: 'coral', bg: '#f87171' },
                      ].map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setActiveNoteColor(c.name)}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                            activeNoteColor === c.name
                              ? 'scale-125 ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-card)]'
                              : 'hover:scale-110 opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.bg }}
                          title={c.name}
                        />
                      ))}
                    </div>

                    <textarea
                      value={activeNoteText}
                      onChange={(e) => setActiveNoteText(e.target.value)}
                      placeholder="Write your note or comment for this section..."
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          if (activeNoteText.trim()) {
                            onAddAnnotation({
                              nodeId: node.id,
                              selectedText: '',
                              note: activeNoteText.trim(),
                              color: activeNoteColor,
                            });
                            setActiveNoteNodeId(null);
                            setActiveNoteText('');
                          }
                        } else if (e.key === 'Escape') {
                          setActiveNoteNodeId(null);
                        }
                      }}
                      className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg p-2.5 text-xs leading-relaxed border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent)] resize-y min-h-[60px]"
                    />

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">Cmd/Ctrl + Enter to save</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveNoteNodeId(null)}
                          className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!activeNoteText.trim()}
                          onClick={() => {
                            if (activeNoteText.trim()) {
                              onAddAnnotation({
                                nodeId: node.id,
                                selectedText: '',
                                note: activeNoteText.trim(),
                                color: activeNoteColor,
                              });
                              setActiveNoteNodeId(null);
                              setActiveNoteText('');
                            }
                          }}
                          className="px-3 py-1 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded-md text-xs font-semibold shadow-xs transition-opacity cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save Note
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Component-Level Note Cards */}
                {(() => {
                  const compNotes = (doc.annotations || []).filter(
                    (a) => a.node_id === node.id && !a.table_cell && (!a.selected_text || a.selected_text.trim() === '')
                  );
                  if (compNotes.length === 0) return null;
                  return (
                    <div className="space-y-2 mb-3">
                      {compNotes.map((cn) => {
                        const color = cn.color || 'yellow';
                        return (
                          <div
                            key={cn.id}
                            data-note-id={cn.id}
                            className={`vmd-component-note flex items-start justify-between gap-3 p-3 rounded-xl border bg-[var(--bg-card)] shadow-xs transition-all ${
                              color === 'emerald'
                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                : color === 'sky'
                                ? 'border-sky-500/40 bg-sky-500/5'
                                : color === 'rose'
                                ? 'border-rose-500/40 bg-rose-500/5'
                                : color === 'purple'
                                ? 'border-purple-500/40 bg-purple-500/5'
                                : color === 'orange'
                                ? 'border-orange-500/40 bg-orange-500/5'
                                : color === 'teal'
                                ? 'border-teal-500/40 bg-teal-500/5'
                                : color === 'coral'
                                ? 'border-red-500/40 bg-red-500/5'
                                : 'border-amber-500/40 bg-amber-500/5'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div
                                className="p-1 rounded-md shrink-0 mt-0.5"
                                style={{ backgroundColor: 'var(--accent-surface)' }}
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Section Note
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                    {new Date(cn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                                  {cn.note}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAnnotation(cn.id);
                              }}
                              className="text-[var(--text-muted)] hover:text-rose-500 p-1 rounded-md transition-colors shrink-0 cursor-pointer"
                              title="Delete note"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Render specific widget */}
                <ErrorBoundary fallbackTitle={`Unable to render ${node.type} block`}>
                  {(() => {
                    const nodeAnnotations = doc.annotations.filter((a) => a.node_id === node.id);
                    switch (node.type) {
                      case 'snippet':
                        return <CodeBox node={node as any} />;
                      case 'stepper':
                        return (
                          <Stepper
                            node={node as any}
                            annotations={nodeAnnotations}
                            onDeleteAnnotation={onDeleteAnnotation}
                          />
                        );
                      case 'canvas':
                        return <CanvasSandbox node={node as any} />;
                      case 'tabs':
                        return (
                          <TabsView
                            node={node as any}
                            annotations={nodeAnnotations}
                            onDeleteAnnotation={onDeleteAnnotation}
                          />
                        );
                      case 'callout':
                        return (
                          <CalloutBox
                            node={node as any}
                            annotations={nodeAnnotations}
                            onDeleteAnnotation={onDeleteAnnotation}
                          />
                        );
                      case 'metrics':
                        return <MetricsGrid node={node as any} />;
                      case 'quiz':
                        return <QuizBox node={node as any} />;
                      case 'markdown':
                        return (
                          <MarkdownRenderer
                            content={(node as any).content}
                            annotations={nodeAnnotations}
                            onDeleteAnnotation={onDeleteAnnotation}
                            onUpdateContent={(updatedContent) => {
                              if (!onUpdateContent) return;
                              if (doc.parsedDoc && doc.parsedDoc.nodes.length === 1 && node.type === 'markdown') {
                                onUpdateContent(updatedContent);
                              } else {
                                const oldContent = (node as any).content;
                                if (oldContent && doc.content.includes(oldContent)) {
                                  const newFullDoc = doc.content.replace(oldContent, updatedContent);
                                  onUpdateContent(newFullDoc);
                                } else {
                                  onUpdateContent(updatedContent);
                                }
                              }
                            }}
                          />
                        );
                      default:
                        return null;
                    }
                  })()}
                </ErrorBoundary>
              </div>
            );
          })}
        </div>

        {/* Document Footer with Copyright */}
        <footer className="mt-20 pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] pb-12">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">VisualMD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Copyright © {new Date().getFullYear()}</span>
            <a
              href="https://thisdarshiii.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--text-primary)] hover:text-blue-500 transition-colors underline decoration-[var(--border-color)] underline-offset-4 hover:decoration-blue-500"
              title="Visit Darshan Aguru's Blog"
            >
              Darshan Aguru
            </a>
          </div>
        </footer>
      </div>
    </div>

      {/* Document History & Version Control Drawer (In-Flow Aside) */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docId={doc.id}
        docTitle={doc.title}
        currentContent={doc.content}
        previewVersionId={previewVersion?.id}
        onPreviewVersion={setPreviewVersion}
        onRestoreVersion={async (versionId) => {
          await handleRestoreVersion(versionId);
          setPreviewVersion(null);
        }}
        onDocumentUpdated={(updatedDoc) => {
          if (updatedDoc) {
            if (onUpdateContent && updatedDoc.content) onUpdateContent(updatedDoc.content);
            if (onUpdateTitle && updatedDoc.title && updatedDoc.title !== doc.title) onUpdateTitle(updatedDoc.title);
          }
          setPreviewVersion(null);
        }}
      />
    </div>
  </div>
  );
};
