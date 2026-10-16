import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ThemeType } from '../../types';
import { VisualMDLogo } from '../brand/VisualMDLogo';
import {
  Settings,
  X,
  Palette,
  Columns,
  Type,
  Timer,
  HelpCircle,
  Keyboard,
  Info,
  Check,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ExternalLink,
  BookOpen,
  Layers,
  Code2,
  Tv,
  Volume2,
  VolumeX,
  Bot,
  Copy,
  Download,
  Loader2,
} from 'lucide-react';

export type SettingsTab = 'appearance' | 'reading' | 'pomodoro' | 'prompts' | 'help' | 'shortcuts' | 'about';

interface ThemeOption {
  id: ThemeType;
  name: string;
  category: 'Dark & Modern' | 'Light & Paper';
  bgHex: string;
  accentHex: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
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

export const FONT_SCALE_PRESETS = [
  { id: 'tiny', label: 'Extra Compact', percent: 75, scale: 0.75, desc: '75% - Maximum content density' },
  { id: 'compact', label: 'Compact', percent: 85, scale: 0.85, desc: '85% - Code & data intensive' },
  { id: 'small', label: 'Small', percent: 95, scale: 0.95, desc: '95% - Condensed reading' },
  { id: 'default', label: 'Default Normal', percent: 100, scale: 1.0, desc: '100% - Standard balanced size' },
  { id: 'reading', label: 'Comfortable', percent: 110, scale: 1.1, desc: '110% - Extended reading mode' },
  { id: 'medium', label: 'Medium', percent: 125, scale: 1.25, desc: '125% - High readability' },
  { id: 'large', label: 'Large', percent: 140, scale: 1.4, desc: '140% - Large text view' },
  { id: 'xlarge', label: 'Extra Large', percent: 160, scale: 1.6, desc: '160% - High visibility' },
  { id: 'projector', label: 'Projector', percent: 180, scale: 1.8, desc: '180% - Presentation / Projector' },
  { id: 'projector-2x', label: 'Projector 2x', percent: 200, scale: 2.0, desc: '200% - 4K Projector display' },
];

export type ContentWidthMode = 'compact' | 'standard' | 'wide' | 'projector';

export const WIDTH_PRESETS = [
  {
    id: 'compact' as ContentWidthMode,
    label: 'Compact Reader',
    iconLabel: 'Compact',
    className: 'max-w-3xl',
    desc: '768px - Ideal for 12" screens, split windows & narrow reading',
  },
  {
    id: 'standard' as ContentWidthMode,
    label: 'Standard',
    iconLabel: 'Normal',
    className: 'max-w-4xl',
    desc: '896px - Default balanced editorial width',
  },
  {
    id: 'wide' as ContentWidthMode,
    label: 'Wide Desktop',
    iconLabel: 'Wide',
    className: 'max-w-6xl',
    desc: '1152px - Spacious for tables, metrics & code',
  },
  {
    id: 'projector' as ContentWidthMode,
    label: 'Projector / Full Canvas',
    iconLabel: 'Projector',
    className: 'max-w-[95%] 2xl:max-w-[90%]',
    desc: 'Full Width - Fits conference projectors & ultra-wide displays',
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  contentWidth: ContentWidthMode;
  onContentWidthChange: (width: ContentWidthMode) => void;
  fontScaleIndex: number;
  onFontScaleIndexChange: (idx: number) => void;
  onOpenTutorial: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
  theme,
  onThemeChange,
  contentWidth,
  onContentWidthChange,
  fontScaleIndex,
  onFontScaleIndexChange,
  onOpenTutorial,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Pomodoro Settings from LocalStorage
  const [pomodoroSettings, setPomodoroSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('visualmd-pomodoro-settings');
      if (saved) {
        return {
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          soundEnabled: true,
          autoStartBreaks: false,
          ...JSON.parse(saved),
        };
      }
    } catch {}
    return {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      soundEnabled: true,
      autoStartBreaks: false,
    };
  });

  const updatePomodoroSetting = (key: string, value: any) => {
    setPomodoroSettings((prev: any) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('visualmd-pomodoro-settings', JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent('visualmd:pomodoro-settings', { detail: updated })
        );
        // Persist to server database asynchronously
        fetch('/api/settings/pomodoro_settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: JSON.stringify(updated) }),
        }).catch((err) => console.error('Failed to persist pomodoro settings to db:', err));
      } catch (err) {
        console.error('Failed to save pomodoro settings:', err);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      // Re-hydrate from localStorage first for 0ms responsiveness
      try {
        const saved = localStorage.getItem('visualmd-pomodoro-settings');
        if (saved) {
          setPomodoroSettings((prev: any) => ({ ...prev, ...JSON.parse(saved) }));
        }
      } catch {}

      // Also ensure latest from database
      fetch('/api/settings/pomodoro_settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.value) {
            const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            setPomodoroSettings((prev: any) => ({ ...prev, ...parsed }));
            localStorage.setItem('visualmd-pomodoro-settings', JSON.stringify(parsed));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        setPomodoroSettings((prev: any) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('visualmd:pomodoro-settings', handleSync);
    return () => window.removeEventListener('visualmd:pomodoro-settings', handleSync);
  }, []);

  // AI Prompts State
  const [promptSubTab, setPromptSubTab] = useState<'system-prompt' | 'skill' | 'standard'>('system-prompt');
  const [promptContent, setPromptContent] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState<boolean>(false);
  const [promptCopied, setPromptCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || activeTab !== 'prompts') return;
    setPromptLoading(true);
    setPromptCopied(false);

    fetch(`/api/prompts/${promptSubTab}`)
      .then((res) => (res.ok ? res.text() : 'Failed to load prompt.'))
      .then((text) => setPromptContent(text))
      .catch(() => setPromptContent('Error fetching prompt content.'))
      .finally(() => setPromptLoading(false));
  }, [promptSubTab, activeTab, isOpen]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptContent);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleDownloadPrompt = () => {
    window.open(`/api/prompts/${promptSubTab}?download=true`, '_blank');
  };

  if (!isOpen) return null;

  const currentScalePreset = FONT_SCALE_PRESETS[fontScaleIndex] || FONT_SCALE_PRESETS[3];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
      />

      {/* Modal Dialog with Fixed Dimensions across all tabs */}
      <div className="relative w-full max-w-4xl md:w-[890px] h-[640px] max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]">
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-56 h-full bg-[var(--bg-secondary)] border-b md:border-b-0 md:border-r border-[var(--border-color)] p-3 shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-2 flex items-center gap-2 mb-2">
              <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight uppercase text-[var(--text-primary)]">
                Preferences
              </span>
            </div>

            {[
              { id: 'appearance', label: 'Themes & Colors', icon: Palette },
              { id: 'reading', label: 'Canvas & Sizing', icon: Columns },
              { id: 'pomodoro', label: 'Study & Pomodoro', icon: Timer },
              { id: 'prompts', label: 'AI Prompts & Skills', icon: Bot },
              { id: 'help', label: 'Help & Guide', icon: HelpCircle },
              { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
              { id: 'about', label: 'About VisualMD', icon: Info },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-surface)] text-[var(--accent)] font-semibold border border-[var(--border-color)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:block pt-3 border-t border-[var(--border-color)] px-3 text-[10px] text-[var(--text-muted)] font-mono">
            VisualMD v1.0.242 • Release
          </div>
        </div>

        {/* Right Content Area with Fixed Full Height & Scrollable Body */}
        <div className="flex-1 flex flex-col h-full min-h-0 bg-[var(--bg-card)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 min-h-[64px]">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                {activeTab === 'appearance' && 'Themes & Color Palettes'}
                {activeTab === 'reading' && 'Canvas Width & Typography Scaling'}
                {activeTab === 'pomodoro' && 'Study Timer & Focus Intervals'}
                {activeTab === 'prompts' && 'AI Agent Prompts & Skills'}
                {activeTab === 'help' && 'Feature Guide & Interactive Tour'}
                {activeTab === 'shortcuts' && 'Keyboard Shortcuts Reference'}
                {activeTab === 'about' && 'About VisualMD Workspace'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {activeTab === 'appearance' && 'Choose high-contrast dark or gentle paper themes for long study sessions.'}
                {activeTab === 'reading' && 'Optimize reading canvas boundaries from 12" laptops to 4K projectors.'}
                {activeTab === 'pomodoro' && 'Configure custom focus and break durations for structured learning.'}
                {activeTab === 'prompts' && 'Ready-to-use prompt templates and agent skills for ChatGPT, Claude, and Gemini.'}
                {activeTab === 'help' && 'Explore interactive widgets, math rendering, and quick macro syntax.'}
                {activeTab === 'shortcuts' && 'Master productivity hotkeys for navigation, zoom, and presentations.'}
                {activeTab === 'about' && 'Local-first, reactive markdown engineering notebook for modern thinkers.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer shrink-0"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Dark Themes */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark & Cyber Modes</span>
                    <span className="text-[10px] font-normal lowercase opacity-70">(7 themes)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {THEME_OPTIONS.filter((t) => t.category === 'Dark & Modern').map((opt) => {
                      const isSelected = opt.id === theme;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onThemeChange(opt.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent-surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]'
                              : 'bg-[var(--bg-secondary)]/50 border-[var(--border-color)] hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-full shrink-0 border border-slate-700 flex items-center justify-center shadow-xs mt-0.5"
                            style={{ backgroundColor: opt.bgHex }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: opt.accentHex }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold leading-tight truncate">{opt.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-1">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Light & Paper Themes */}
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light, Notebook & Sepia Modes</span>
                    <span className="text-[10px] font-normal lowercase opacity-70">(4 themes)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {THEME_OPTIONS.filter((t) => t.category === 'Light & Paper').map((opt) => {
                      const isSelected = opt.id === theme;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onThemeChange(opt.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent-surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]'
                              : 'bg-[var(--bg-secondary)]/50 border-[var(--border-color)] hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-full shrink-0 border border-slate-300 flex items-center justify-center shadow-xs mt-0.5"
                            style={{ backgroundColor: opt.bgHex }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: opt.accentHex }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold leading-tight truncate">{opt.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-1">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. READING & CANVAS TAB */}
            {activeTab === 'reading' && (
              <div className="space-y-6">
                {/* Canvas Width Selection */}
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">Canvas Width Mode</h4>
                  <p className="text-[11px] text-[var(--text-muted)] mb-3">
                    Controls maximum line length for comfortable readability across screens.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {WIDTH_PRESETS.map((preset) => {
                      const isSelected = preset.id === contentWidth;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => onContentWidthChange(preset.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent-surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]'
                              : 'bg-[var(--bg-secondary)]/50 border-[var(--border-color)] hover:border-slate-400'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] mt-0.5">
                            {preset.id === 'projector' ? <Tv className="w-4 h-4 text-purple-500" /> : <Columns className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{preset.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-1">
                              {preset.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Scaling Section */}
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Font Size Scaling</h4>
                    <span className="font-mono text-xs text-blue-500 font-bold">
                      {currentScalePreset.percent}% ({currentScalePreset.label})
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mb-3">
                    Scales document headings, body, LaTeX equations, and reactive widgets proportionally.
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => onFontScaleIndexChange(Math.max(0, fontScaleIndex - 1))}
                      disabled={fontScaleIndex === 0}
                      className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Zoom Out (Ctrl + -)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>

                    <div className="flex-1 grid grid-cols-5 gap-1.5">
                      {[
                        { index: 1, label: '85%' },
                        { index: 3, label: '100%' },
                        { index: 5, label: '125%' },
                        { index: 7, label: '150%' },
                        { index: 8, label: '180%' },
                      ].map((chip) => {
                        const isCur = fontScaleIndex === chip.index;
                        return (
                          <button
                            key={chip.index}
                            onClick={() => onFontScaleIndexChange(chip.index)}
                            className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer text-center ${
                              isCur
                                ? 'bg-[var(--accent-surface)] border-[var(--accent)] text-[var(--accent)] font-bold'
                                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => onFontScaleIndexChange(Math.min(FONT_SCALE_PRESETS.length - 1, fontScaleIndex + 1))}
                      disabled={fontScaleIndex === FONT_SCALE_PRESETS.length - 1}
                      className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Zoom In (Ctrl + +)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. POMODORO STUDY TAB */}
            {activeTab === 'pomodoro' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">Focus & Break Intervals</h4>
                  <p className="text-[11px] text-[var(--text-muted)] mb-3">
                    Customize the Pomodoro rhythm that best supports your focus capacity.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                        Focus Duration
                      </label>
                      <select
                        value={pomodoroSettings.focusDuration}
                        onChange={(e) => updatePomodoroSetting('focusDuration', parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        {Array.from(new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 90, pomodoroSettings.focusDuration]))
                          .sort((a, b) => a - b)
                          .map((m) => (
                            <option key={m} value={m}>{m} minutes</option>
                          ))}
                      </select>
                    </div>

                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                        Short Break
                      </label>
                      <select
                        value={pomodoroSettings.shortBreakDuration}
                        onChange={(e) => updatePomodoroSetting('shortBreakDuration', parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        {Array.from(new Set([1, 2, 3, 5, 7, 10, 15, pomodoroSettings.shortBreakDuration]))
                          .sort((a, b) => a - b)
                          .map((m) => (
                            <option key={m} value={m}>{m} minutes</option>
                          ))}
                      </select>
                    </div>

                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                        Long Break
                      </label>
                      <select
                        value={pomodoroSettings.longBreakDuration}
                        onChange={(e) => updatePomodoroSetting('longBreakDuration', parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        {Array.from(new Set([5, 10, 15, 20, 25, 30, 45, pomodoroSettings.longBreakDuration]))
                          .sort((a, b) => a - b)
                          .map((m) => (
                            <option key={m} value={m}>{m} minutes</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        {pomodoroSettings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Audio Completion Chimes</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Play a soft, offline synthesized bell at interval completion</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={pomodoroSettings.soundEnabled}
                      onChange={(e) => updatePomodoroSetting('soundEnabled', e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. AI PROMPTS & SKILLS TAB */}
            {activeTab === 'prompts' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">Ready-to-Use Agent Prompts</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Equip ChatGPT, Claude, Gemini, or Cursor with VisualMD generation capabilities.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={handleCopyPrompt}
                      disabled={promptLoading || !promptContent}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-40"
                    >
                      {promptCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadPrompt}
                      disabled={promptLoading || !promptContent}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 text-xs font-semibold transition-opacity cursor-pointer disabled:opacity-40 shadow-xs"
                      title="Download prompt file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs: System Prompt / Skill / Standard */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  {[
                    { id: 'system-prompt', label: '1. System Prompt', desc: 'ChatGPT / Claude / Gemini' },
                    { id: 'skill', label: '2. Agent Skill (skill.md)', desc: 'Antigravity / Cursor' },
                    { id: 'standard', label: '3. Language Standard', desc: 'Full Spec & AST Grammar' },
                  ].map((sub) => {
                    const isSelected = promptSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setPromptSubTab(sub.id as any)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-2xs border border-[var(--border-color)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="text-xs font-medium leading-tight">{sub.label}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{sub.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Prompt Code Viewer */}
                <div className="relative rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 overflow-hidden flex flex-col">
                  <div className="px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
                    <span>
                      {promptSubTab === 'system-prompt' && 'prompts/system-prompt.md'}
                      {promptSubTab === 'skill' && 'prompts/skill.md'}
                      {promptSubTab === 'standard' && 'prompts/standard.md'}
                    </span>
                    <span>
                      {promptLoading ? 'Loading...' : `${promptContent.split(/\s+/).filter(Boolean).length} words • ${promptContent.split('\n').length} lines`}
                    </span>
                  </div>

                  <div className="p-3.5 max-h-[340px] overflow-y-auto font-mono text-[11px] leading-relaxed select-text whitespace-pre-wrap break-words text-[var(--text-primary)]">
                    {promptLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span>Loading prompt specification...</span>
                      </div>
                    ) : (
                      promptContent || 'No prompt content available.'
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. HELP & GUIDE TAB */}
            {activeTab === 'help' && (
              <div className="space-y-5">
                {/* Interactive Tour Card */}
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">Interactive Onboarding Walkthrough</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Launch the 5-step tutorial introducing widgets, math, and presentations.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTutorial();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Start Walkthrough
                  </button>
                </div>

                {/* Macro Syntax Quick Sheet */}
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2">VisualMD Macro Quick Reference</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { tag: '$STEPPER$ ... @1 ... @2 ... $END_STEPPER$', desc: 'Multi-step interactive process with step buttons' },
                      { tag: '$TABS$ ... @Tab1 ... @Tab2 ... $END_TABS$', desc: 'Tabbed code or architecture comparison blocks' },
                      { tag: '$METRICS$ ... - Metric: Value ... $END_METRICS$', desc: 'KPI cards with trend badges and clean formatting' },
                      { tag: '$QUIZ$ ... Question ... [x] Correct ... $END_QUIZ$', desc: 'Interactive self-grading knowledge quiz' },
                      { tag: '$CALLOUT type=tip$ ... $END_CALLOUT$', desc: 'Emphasized note, tip, warning, or danger callout' },
                      { tag: '$x^2 + y^2 = r^2$ or $$\\int f(x) dx$$', desc: 'KaTeX LaTeX inline and display math formula rendering' },
                    ].map((macro, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                        <code className="text-[11px] font-mono text-blue-500 font-semibold">{macro.tag}</code>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{macro.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. SHORTCUTS TAB */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: '⌘ / Ctrl + I', action: 'Open Settings & Preferences' },
                    { key: '⌘ / Ctrl + K', action: 'Global Document Search & Quick Open' },
                    { key: '⌘ / Ctrl + B', action: 'Toggle Navigation Sidebar' },
                    { key: '⌘ / Ctrl + J', action: 'Toggle Bookmarks & Notes Drawer' },
                    { key: 'P', action: 'Toggle Executive Slide Deck Presentation' },
                    { key: 'F', action: 'Toggle Fullscreen Reading in Browser' },
                    { key: 'Ctrl + / -', action: 'Increase or Decrease Font Scaling' },
                    { key: 'Ctrl + 0', action: 'Reset Font Scaling to 100%' },
                    { key: 'Ctrl + P', action: 'Export Clean PDF or Print Document' },
                    { key: 'Space / Right Arrow', action: 'Next Slide (Presentation Mode)' },
                    { key: 'Left Arrow', action: 'Previous Slide (Presentation Mode)' },
                    { key: 'Esc', action: 'Exit Presentation or Close Open Modal' },
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between"
                    >
                      <span className="text-[11px] text-[var(--text-secondary)]">{s.action}</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-mono font-semibold shadow-2xs">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <VisualMDLogo size={38} />
                    <div>
                      <h4 className="text-sm font-bold">VisualMD Specification Engine</h4>
                      <p className="text-xs text-[var(--text-muted)]">Version 1.0.242 • Production Ready</p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    VisualMD transforms static markdown into reactive, study-optimized technical notebooks with interactive stepper widgets, tabbed code comparison, KaTeX formulas, sandboxed code execution, and Git version control.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                  <div className="text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">Created by Darshan Aguru</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Read engineering essays & updates</div>
                  </div>
                  <a
                    href="https://thisdarshiii.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-medium text-blue-500 transition-colors"
                  >
                    <span>thisdarshiii.in</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
