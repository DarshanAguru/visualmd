import React, { useState, useEffect, useRef } from 'react';
import { FullDocument, ThemeType, Folder } from '../../types';
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
} from 'lucide-react';

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
  onStartPresentation: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateScrollPosition: (scrollPos: number, nodeId: string | null) => void;
  onUpdateContent?: (newContent: string) => void;
  onMoveDoc?: (docId: string, folderId: string | null) => void;
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
  { id: 'huge', label: 'Maximum', percent: 180, scale: 1.8, desc: '180% - Presentation / Accessibility' },
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
  onStartPresentation,
  onUpdateTitle,
  onUpdateScrollPosition,
  onUpdateContent,
  onMoveDoc,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(doc.title);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const [activeNoteNodeId, setActiveNoteNodeId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState('');
  const [activeNoteColor, setActiveNoteColor] = useState('yellow');

  // Close folder menu on click outside
  useEffect(() => {
    if (!isFolderMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setIsFolderMenuOpen(false);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [isFolderMenuOpen]);

  // Granular Font Scale State (index 3 = 100% default)
  const [fontScaleIndex, setFontScaleIndex] = useState<number>(() => {
    const saved = localStorage.getItem('visualmd-font-scale-index');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < FONT_SCALE_PRESETS.length) {
        return parsed;
      }
    }
    return 3; // Default is index 3 (100%)
  });

  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadMarkdown = () => {
    const filename = `${(doc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.vmd`;
    const blob = new Blob([doc.content || ''], { type: 'text/markdown;charset=utf-8' });
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
    navigator.clipboard.writeText(doc.content || '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const wordCount = React.useMemo(() => {
    const text = (doc.content || '').trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [doc.content]);

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDone = useRef(false);

  const currentScalePreset = FONT_SCALE_PRESETS[fontScaleIndex] || FONT_SCALE_PRESETS[3];

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

  // Outside click handler for both theme and font dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setIsFontMenuOpen(false);
      }
    };
    if (isThemeMenuOpen || isFontMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen, isFontMenuOpen]);

  useEffect(() => {
    if (!isInitialScrollDone.current && scrollContainerRef.current) {
      if (doc.last_read_position && doc.last_read_position > 0) {
        scrollContainerRef.current.scrollTop = doc.last_read_position;
      }
      isInitialScrollDone.current = true;
    }
  }, [doc.id, doc.last_read_position]);

  const handleScroll = () => {
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
  };

  const handleSaveTitle = () => {
    if (titleText.trim() && titleText !== doc.title) {
      onUpdateTitle(titleText.trim());
    }
    setIsEditingTitle(false);
  };

  const parsedNodes = doc.parsedDoc?.nodes || [];

  const bookmarkNodeIds = new Set((doc.bookmarks || []).map((b) => b.node_id));

  const currentThemeObj =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden vmd-app">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-[var(--border-color)] px-4 md:px-6 flex items-center justify-between shrink-0 bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors">
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
              <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-sm md:max-w-md">
                {doc.title}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                title="Edit document title"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Folder Indicator Pill & Move Trigger */}
          {onMoveDoc && (
            <div className="relative shrink-0" ref={folderMenuRef}>
              <button
                onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--accent-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-color)] transition-colors"
                title="Move document to a different folder"
              >
                <FolderIcon className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="max-w-[120px] truncate">
                  {folders.find((f) => f.id === doc.folder_id)?.name || 'Root'}
                </span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>

              {isFolderMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl py-1 text-xs">
                  <div className="px-2.5 py-1 font-semibold text-[10px] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)]">
                    Move document to
                  </div>
                  <button
                    onClick={() => {
                      onMoveDoc(doc.id, null);
                      setIsFolderMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-[var(--bg-tertiary)] ${
                      !doc.folder_id ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <FolderInput className="w-3.5 h-3.5 opacity-60" />
                    <span>Root (No Folder)</span>
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        onMoveDoc(doc.id, f.id);
                        setIsFolderMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-[var(--bg-tertiary)] truncate ${
                        doc.folder_id === f.id ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Granular Font Scale Stepper & Dropdown */}
          <div className="relative" ref={fontMenuRef}>
            <div className="flex items-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] p-0.5 shadow-xs transition-colors">
              <button
                onClick={() => setFontScaleIndex((prev) => Math.max(0, prev - 1))}
                disabled={fontScaleIndex === 0}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                title="Decrease font size"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsFontMenuOpen((prev) => !prev)}
                className="px-2 py-0.5 text-[11px] font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors flex items-center gap-1"
                title="Select font size preset"
              >
                <Type className="w-3 h-3 text-[var(--text-muted)]" />
                <span>{currentScalePreset.percent}%</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
              <button
                onClick={() => setFontScaleIndex((prev) => Math.min(FONT_SCALE_PRESETS.length - 1, prev + 1))}
                disabled={fontScaleIndex === FONT_SCALE_PRESETS.length - 1}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                title="Increase font size"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Scale Presets Dropdown Menu */}
            {isFontMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 border-b border-[var(--border-color)] flex items-center justify-between text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <span>Font Size Scaling</span>
                  <span className="font-mono text-blue-500">{currentScalePreset.percent}%</span>
                </div>
                <div className="mt-1 space-y-0.5 max-h-72 overflow-y-auto">
                  {FONT_SCALE_PRESETS.map((preset, idx) => {
                    const isSelected = idx === fontScaleIndex;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setFontScaleIndex(idx);
                          setIsFontMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                          isSelected
                            ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold border border-[var(--border-color)]'
                            : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[11px] w-9 text-right font-medium">
                            {preset.percent}%
                          </span>
                          <div>
                            <div className="leading-tight">{preset.label}</div>
                            <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                              {preset.desc}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Presets Dropdown */}
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
              <span className="max-w-[120px] truncate hidden sm:inline">{currentThemeObj.name}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
                <div className="px-2.5 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                    <Palette className="w-3.5 h-3.5 text-blue-500" />
                    <span>Visual Themes & Palettes</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {THEME_OPTIONS.length} Themes
                  </span>
                </div>

                {/* Dark Themes Group */}
                <div className="mt-2">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-400" />
                    <span>Dark & Cyber Modes</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {THEME_OPTIONS.filter((t) => t.category === 'Dark & Modern').map((opt) => {
                      const isSelected = opt.id === theme;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            onThemeChange(opt.id);
                            setIsThemeMenuOpen(false);
                          }}
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
                              <div className="text-xs font-medium leading-tight truncate">
                                {opt.name}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] leading-tight truncate">
                                {opt.description}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Light & Paper Themes Group */}
                <div className="mt-3 pt-2 border-t border-[var(--border-color)]">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Light, Paper & Sepia Modes</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {THEME_OPTIONS.filter((t) => t.category === 'Light & Paper').map((opt) => {
                      const isSelected = opt.id === theme;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            onThemeChange(opt.id);
                            setIsThemeMenuOpen(false);
                          }}
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
                              <div className="text-xs font-medium leading-tight truncate">
                                {opt.name}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] leading-tight truncate">
                                {opt.description}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bookmarks & Notes Button */}
          <button
            onClick={onOpenNotesDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs"
          >
            <BookmarkIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Notes</span>
            {((doc.bookmarks?.length || 0) > 0 || (doc.annotations?.length || 0) > 0) && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-mono">
                {(doc.bookmarks?.length || 0) + (doc.annotations?.length || 0)}
              </span>
            )}
          </button>

          {/* AI Prompts Button */}
          <button
            onClick={onOpenPromptsModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs"
            title="Download AI Prompts & Skills"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">AI Prompts</span>
          </button>

          {/* Document Export & Print Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium transition-colors shadow-xs cursor-pointer"
              title="Export, download, or print document"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
            )}
          </div>

          {/* Slide Deck Presentation Mode */}
          <button
            onClick={onStartPresentation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 text-xs font-semibold shadow-xs transition-opacity"
            title="Present as Slides (P)"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Present</span>
          </button>
        </div>
      </header>

      {/* Main Content Scroll Area with Dynamic Font Scaling & Document Texture */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          '--vmd-font-scale': currentScalePreset.scale,
          fontSize: `${16 * currentScalePreset.scale}px`,
        } as React.CSSProperties}
        className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-6 md:px-16 py-10 max-w-4xl mx-auto w-full vmd-document-bg transition-colors"
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
            {doc.title}
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
  );
};
