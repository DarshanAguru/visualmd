import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, Brain, Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PomodoroMode } from './PomodoroTimer';

export interface PomodoroToastData {
  id: string;
  type: 'focus_complete' | 'break_complete';
  title: string;
  message: string;
  nextMode: PomodoroMode;
  nextDurationMinutes: number;
}

interface PomodoroToastProps {
  toast: PomodoroToastData | null;
  onClose: () => void;
  onAction: (nextMode: PomodoroMode) => void;
}

export const PomodoroToast: React.FC<PomodoroToastProps> = ({
  toast,
  onClose,
  onAction,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Auto close toast after 5 seconds (paused on hover)
  useEffect(() => {
    if (!toast || isHovered) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, isHovered, onClose]);

  if (!toast) return null;

  const isFocusComplete = toast.type === 'focus_complete';
  const Icon = isFocusComplete ? Coffee : Brain;
  const actionLabel = isFocusComplete
    ? `Start ${toast.nextDurationMinutes}m Break`
    : `Start ${toast.nextDurationMinutes}m Focus`;

  return createPortal(
    <div
      className="fixed top-5 right-5 z-[130] max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={onClose}
        className={`relative p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all cursor-pointer overflow-hidden ${
          isFocusComplete
            ? 'bg-slate-900/95 border-emerald-500/40 text-white shadow-emerald-500/10'
            : 'bg-slate-900/95 border-blue-500/40 text-white shadow-blue-500/10'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isFocusComplete
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                <span>{toast.title}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-snug">
                {toast.message}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 font-mono">
            Click anywhere or auto-closes in 5s
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(toast.nextMode);
              onClose();
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer shadow-md ${
              isFocusComplete
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 5-Second Animated Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all ${
              isFocusComplete ? 'bg-emerald-400' : 'bg-blue-400'
            } ${isHovered ? 'opacity-50' : 'animate-[shrink_5s_linear_forwards]'}`}
            style={{
              width: isHovered ? '100%' : undefined,
              animation: isHovered ? 'none' : 'shrink 5s linear forwards',
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
