import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, Sparkles, Play, Pause, ArrowRight, X, Eye, Heart } from 'lucide-react';
import { PomodoroMode } from './PomodoroTimer';

interface BreakScreensaverProps {
  isActive: boolean;
  mode: PomodoroMode;
  timeLeft: number;
  timeFormatted: string;
  totalDuration: number;
  isRunning: boolean;
  onTogglePlay: () => void;
  onDismiss: () => void;
  onSkipToFocus: () => void;
}

const MINDFUL_TIPS = [
  'Rest your eyes: Look at an object 20 feet away for 20 seconds.',
  'Hydrate: Grab a glass of water to keep your mind sharp.',
  'Stretch: Roll your shoulders back and relax your neck.',
  'Take three deep, slow breaths: Inhale clarity, exhale tension.',
  'Stand up: A quick 60-second walk refreshes your circulation.',
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
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  // Rotate mindful tips every 12 seconds during break
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % MINDFUL_TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Dismiss on mouse movement (with jitter threshold), keypress, or touch
  useEffect(() => {
    if (!isActive) {
      lastMousePos.current = null;
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!lastMousePos.current) {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = Math.abs(e.clientX - lastMousePos.current.x);
      const dy = Math.abs(e.clientY - lastMousePos.current.y);
      // Require at least 8px of movement to avoid optical sensor micro-jitter
      if (dx > 8 || dy > 8) {
        onDismiss();
      }
    };

    const handleKeyDown = () => {
      onDismiss();
    };

    const handleTouchStart = () => {
      onDismiss();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  const progressPercent = totalDuration > 0
    ? Math.max(0, Math.min(100, ((totalDuration - timeLeft) / totalDuration) * 100))
    : 0;

  const isShort = mode === 'short_break';
  const Icon = isShort ? Coffee : Sparkles;
  const badgeLabel = isShort ? 'Short Break' : 'Long Break & Recharge';
  const accentColor = isShort ? 'text-emerald-400' : 'text-purple-400';
  const glowBg = isShort
    ? 'from-emerald-500/10 via-teal-500/5 to-transparent'
    : 'from-purple-500/10 via-indigo-500/5 to-transparent';

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-between p-6 sm:p-10 bg-slate-950/92 backdrop-blur-xl text-white select-none animate-in fade-in duration-300 overflow-hidden cursor-default"
      onClick={(e) => {
        // Clicking outside interactive buttons dismisses screensaver
        if (e.target === e.currentTarget) {
          onDismiss();
        }
      }}
    >
      {/* Background Ambient Breathing Orb */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div
          className={`w-[500px] h-[500px] sm:w-[680px] sm:h-[680px] rounded-full bg-radial ${glowBg} blur-3xl opacity-60 animate-pulse`}
          style={{ animationDuration: '6s' }}
        />
      </div>

      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <Icon className={`w-4 h-4 ${accentColor}`} />
          <span className="text-xs font-semibold tracking-wide uppercase text-white/90">
            {badgeLabel}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 text-xs font-medium transition-all cursor-pointer backdrop-blur-md"
          title="Resume Workspace (Esc or Move Mouse)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Resume Workspace</span>
        </button>
      </div>

      {/* Center Breathing Circle & Timer */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto py-8">
        {/* Breathing Animation Ring */}
        <div className="relative flex items-center justify-center mb-6">
          <div
            className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-dashed ${
              isShort ? 'border-emerald-500/30' : 'border-purple-500/30'
            } animate-spin`}
            style={{ animationDuration: '30s' }}
          />
          <div
            className={`w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-white/15 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md shadow-2xl p-6 transition-transform`}
          >
            <span className="text-[11px] font-mono font-medium tracking-widest uppercase text-white/60 mb-1">
              Time Remaining
            </span>
            <div className="text-5xl sm:text-7xl font-extrabold font-mono tracking-tight text-white mb-2">
              {timeFormatted}
            </div>

            {/* Micro Progress Bar */}
            <div className="w-36 bg-white/10 rounded-full h-1 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isShort ? 'bg-emerald-400' : 'bg-purple-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mindful Tip */}
        <div className="max-w-md px-4 min-h-[48px] flex items-center justify-center">
          <p className="text-sm sm:text-base font-medium text-white/80 leading-relaxed transition-opacity animate-in fade-in duration-500">
            "{MINDFUL_TIPS[tipIndex]}"
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold transition-all cursor-pointer shadow-lg"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Break</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Timer</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkipToFocus();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg"
          >
            <span>Skip & Refocus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="relative z-10 text-center text-xs text-white/50 font-sans tracking-wide">
        Move your mouse, touch the screen, or press any key to dismiss
      </div>
    </div>,
    document.body
  );
};
