import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Coffee,
  Sparkles,
  Play,
  Pause,
  ArrowRight,
  X,
  Eye,
  Plus,
  RefreshCw,
  Wind,
  Droplets,
  Heart,
} from 'lucide-react';
import { PomodoroMode } from './PomodoroTimer';

export interface BreakScreensaverProps {
  isActive: boolean;
  mode: PomodoroMode;
  timeLeft: number;
  timeFormatted: string;
  totalDuration: number;
  isRunning: boolean;
  onTogglePlay: () => void;
  onDismiss: () => void;
  onSkipToFocus: () => void;
  onAddMinute?: () => void;
}

interface MindfulTip {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}

const MINDFUL_TIPS: MindfulTip[] = [
  {
    category: 'Eye Relief',
    icon: Eye,
    title: 'The 20-20-20 Rule',
    text: 'Look at an object at least 20 feet away for 20 seconds to reset eye accommodation.',
  },
  {
    category: 'Hydration',
    icon: Droplets,
    title: 'Drink Water',
    text: 'A tall glass of cool water restores cellular hydration and prevents mental fatigue.',
  },
  {
    category: 'Posture & Body',
    icon: Heart,
    title: 'Shoulders & Spine',
    text: 'Roll your shoulders backward 5 times, unclench your jaw, and lengthen your spine.',
  },
  {
    category: 'Circulation',
    icon: Sparkles,
    title: 'Stand & Stretch',
    text: 'Stand up and take a brisk 60-second walk around your room to reactivate blood flow.',
  },
  {
    category: 'Mindfulness',
    icon: Wind,
    title: 'Box Breathing',
    text: 'Take 3 deep, rhythmic breaths: inhale calm focus for 4s, hold for 4s, exhale stress for 4s.',
  },
];

export const BreakScreensaver: React.FC<BreakScreensaverProps> = ({
  isActive,
  mode,
  timeLeft,
  timeFormatted,
  totalDuration,
  isRunning,
  onTogglePlay,
  onDismiss,
  onSkipToFocus,
  onAddMinute,
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [isBreathingGuideActive, setIsBreathingGuideActive] = useState(true);

  // Rotate mindful tips every 14 seconds
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % MINDFUL_TIPS.length);
    }, 14000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Guided breathing animation cycle: 4s Inhale, 4s Hold, 4s Exhale
  useEffect(() => {
    if (!isActive || !isBreathingGuideActive) return;
    const cycle = () => {
      setBreathPhase('inhale');
      const t1 = setTimeout(() => {
        setBreathPhase('hold');
        const t2 = setTimeout(() => {
          setBreathPhase('exhale');
        }, 4000);
        return () => clearTimeout(t2);
      }, 4000);
      return () => clearTimeout(t1);
    };

    cycle();
    const interval = setInterval(cycle, 12000);
    return () => clearInterval(interval);
  }, [isActive, isBreathingGuideActive]);

  // Dismiss on Escape key
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  const progressPercent =
    totalDuration > 0
      ? Math.max(0, Math.min(100, ((totalDuration - timeLeft) / totalDuration) * 100))
      : 0;

  const isShort = mode === 'short_break';
  const Icon = isShort ? Coffee : Sparkles;
  const badgeLabel = isShort ? 'Short Break' : 'Long Break & Recharge';

  // SVG Circular progress math (radius = 110, circumference = 2 * PI * 110 = 691.15)
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const currentTip = MINDFUL_TIPS[tipIndex];
  const TipIcon = currentTip.icon;

  const breathLabels = {
    inhale: 'Breathe in slowly...',
    hold: 'Hold your breath gently...',
    exhale: 'Exhale tension completely...',
  };

  const breathScaleClass = {
    inhale: 'scale-125 duration-[4000ms] shadow-[0_0_50px_rgba(16,185,129,0.4)]',
    hold: 'scale-125 duration-[4000ms] shadow-[0_0_60px_rgba(59,130,246,0.4)]',
    exhale: 'scale-90 duration-[4000ms] shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  }[breathPhase];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-between p-4 sm:p-7 bg-slate-950/75 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300 overflow-y-auto cursor-default"
      onClick={(e) => {
        // Clicking outer backdrop dismisses the overlay back to workspace
        if (e.target === e.currentTarget) {
          onDismiss();
        }
      }}
    >
      {/* Dynamic Background Ambient Aurora Glowing Orbs */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div
          className={`w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full bg-radial ${
            isShort
              ? 'from-emerald-500/20 via-teal-500/10 to-transparent'
              : 'from-purple-500/20 via-fuchsia-500/10 to-transparent'
          } blur-3xl opacity-80 animate-pulse`}
          style={{ animationDuration: '6s' }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-3xl opacity-50 animate-pulse"
          style={{ animationDuration: '8s', transform: 'translate(100px, -60px)' }}
        />
      </div>

      {/* Top Header Navigation */}
      <div className="w-full max-w-3xl flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg backdrop-blur-md">
          <div className={`p-1 rounded-full ${isShort ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase text-slate-100">
            {badgeLabel}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
        </div>

        {/* Right Controls: Resume Workspace + Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95"
            title="Minimize break overlay to top bar and resume reading (Esc)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Resume Reading</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors cursor-pointer shadow-md"
            title="Close overlay (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Centerpiece Floating Card: Timer & Meditation Breathing */}
      <div
        className="relative z-10 flex flex-col items-center text-center my-auto py-4 px-2 max-w-xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full bg-slate-900/85 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          {/* Circular SVG Timer Progress Ring */}
          <div className="relative flex items-center justify-center my-2">
            <svg className="w-64 h-64 sm:w-72 sm:h-72 -rotate-90 transform" viewBox="0 0 250 250">
              <defs>
                <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  {isShort ? (
                    <>
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </>
                  )}
                </linearGradient>
              </defs>

              {/* Background Track Circle */}
              <circle
                cx="125"
                cy="125"
                r={radius}
                className="stroke-slate-800/80"
                strokeWidth="8"
                fill="none"
              />

              {/* Animated Progress Circle */}
              <circle
                cx="125"
                cy="125"
                r={radius}
                stroke="url(#breakGradient)"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-linear drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              />
            </svg>

            {/* Content Inside Circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-slate-400 mb-1">
                {isShort ? 'RECHARGE & REST' : 'DEEP RECHARGE'}
              </span>

              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white my-1 tabular-nums drop-shadow-md">
                {timeFormatted}
              </div>

              {/* Running Status Pill */}
              <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className={isRunning ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {isRunning ? 'RUNNING' : 'PAUSED'}
                </span>
              </div>
            </div>
          </div>

          {/* Guided Box Breathing Widget */}
          {isBreathingGuideActive && (
            <div className="w-full mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center transition-transform ease-in-out ${breathScaleClass}`}
                >
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-200">
                    {breathLabels[breathPhase]}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    4s Inhale • 4s Hold • 4s Exhale
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsBreathingGuideActive(false)}
                className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline px-2 py-1"
                title="Hide breathing guide"
              >
                Hide
              </button>
            </div>
          )}

          {/* Mindful Tip Carousel Card */}
          <div className="w-full mt-4 px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left min-w-0">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <TipIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <span>{currentTip.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                    {currentTip.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug line-clamp-2 mt-0.5">
                  {currentTip.text}
                </p>
              </div>
            </div>

            <button
              onClick={() => setTipIndex((prev) => (prev + 1) % MINDFUL_TIPS.length)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Next Mindful Tip"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full">
            {/* Pause / Resume */}
            <button
              onClick={onTogglePlay}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md active:scale-95"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Break</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                  <span>Resume Timer</span>
                </>
              )}
            </button>

            {/* Quick +1m Extend Break */}
            {onAddMinute && (
              <button
                onClick={onAddMinute}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md active:scale-95"
                title="Add 1 minute to break timer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+1m</span>
              </button>
            )}

            {/* Skip & Refocus */}
            <button
              onClick={onSkipToFocus}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-lg active:scale-95 hover:shadow-emerald-500/25"
            >
              <span>Skip & Refocus</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="relative z-10 text-center text-xs font-medium text-slate-400 tracking-wide pb-1 shrink-0">
        Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[10px]">Esc</kbd> or click the blurred background to resume reading
      </div>
    </div>,
    document.body
  );
};
