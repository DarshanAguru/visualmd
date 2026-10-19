import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  Coffee,
  Brain,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  X,
  CheckCircle2,
  Settings,
} from 'lucide-react';

import { BreakScreensaver } from './BreakScreensaver';
import { PomodoroToast, PomodoroToastData } from './PomodoroToast';
import { recordCompletedSession, recordStudyTime } from './StudyStatsModal';

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

interface PomodoroSettings {
  focusDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  soundEnabled: boolean;
  autoStartBreaks: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  soundEnabled: true,
  autoStartBreaks: false,
};

// Request HTML5 Browser Notification permission
function requestNotificationPermission() {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch {}
}

// Send Native Desktop Notification
function sendBrowserNotification(title: string, body: string) {
  try {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'visualmd-pomodoro',
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  } catch {}
}

// Synthesize a soft, pleasant chime using the Web Audio API that rings 2 to 3 times
function playChime(type: 'complete' | 'break', repeatCount = 3) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const baseTime = ctx.currentTime;

    for (let r = 0; r < repeatCount; r++) {
      const delay = r * 0.42; // Space rings ~420ms apart
      const t = baseTime + delay;

      if (type === 'complete') {
        // Melodic two-tone completion chime (E5 -> B5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, t); // E5
        osc2.frequency.setValueAtTime(987.77, t + 0.12); // B5

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(t);
        osc1.stop(t + 0.15);
        osc2.start(t + 0.12);
        osc2.stop(t + 0.4);
      } else {
        // Soft gentle tone for break start (C5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); // C5
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.38);
      }
    }
  } catch (err) {
    // Audio context may be restricted by browser autoplay policy before user interaction
  }
}

interface PomodoroTimerProps {
  onOpenSettings?: () => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onOpenSettings }) => {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('visualmd-pomodoro-settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('visualmd-pomodoro-sessions');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const getDurationForMode = useCallback(
    (m: PomodoroMode) => {
      switch (m) {
        case 'focus':
          return settings.focusDuration * 60;
        case 'short_break':
          return settings.shortBreakDuration * 60;
        case 'long_break':
          return settings.longBreakDuration * 60;
      }
    },
    [settings]
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => getDurationForMode('focus'));
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for settings changes dispatched from SettingsModal or storage events across tabs
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      let updatedSettings: Partial<PomodoroSettings> | null = null;
      if (e instanceof CustomEvent && e.detail) {
        updatedSettings = e.detail;
      } else if (e instanceof StorageEvent && e.key === 'visualmd-pomodoro-settings' && e.newValue) {
        try {
          updatedSettings = JSON.parse(e.newValue);
        } catch {}
      }

      if (updatedSettings) {
        setSettings((prev) => {
          const next = { ...prev, ...updatedSettings };

          // Determine duration delta for the current active mode
          const modeKey =
            mode === 'focus'
              ? 'focusDuration'
              : mode === 'short_break'
              ? 'shortBreakDuration'
              : 'longBreakDuration';

          const oldDuration = (prev[modeKey] || 25) * 60;
          const newDuration = (next[modeKey] || 25) * 60;

          if (oldDuration !== newDuration) {
            setTimeLeft((curTimeLeft) => {
              // If unstarted at full duration, update to new full duration
              if (curTimeLeft === oldDuration) {
                return newDuration;
              }
              // If in-progress (running or paused with elapsed time), adjust preserving elapsed time
              const elapsed = Math.max(0, oldDuration - curTimeLeft);
              return Math.max(1, newDuration - elapsed);
            });
          }

          return next;
        });
      }
    };

    window.addEventListener('visualmd:pomodoro-settings', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    return () => {
      window.removeEventListener('visualmd:pomodoro-settings', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, [mode, isRunning]);

  // Hydrate pomodoro settings and completed sessions from DB on initial mount
  useEffect(() => {
    fetch('/api/settings/pomodoro_settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.value) {
          try {
            const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            setSettings((prev) => {
              const updated = { ...prev, ...parsed };
              const oldFocus = (prev.focusDuration || 25) * 60;
              const newFocus = (updated.focusDuration || 25) * 60;
              setTimeLeft((cur) => (cur === oldFocus ? newFocus : cur));
              return updated;
            });
            localStorage.setItem('visualmd-pomodoro-settings', JSON.stringify(parsed));
          } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/settings/pomodoro_sessions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.value) {
          const parsed = parseInt(String(data.value), 10);
          if (!isNaN(parsed) && parsed >= 0) {
            setSessionsCompleted(parsed);
            localStorage.setItem('visualmd-pomodoro-sessions', String(parsed));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Persist session count locally and to DB
  useEffect(() => {
    localStorage.setItem('visualmd-pomodoro-sessions', String(sessionsCompleted));
    fetch('/api/settings/pomodoro_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: String(sessionsCompleted) }),
    }).catch(() => {});
  }, [sessionsCompleted]);

  // Break Screensaver State & Idle Tracking
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const idleTimeoutRef = useRef<any>(null);

  // Completion Toast Notification State
  const [toast, setToast] = useState<PomodoroToastData | null>(null);

  // Monitor idle activity during short/long break when running (activate screensaver after 6s of inactivity)
  useEffect(() => {
    const isBreak = (mode === 'short_break' || mode === 'long_break') && isRunning;
    if (!isBreak) {
      setIsScreensaverActive(false);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        setIsScreensaverActive(true);
      }, 6000);
    };

    resetIdleTimer();

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [mode, isRunning]);

  // Outside click handler for popover
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  // Real-time study & break time accumulator
  const accumulatedSecondsRef = useRef<{ focus: number; short_break: number; long_break: number }>({
    focus: 0,
    short_break: 0,
    long_break: 0,
  });

  // Flush accrued partial time (e.g. 20 mins of focus before reset, or break time)
  const flushAccruedTime = useCallback((targetMode: PomodoroMode) => {
    const secs = accumulatedSecondsRef.current[targetMode];
    if (secs >= 15) {
      // Round to nearest minute, minimum 1 min
      const mins = Math.max(1, Math.round(secs / 60));
      recordStudyTime(targetMode, mins, false);
    }
    accumulatedSecondsRef.current[targetMode] = 0;
  }, []);

  // Flush accrued time when user leaves or refreshes the window
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushAccruedTime(mode);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, flushAccruedTime]);

  // Timer Tick Engine with Real-Time Accuracy
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Accumulate 1 second for active mode
      accumulatedSecondsRef.current[mode] += 1;
      // Every 60 seconds, flush 1 minute to prevent any data loss
      if (accumulatedSecondsRef.current[mode] >= 60) {
        recordStudyTime(mode, 1, false);
        accumulatedSecondsRef.current[mode] -= 60;
      }

      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer finished
          clearInterval(interval);
          setIsRunning(false);

          // Flush any remaining partial seconds
          flushAccruedTime(mode);

          if (settings.soundEnabled) {
            playChime(mode === 'focus' ? 'complete' : 'break', 3);
          }

          if (mode === 'focus') {
            const nextCount = sessionsCompleted + 1;
            setSessionsCompleted(nextCount);
            // Mark completed session
            recordStudyTime('focus', 0, true);

            // Every 4 focus sessions, switch to long break
            const nextMode: PomodoroMode = nextCount % 4 === 0 ? 'long_break' : 'short_break';
            const nextMins = nextMode === 'long_break' ? settings.longBreakDuration : settings.shortBreakDuration;
            setMode(nextMode);
            setTimeLeft(getDurationForMode(nextMode));

            // Trigger completion Toast notification
            setToast({
              id: String(Date.now()),
              type: 'focus_complete',
              title: 'Focus Session Complete!',
              message: `Great job! Take a ${nextMins}-minute break to rest your eyes and recharge.`,
              nextMode,
              nextDurationMinutes: nextMins,
            });

            // Trigger HTML5 System Desktop Notification
            sendBrowserNotification(
              'VisualMD: Focus Session Complete! 🎯',
              `Great job! Time for a ${nextMins}-minute break to recharge.`
            );
          } else {
            const nextMode: PomodoroMode = 'focus';
            const nextMins = settings.focusDuration;
            setMode('focus');
            setTimeLeft(getDurationForMode('focus'));
            setIsScreensaverActive(false);

            // Trigger completion Toast notification
            setToast({
              id: String(Date.now()),
              type: 'break_complete',
              title: 'Break Finished!',
              message: `Feeling refreshed? Ready for your next ${nextMins}-minute focus session.`,
              nextMode,
              nextDurationMinutes: nextMins,
            });

            // Trigger HTML5 System Desktop Notification
            sendBrowserNotification(
              'VisualMD: Break Finished! ☕',
              `Ready to dive back into your engineering notebook?`
            );
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, sessionsCompleted, settings, getDurationForMode, flushAccruedTime]);

  const handleTogglePlay = () => {
    requestNotificationPermission();
    if (isRunning) {
      // Pausing: flush any accrued time so user's work is recorded immediately
      flushAccruedTime(mode);
    } else {
      // When starting a break, activate the serene frosted break overlay immediately
      if (mode === 'short_break' || mode === 'long_break') {
        setIsScreensaverActive(true);
      }
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    // Flush any accrued time before resetting so partial study time is never lost
    flushAccruedTime(mode);
    setIsRunning(false);
    setTimeLeft(getDurationForMode(mode));
  };

  const handleSwitchMode = (newMode: PomodoroMode) => {
    // Flush accrued time from previous mode
    flushAccruedTime(mode);
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getDurationForMode(newMode));
    if (newMode === 'focus') {
      setIsScreensaverActive(false);
    }
  };

  const handleToastAction = (nextMode: PomodoroMode) => {
    flushAccruedTime(mode);
    requestNotificationPermission();
    setMode(nextMode);
    setTimeLeft(getDurationForMode(nextMode));
    setIsRunning(true);
    if (nextMode === 'focus') {
      setIsScreensaverActive(false);
    } else {
      setIsScreensaverActive(true);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalModeDuration = getDurationForMode(mode);
  const progressPercent = Math.max(0, Math.min(100, ((totalModeDuration - timeLeft) / totalModeDuration) * 100));

  const modeBadge = {
    focus: { label: 'Focus', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30', icon: Brain },
    short_break: { label: 'Short Break', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', icon: Coffee },
    long_break: { label: 'Long Break', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30', icon: Sparkles },
  }[mode];

  const CurrentIcon = modeBadge.icon;

  return (
    <div className="relative" ref={containerRef}>
      {/* Pill Trigger Button in Top Nav */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer shadow-xs ${
          isRunning
            ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold'
            : 'bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
        title={`Pomodoro Study Timer (${modeBadge.label}): ${timeFormatted}`}
      >
        <span className="relative flex h-2 w-2">
          {isRunning && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isRunning
                ? 'bg-blue-500'
                : mode === 'focus'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
        </span>
        <span className="hidden sm:inline text-[11px] font-sans font-medium text-[var(--text-muted)]">
          {modeBadge.label}
        </span>
        <span className="font-semibold">{timeFormatted}</span>
        <ChevronDown
          className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Interactive Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[65]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-4 z-[70] animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold leading-tight">Pomodoro Study Timer</h4>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight">Focus & recharge intervals</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 mt-3 p-1 rounded-lg bg-[var(--bg-secondary)] text-[11px]">
              <button
                onClick={() => handleSwitchMode('focus')}
                className={`py-1.5 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  mode === 'focus'
                    ? 'bg-[var(--bg-card)] text-blue-500 shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Focus ({settings.focusDuration}m)
              </button>
              <button
                onClick={() => handleSwitchMode('short_break')}
                className={`py-1.5 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  mode === 'short_break'
                    ? 'bg-[var(--bg-card)] text-emerald-500 shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Short ({settings.shortBreakDuration}m)
              </button>
              <button
                onClick={() => handleSwitchMode('long_break')}
                className={`py-1.5 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  mode === 'long_break'
                    ? 'bg-[var(--bg-card)] text-purple-500 shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Long ({settings.longBreakDuration}m)
              </button>
            </div>

            {/* Main Countdown Display */}
            <div className="my-5 text-center">
              <div className="flex justify-center mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${modeBadge.color}`}>
                  <CurrentIcon className="w-3 h-3" />
                  <span>{modeBadge.label}</span>
                </span>
              </div>
              <div className="text-4xl font-extrabold font-mono tracking-tight my-1">
                {timeFormatted}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden mt-3">
                <div
                  className={`h-full transition-all duration-300 ${
                    mode === 'focus'
                      ? 'bg-blue-500'
                      : mode === 'short_break'
                      ? 'bg-emerald-500'
                      : 'bg-purple-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Play / Pause / Reset Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleReset}
                className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleTogglePlay}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                    <span>
                      {timeLeft < totalModeDuration && timeLeft > 0
                        ? 'Resume'
                        : `Start ${modeBadge.label}`}
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const nextMode: PomodoroMode = mode === 'focus' ? 'short_break' : 'focus';
                  handleSwitchMode(nextMode);
                }}
                className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Skip to next interval"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Session Stats & Sound Toggle */}
            <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  <strong>{sessionsCompleted}</strong> {sessionsCompleted === 1 ? 'session' : 'sessions'} completed
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSettings((prev) => {
                      const updated = { ...prev, soundEnabled: !prev.soundEnabled };
                      try {
                        localStorage.setItem('visualmd-pomodoro-settings', JSON.stringify(updated));
                        window.dispatchEvent(
                          new CustomEvent('visualmd:pomodoro-settings', { detail: updated })
                        );
                        fetch('/api/settings/pomodoro_settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ value: JSON.stringify(updated) }),
                        }).catch(() => {});
                      } catch {}
                      return updated;
                    });
                  }}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title={settings.soundEnabled ? 'Mute sound chime' : 'Enable sound chime'}
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>
              </div>
            </div>

            {/* Timer Settings Button so user can customize all timers and sounds as needed */}
            <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenSettings) onOpenSettings();
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[11px] text-[var(--text-primary)] font-medium flex items-center justify-between transition-colors cursor-pointer group"
                title="Change focus duration, short break, and long break in Settings"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Settings className="w-3.5 h-3.5 text-blue-500 group-hover:rotate-45 transition-transform" />
                  <span>Timer Settings</span>
                </span>
                <span className="text-[10px] text-blue-500 font-mono group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  <span>{settings.focusDuration}m / {settings.shortBreakDuration}m / {settings.longBreakDuration}m</span>
                  <span>→</span>
                </span>
              </button>
            </div>

            {/* If in break mode, allow 1-click ambient break screensaver */}
            {(mode === 'short_break' || mode === 'long_break') && (
              <div className="mt-2.5 pt-2.5 border-t border-[var(--border-color)]">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsScreensaverActive(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Open full-screen ambient break screensaver"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Break Screensaver</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Ambient Break Screensaver Overlay */}
      <BreakScreensaver
        isActive={isScreensaverActive && (mode === 'short_break' || mode === 'long_break')}
        mode={mode}
        timeLeft={timeLeft}
        timeFormatted={timeFormatted}
        totalDuration={totalModeDuration}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onAddMinute={() => setTimeLeft((prev) => prev + 60)}
        onDismiss={() => setIsScreensaverActive(false)}
        onSkipToFocus={() => {
          setIsScreensaverActive(false);
          handleSwitchMode('focus');
          setIsRunning(true);
        }}
      />

      {/* Completion Toast Alert & Notification */}
      <PomodoroToast
        toast={toast}
        onClose={() => setToast(null)}
        onAction={handleToastAction}
      />
    </div>
  );
};
