import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Layers,
  Code2,
  Presentation,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowRight,
  Zap,
  Timer,
  Bot,
  Flame,
  LayoutGrid,
  FileCode,
} from 'lucide-react';
import { VisualMDLogo } from '../brand/VisualMDLogo';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemoDoc?: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenDemoDoc,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Slide 1: Interactive Static vs VisualMD toggle
  const [demoViewMode, setDemoViewMode] = useState<'visualmd' | 'static'>('visualmd');

  // Slide 2: Interactive Live Stepper Demo state
  const [activeDemoStep, setActiveDemoStep] = useState(0);

  if (!isOpen) return null;

  const totalSlides = 4;
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  const handleNext = () => {
    if (isLastSlide) {
      if (onOpenDemoDoc) {
        onOpenDemoDoc();
      } else {
        onClose();
      }
    } else {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const demoSteps = [
    {
      step: '1. Ingest Technical Specs',
      title: 'Prompt or Paste Specifications',
      desc: 'Ask your AI or paste existing Markdown notes. VisualMD parses both standard GFM and token-saving macros.',
      badge: 'Step 1 of 3',
      color: 'blue',
    },
    {
      step: '2. Reactive Visual Widgets',
      title: 'Compile Dynamic Architecture Cards',
      desc: 'Static lists become guided steppers, switchable tabs, metrics counters, and live sandboxed simulations.',
      badge: 'Step 2 of 3',
      color: 'purple',
    },
    {
      step: '3. Deep Study & Presentation',
      title: 'Master & Present Deep Knowledge',
      desc: 'Track study sessions with Pomodoro contribution streaks or press P to present as executive 16:9 slide decks.',
      badge: 'Step 3 of 3',
      color: 'emerald',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Tour</span>
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Step {currentSlideIndex + 1} of {totalSlides}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Close Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slide Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* SLIDE 1: What is VisualMD (Static vs VisualMD) */}
          {currentSlideIndex === 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                  <VisualMDLogo size={28} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    Welcome to VisualMD
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Transform boring static text notes into reactive, visual technical intelligence.
                  </p>
                </div>
              </div>

              {/* Interactive Before & After Showcase */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Interactive Comparison
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px]">
                    <button
                      onClick={() => setDemoViewMode('static')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        demoViewMode === 'static'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Ordinary Markdown
                    </button>
                    <button
                      onClick={() => setDemoViewMode('visualmd')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        demoViewMode === 'visualmd'
                          ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      ✨ VisualMD Reactive
                    </button>
                  </div>
                </div>

                {demoViewMode === 'static' ? (
                  <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-muted)] space-y-1">
                    <p className="text-[var(--text-primary)] font-bold"># Deep Work & Study Notes</p>
                    <p>- Active recall doubles memory retention</p>
                    <p>- Study sprints: 25 minutes focus, 5 minutes rest</p>
                    <p>- Feynman technique: explain concepts simply</p>
                    <p className="text-amber-500/80">⚠️ Plain text notes are static, easy to forget, and hard to navigate.</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border-2 border-blue-500/40 text-[11px] space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        ⚡ Interactive Study & Notes
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                        98% Retention
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                        <span className="text-[var(--text-muted)] block">Focus Session:</span>
                        <strong className="text-blue-500 text-xs font-mono">25m Flow State</strong>
                      </div>
                      <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                        <span className="text-[var(--text-muted)] block">Memory Score:</span>
                        <strong className="text-purple-500 text-xs font-mono">3x Faster Recall</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Interactive widgets, steppers, and study tracking right in your notes!</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 2: Interactive Live Stepper Widget (No Code Fatigue!) */}
          {currentSlideIndex === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    Interactive Widgets You Can Click
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Zero raw HTML or complex setups. Try clicking the steps below to experience it live:
                  </p>
                </div>
              </div>

              {/* LIVE CLICKABLE STEPPER DEMO */}
              <div className="rounded-xl border-2 border-purple-500/30 bg-[var(--bg-secondary)]/40 p-4 space-y-3">
                {/* Step Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                  {demoSteps.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveDemoStep(idx)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeDemoStep === idx
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Step {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Active Step Card */}
                <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      {demoSteps[activeDemoStep].badge}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {demoSteps[activeDemoStep].step}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {demoSteps[activeDemoStep].title}
                  </h3>

                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {demoSteps[activeDemoStep].desc}
                  </p>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveDemoStep((prev) => (prev + 1) % demoSteps.length)}
                      className="px-3 py-1 rounded-md bg-purple-600/15 hover:bg-purple-600/25 text-purple-600 dark:text-purple-400 font-semibold text-xs border border-purple-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Slide Decks & Study Activity Heatmap */}
          {currentSlideIndex === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  <Presentation className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    Presentations & Study Focus
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Engineered for high-performing tech professionals and students.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Slide Deck Mode */}
                <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Presentation className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">1-Click Slide Deck</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] font-mono text-[10px]">P</kbd> to turn your notes into an executive 16:9 presentation with laser pointer & whiteboard drawing.
                  </p>
                </div>

                {/* 2. Pomodoro & Activity Heatmap */}
                <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Flame className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Study Streaks & Heatmap</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Standard 25-minute focus intervals logged to your GitHub-style activity contribution calendar and streak tracker.
                  </p>
                </div>
              </div>

              {/* Theme & Typography Notice */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-[var(--text-secondary)] flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  <strong>7 Curated High-Contrast Themes:</strong> Obsidian Dark, Midnight Navy, Tokyo Night, CRT Terminal, Clean Paper, Warm Notebook, and Sepia!
                </span>
              </div>
            </div>
          )}

          {/* SLIDE 4: Prompt Any AI (ChatGPT, Claude, Cursor) */}
          {currentSlideIndex === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    Prompt Any AI to Write Visual Docs
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Use ChatGPT, Claude, Gemini, or Cursor to generate rich documents for you.
                  </p>
                </div>
              </div>

              {/* 3 Step Visual Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-1.5">
                  <span className="font-bold text-blue-500 flex items-center gap-1">
                    <span>1. Copy AI Prompt</span>
                  </span>
                  <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                    Click <strong>"AI Prompts"</strong> in the top header to copy the prompt template or download <code>skill.md</code>.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-1.5">
                  <span className="font-bold text-indigo-500 flex items-center gap-1">
                    <span>2. Paste into Chat</span>
                  </span>
                  <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                    Paste into ChatGPT, Claude, or add to your Cursor rules.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-1.5">
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <span>3. View in VisualMD</span>
                  </span>
                  <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                    Save the output as <code>.vmd</code> and drop it into <code>data/</code> to view immediately!
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>You're all set! Click below to explore a live interactive document right now.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlideIndex === idx
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-[var(--border-color)] hover:bg-slate-400'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstSlide && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-opacity cursor-pointer ${
                isLastSlide
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90'
              }`}
            >
              <span>{isLastSlide ? 'Explore Live Demo Document' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
