import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Coffee,
  Trophy,
  Award,
  Zap,
} from 'lucide-react';

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD
  sessions: number; // completed focus sessions
  focusMinutes: number; // total focus time in minutes (tracks partials like 20 mins!)
  shortBreakMinutes: number; // total short break time in minutes
  longBreakMinutes: number; // total long break time in minutes
  minutes: number; // total focus minutes for backward compatibility
  lastUpdated?: number;
}

export interface StreakMilestone {
  days: number;
  title: string;
  badge: string;
  iconColor: string;
  animation: string;
  pillClass: string;
  desc: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 7,
    title: 'Habit Builder',
    badge: 'Bronze',
    iconColor: 'text-amber-500',
    animation: 'animate-pulse',
    pillClass: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
    desc: '7-day habit formed! The foundational learning routine is set.',
  },
  {
    days: 30,
    title: 'Deep Worker',
    badge: 'Silver',
    iconColor: 'text-sky-400',
    animation: 'animate-bounce',
    pillClass: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    desc: '30 consecutive days! 1 full month of deep cognitive endurance.',
  },
  {
    days: 60,
    title: 'Focus Master',
    badge: 'Gold',
    iconColor: 'text-yellow-400',
    animation: 'animate-pulse scale-110',
    pillClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    desc: '60 days strong! Two full months of uninterrupted study momentum.',
  },
  {
    days: 90,
    title: 'Mind Fortress',
    badge: 'Ruby',
    iconColor: 'text-rose-500',
    animation: 'animate-bounce scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]',
    pillClass: 'bg-rose-500/10 border-rose-500/30 text-rose-500',
    desc: '90 days of discipline. A complete quarter of unstoppable focus!',
  },
  {
    days: 120,
    title: 'Unstoppable',
    badge: 'Sapphire',
    iconColor: 'text-blue-500',
    animation: 'animate-pulse scale-115 drop-shadow-[0_0_10px_rgba(59,130,246,0.7)]',
    pillClass: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
    desc: '120 days achieved. You have entered the top tier of consistency.',
  },
  {
    days: 180,
    title: 'Half-Year Legend',
    badge: 'Amethyst',
    iconColor: 'text-purple-400',
    animation: 'animate-bounce scale-115 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]',
    pillClass: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    desc: '180 days (half a year)! Monumental mental stamina and dedication.',
  },
  {
    days: 270,
    title: 'Grandmaster',
    badge: 'Emerald Dragon',
    iconColor: 'text-emerald-400',
    animation: 'animate-pulse scale-120 drop-shadow-[0_0_14px_rgba(52,211,153,0.85)]',
    pillClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    desc: '270 days of mastery. Three quarters of a year in the deep work zone.',
  },
  {
    days: 360,
    title: 'Titan of Focus',
    badge: 'Prismatic Diamond',
    iconColor: 'text-amber-300',
    animation: 'animate-bounce scale-125 drop-shadow-[0_0_16px_rgba(251,191,36,0.95)]',
    pillClass: 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border-amber-400/50 text-amber-300',
    desc: '360 days of pure excellence! Over a year of continuous learning mastery.',
  },
];

interface StudyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCompletedSessions?: number;
}

const STORAGE_KEY = 'visualmd-study-activity';

export function getStoredStudyActivity(): Record<string, DailyStudyRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch {}
  return {};
}

export function toLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Record study time dynamically for focus or breaks.
 * Tracks partial minutes (e.g. 20 mins of focus before reset) as well as break time.
 */
export function recordStudyTime(
  mode: 'focus' | 'short_break' | 'long_break',
  minutes: number,
  isSessionCompleted = false
): Record<string, DailyStudyRecord> {
  if (minutes <= 0 && !isSessionCompleted) {
    return getStoredStudyActivity();
  }

  const now = new Date();
  const dateKey = toLocalDateStr(now); // Local YYYY-MM-DD
  const current = getStoredStudyActivity();

  const existing = current[dateKey] || {
    date: dateKey,
    sessions: 0,
    focusMinutes: 0,
    shortBreakMinutes: 0,
    longBreakMinutes: 0,
    minutes: 0,
  };

  const focusMins = (existing.focusMinutes || existing.minutes || 0) + (mode === 'focus' ? minutes : 0);
  const shortBreakMins = (existing.shortBreakMinutes || 0) + (mode === 'short_break' ? minutes : 0);
  const longBreakMins = (existing.longBreakMinutes || 0) + (mode === 'long_break' ? minutes : 0);
  const newSessions = existing.sessions + (isSessionCompleted ? 1 : 0);

  const updated: Record<string, DailyStudyRecord> = {
    ...current,
    [dateKey]: {
      date: dateKey,
      sessions: newSessions,
      focusMinutes: focusMins,
      shortBreakMinutes: shortBreakMins,
      longBreakMinutes: longBreakMins,
      minutes: focusMins, // backward-compatibility
      lastUpdated: Date.now(),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Persist to server SQLite settings as well
    fetch('/api/settings/study_activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(updated) }),
    }).catch(() => {});
  } catch {}

  return updated;
}

export function getMinFocusThreshold(): number {
  try {
    const raw = localStorage.getItem('visualmd-pomodoro-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const dur = Number(parsed.focusDuration);
      if (!isNaN(dur) && dur > 0) {
        return dur;
      }
    }
  } catch {}
  return 25;
}

export function recordCompletedSession(minutes = 25): Record<string, DailyStudyRecord> {
  return recordStudyTime('focus', minutes, true);
}

function formatDateDisplay(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface CalendarDay {
  dateStr: string;
  dayOfWeek: number; // 0 = Sun .. 6 = Sat
  month: number; // 0-11
  dayOfMonth: number;
  record?: DailyStudyRecord;
  isFuture: boolean;
}

interface WeekColumn {
  weekIndex: number;
  monthLabel?: string;
  days: CalendarDay[];
}

export const StudyStatsModal: React.FC<StudyStatsModalProps> = ({
  isOpen,
  onClose,
  totalCompletedSessions = 0,
}) => {
  const [minFocusThreshold, setMinFocusThreshold] = useState<number>(getMinFocusThreshold);
  const [calendarRange, setCalendarRange] = useState<'3m' | '6m' | '1y'>('6m');
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    sessions: number;
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
  } | null>(null);

  // Keep threshold in sync with Pomodoro settings changes
  useEffect(() => {
    const handleSettingsSync = () => {
      setMinFocusThreshold(getMinFocusThreshold());
    };
    window.addEventListener('visualmd:pomodoro-settings', handleSettingsSync);
    window.addEventListener('storage', handleSettingsSync);
    return () => {
      window.removeEventListener('visualmd:pomodoro-settings', handleSettingsSync);
      window.removeEventListener('storage', handleSettingsSync);
    };
  }, []);

  const activityData = useMemo(() => {
    return getStoredStudyActivity();
  }, [isOpen]);

  // Generate responsive weeks ending strictly at today (13 weeks for 3m, 26 weeks for 6m, 52 weeks for 1y)
  const { weeks } = useMemo(() => {
    const today = new Date();
    const todayStr = toLocalDateStr(today);
    // Align week from Monday (0) to Sunday (6)
    const dayOfWeek = (today.getDay() + 6) % 7;
    const daysUntilSunday = 6 - dayOfWeek;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilSunday);

    const totalWeeks = calendarRange === '3m' ? 13 : calendarRange === '6m' ? 26 : 52;
    const totalDays = totalWeeks * 7;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (totalDays - 1));

    const weeksList: WeekColumn[] = [];
    let lastSeenMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const daysInWeek: CalendarDay[] = [];
      let weekMonthLabel: string | undefined = undefined;

      for (let d = 0; d < 7; d++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + (w * 7 + d));
        const dateStr = toLocalDateStr(current);
        const month = current.getMonth();
        const dayOfMonth = current.getDate();
        const rec = activityData[dateStr];
        const isFuture = dateStr > todayStr;

        // Detect month label on column start for past/present days
        if (month !== lastSeenMonth && d <= 3 && !isFuture) {
          lastSeenMonth = month;
          weekMonthLabel = current.toLocaleDateString(undefined, { month: 'short' });
        }

        daysInWeek.push({
          dateStr,
          dayOfWeek: d,
          month,
          dayOfMonth,
          record: rec,
          isFuture,
        });
      }

      weeksList.push({
        weekIndex: w,
        monthLabel: weekMonthLabel,
        days: daysInWeek,
      });
    }

    return { weeks: weeksList };
  }, [activityData, calendarRange]);

  // Compute Streaks & Metrics based strictly on user-configured focus duration threshold
  const stats = useMemo(() => {
    const todayStr = toLocalDateStr(new Date());

    let totalFocusMinutes = 0;
    let totalShortBreakMinutes = 0;
    let totalLongBreakMinutes = 0;
    let totalSessions = 0;
    const activeDates = new Set<string>();

    Object.values(activityData).forEach((r) => {
      if (r) {
        // Timeline is bounded up to today - never include future anomalies
        if (r.date > todayStr) return;

        const focusMins = r.focusMinutes ?? r.minutes ?? (r.sessions * minFocusThreshold) ?? 0;
        const shortBreakMins = r.shortBreakMinutes ?? 0;
        const longBreakMins = r.longBreakMinutes ?? 0;
        totalFocusMinutes += focusMins;
        totalShortBreakMinutes += shortBreakMins;
        totalLongBreakMinutes += longBreakMins;
        totalSessions += r.sessions || 0;

        // Streak day is counted if and only if focused minutes reach the user's min focus threshold
        if (focusMins >= minFocusThreshold) {
          activeDates.add(r.date);
        }
      }
    });

    if (totalCompletedSessions > totalSessions) {
      totalSessions = totalCompletedSessions;
      if (totalFocusMinutes === 0) {
        totalFocusMinutes = totalSessions * minFocusThreshold;
      }
    }

    let currentStreak = 0;
    const checkDate = new Date();
    if (!activeDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const checkStr = toLocalDateStr(checkDate);
      if (activeDates.has(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const sortedDates = Array.from(activeDates).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dStr of sortedDates) {
      const [y, m, d] = dStr.split('-').map(Number);
      const cur = new Date(y, m - 1, d);
      if (prevDate) {
        const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = cur;
    }

    const todayRecord = activityData[todayStr] || {
      sessions: 0,
      focusMinutes: 0,
      shortBreakMinutes: 0,
      longBreakMinutes: 0,
      minutes: 0,
    };

    const todayFocusMins = todayRecord.focusMinutes ?? todayRecord.minutes ?? (todayRecord.sessions * minFocusThreshold) ?? 0;
    const todayShortMins = todayRecord.shortBreakMinutes ?? 0;
    const todayLongMins = todayRecord.longBreakMinutes ?? 0;
    const totalBreakMinutes = totalShortBreakMinutes + totalLongBreakMinutes;
    const isTodayActive = todayFocusMins >= minFocusThreshold;

    return {
      activeDays: activeDates.size,
      totalSessions,
      totalFocusHours: (totalFocusMinutes / 60).toFixed(1),
      totalFocusMinutes,
      totalBreakMinutes,
      totalShortBreakMinutes,
      totalLongBreakMinutes,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      todaySessions: todayRecord.sessions || 0,
      todayFocusMinutes: todayFocusMins,
      todayShortMinutes: todayShortMins,
      todayLongMinutes: todayLongMins,
      minFocusThreshold,
      isTodayActive,
      todayStr,
    };
  }, [activityData, totalCompletedSessions, minFocusThreshold]);

  if (!isOpen) return null;

  const currentStreak = stats.currentStreak;
  const nextMilestone =
    STREAK_MILESTONES.find((m) => m.days > currentStreak) ||
    STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const highestUnlockedMilestone = [...STREAK_MILESTONES]
    .reverse()
    .find((m) => m.days <= currentStreak);

  let streakAnimationClass = 'text-orange-500';
  if (highestUnlockedMilestone) {
    streakAnimationClass = `${highestUnlockedMilestone.iconColor} ${highestUnlockedMilestone.animation}`;
  } else if (currentStreak > 0) {
    streakAnimationClass = 'text-orange-500 animate-pulse';
  } else {
    streakAnimationClass = 'text-[var(--text-muted)]';
  }

  const milestoneFractionText = `${currentStreak}/${nextMilestone.days} days streak`;
  const progressPercent = Math.min(100, Math.round((currentStreak / nextMilestone.days) * 100));
  const daysRemaining = Math.max(0, nextMilestone.days - currentStreak);

  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-xs transition-transform ${streakAnimationClass}`}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Study Activity & LeetCode Heatmap</span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  {stats.activeDays} Streak Days (≥{stats.minFocusThreshold}m)
                </span>
                {highestUnlockedMilestone && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border hidden sm:inline-flex items-center gap-1 ${highestUnlockedMilestone.pillClass}`}>
                    <Award className="w-3 h-3" />
                    <span>{highestUnlockedMilestone.badge}</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Annual contribution calendar tracking focus sprints, partial study time, and milestone streaks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Current Streak */}
            <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                <span>Study Streak</span>
                <Flame className={`w-4 h-4 transition-transform ${streakAnimationClass}`} />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono flex items-baseline gap-1.5">
                <span>{stats.currentStreak}</span>
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {stats.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-medium font-mono text-orange-500 pt-0.5">
                <span className="truncate" title={milestoneFractionText}>🔥 {milestoneFractionText}</span>
                <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded font-mono shrink-0" title={`Daily Streak Goal: ≥${stats.minFocusThreshold}m focused study`}>
                  ≥{stats.minFocusThreshold}m/d
                </span>
              </div>
            </div>

            {/* Total Focus Hours */}
            <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                <span>Focus Time</span>
                <Clock className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
                {stats.totalFocusHours} <span className="text-xs font-normal text-[var(--text-muted)]">hrs</span>
              </div>
              <span className="text-[10px] text-blue-500 font-medium font-mono">
                🎯 {stats.todayFocusMinutes}/{stats.minFocusThreshold}m today {stats.isTodayActive ? '🔥' : ''}
              </span>
            </div>

            {/* Rest & Breaks */}
            <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                <span>Rest & Breaks</span>
                <Coffee className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
                {stats.totalBreakMinutes} <span className="text-xs font-normal text-[var(--text-muted)]">mins</span>
              </div>
              <span className="text-[10px] text-purple-400 font-medium font-mono truncate" title={`Short: ${stats.todayShortMinutes}m | Long: ${stats.todayLongMinutes}m`}>
                ☕ Today: {stats.todayShortMinutes}m S / {stats.todayLongMinutes}m L
              </span>
            </div>

            {/* Completed Sessions */}
            <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                <span>Total Sessions</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
                {stats.totalSessions}{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">done</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-medium font-mono">
                ✅ {stats.todaySessions} completed today
              </span>
            </div>
          </div>

          {/* Streak Milestones & Motivation Banner */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs transition-transform ${streakAnimationClass}`}>
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Milestone Streak: {milestoneFractionText}
                    </span>
                    {highestUnlockedMilestone ? (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${highestUnlockedMilestone.pillClass}`}>
                        <Trophy className="w-3 h-3" />
                        <span>{highestUnlockedMilestone.badge} ({highestUnlockedMilestone.days}d Achieved)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border bg-orange-500/10 border-orange-500/20 text-orange-500 inline-flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Aiming for 7-Day Habit Builder</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {daysRemaining > 0
                      ? `${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'} to unlock "${nextMilestone.title}" (${nextMilestone.badge})! Keep up the momentum! 🔥`
                      : `Incredible dedication! You have achieved the ${nextMilestone.title} milestone! 🌠`}
                  </p>
                </div>
              </div>

              {/* Progress Percentage Badge */}
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] shrink-0">
                <span className="text-emerald-500">{progressPercent}%</span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">to {nextMilestone.days}d</span>
              </div>
            </div>

            {/* Visual Milestone Progress Bar */}
            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/60 dark:border-zinc-700/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>

            {/* Streak Milestone Badges Strip (7, 30, 60, 90, 120, 180, 270, 360+ days) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-[10px] font-mono">
              {STREAK_MILESTONES.map((m) => {
                const isAchieved = currentStreak >= m.days;
                return (
                  <div
                    key={m.days}
                    className={`px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 transition-all ${
                      isAchieved
                        ? `${m.pillClass} font-bold shadow-xs scale-102`
                        : 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/50 text-[var(--text-muted)] opacity-60'
                    }`}
                    title={`${m.title} (${m.badge}): ${m.days} days streak. ${m.desc}`}
                  >
                    <Flame className={`w-3 h-3 ${isAchieved ? m.animation : 'opacity-40'}`} />
                    <span>{m.days}d</span>
                    {isAchieved ? (
                      <span className="text-[9px] font-bold">✓</span>
                    ) : (
                      <span className="text-[9px] opacity-40">🔒</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LeetCode Style Contribution Calendar */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 space-y-3">
            {/* Header with Title, Range Switcher & Shading Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {stats.activeDays} active days ({calendarRange === '3m' ? 'last 3 months' : calendarRange === '6m' ? 'last 6 months' : 'last year'})
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Range Filter Buttons */}
                <div className="flex items-center gap-0.5 bg-[var(--bg-card)] p-0.5 rounded-lg border border-[var(--border-color)] text-[10px] font-medium font-mono">
                  {(['3m', '6m', '1y'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setCalendarRange(r)}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        calendarRange === r
                          ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {r === '3m' ? '3 Months' : r === '6m' ? '6 Months' : '1 Year'}
                    </button>
                  ))}
                </div>

                {/* Shading Intensity Legend */}
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono">
                  <span>Less</span>
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/80" title="0 mins (No activity)" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-300 dark:bg-emerald-900/80 border border-emerald-400 dark:border-emerald-800" title="1-24 mins (Partial)" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600" title="25-49 mins (1 Session)" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-500 border border-emerald-400 dark:border-emerald-400" title="50-99 mins (2-3 Sessions)" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300" title="100+ mins (Deep Focus)" />
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Responsive Grid Container */}
            <div
              className="overflow-x-auto pb-1 pt-0.5 scrollbar-thin"
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div className="inline-flex gap-1.5 min-w-full">
                {/* Sticky Left Day of Week Labels (Mon to Sun) */}
                <div className="sticky left-0 bg-[var(--bg-card)]/95 backdrop-blur-xs flex flex-col gap-1 text-[9px] text-[var(--text-muted)] font-mono select-none shrink-0 w-7 z-20">
                  <div className="h-3.5 select-none" />
                  <div className="flex flex-col gap-[3px]">
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Mon</span>
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Tue</span>
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Wed</span>
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Thu</span>
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Fri</span>
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Sat</span>
                    <span className="h-2.5 sm:h-3 flex items-center leading-none">Sun</span>
                  </div>
                </div>

                {/* Week Columns with Month Labels on Top */}
                <div className="inline-flex gap-[3px]">
                  {weeks.map((week) => (
                    <div key={week.weekIndex} className="flex flex-col gap-1 items-center">
                      {/* Month Label Header */}
                      <div className="h-3.5 text-[9px] font-mono text-[var(--text-muted)] font-medium select-none truncate">
                        {week.monthLabel || ''}
                      </div>

                      {/* 7 Day Cells */}
                      <div className="flex flex-col gap-[3px]">
                        {week.days.map((day) => {
                          if (day.isFuture) {
                            return (
                              <div
                                key={day.dateStr}
                                aria-hidden="true"
                                className="w-2.5 sm:w-3 h-2.5 sm:h-3 invisible pointer-events-none select-none"
                              />
                            );
                          }

                          const isToday = day.dateStr === stats.todayStr;
                          const sessions = day.record?.sessions || 0;
                          const focusMins = day.record?.focusMinutes ?? day.record?.minutes ?? (sessions * 25);
                          const shortBreakMins = day.record?.shortBreakMinutes ?? 0;
                          const longBreakMins = day.record?.longBreakMinutes ?? 0;

                          let colorClass =
                            'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/80 hover:border-emerald-400 dark:hover:border-emerald-300';
                          if (focusMins >= 100) {
                            colorClass =
                              'bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300 shadow-xs';
                          } else if (focusMins >= 50) {
                            colorClass =
                              'bg-emerald-500 dark:bg-emerald-500 border border-emerald-400 dark:border-emerald-400 shadow-xs';
                          } else if (focusMins >= 25) {
                            colorClass =
                              'bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600';
                          } else if (focusMins >= 1) {
                            colorClass =
                              'bg-emerald-300 dark:bg-emerald-900/80 border border-emerald-400 dark:border-emerald-800';
                          }

                          if (isToday) {
                            colorClass += ' ring-1.5 ring-blue-500/90 dark:ring-blue-400';
                          }

                          const formattedDate = formatDateDisplay(day.dateStr);
                          const tooltipText = `${formattedDate}${isToday ? ' (Today)' : ''}: ${focusMins}m focus (${sessions} completed sessions)`;

                          return (
                            <div
                              key={day.dateStr}
                              title={tooltipText}
                              onMouseEnter={() => {
                                setHoveredDay({
                                  date: day.dateStr,
                                  sessions,
                                  focusMinutes: focusMins,
                                  shortBreakMinutes: shortBreakMins,
                                  longBreakMinutes: longBreakMins,
                                });
                              }}
                              className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-[2.5px] cursor-pointer hover:ring-2 hover:ring-emerald-400 dark:hover:ring-emerald-300 transition-colors ${colorClass}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Persistent Fixed-Height Inspection Details Bar (Eliminates layout shift & flickering) */}
            <div className="h-9 flex items-center justify-between px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] overflow-hidden">
              {hoveredDay ? (
                <div className="flex items-center justify-between w-full gap-2 min-w-0">
                  <span className="font-semibold text-[var(--text-primary)] truncate shrink-0 flex items-center gap-1.5">
                    <span>{formatDateDisplay(hoveredDay.date)}</span>
                    {hoveredDay.date === stats.todayStr && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                        Today
                      </span>
                    )}
                  </span>
                  <div className="font-mono text-xs flex items-center gap-2.5 truncate">
                    <span className="text-emerald-500 font-semibold flex items-center gap-1.5 shrink-0">
                      <span>🎯 {hoveredDay.focusMinutes}m focus ({hoveredDay.sessions} completed)</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-medium ${
                        hoveredDay.focusMinutes >= minFocusThreshold
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-zinc-500/10 text-[var(--text-muted)] border border-zinc-500/20'
                      }`}>
                        {hoveredDay.focusMinutes >= minFocusThreshold
                          ? `Streak Met (≥${minFocusThreshold}m)`
                          : `Below Streak (Goal: ${minFocusThreshold}m)`}
                      </span>
                    </span>
                    {(hoveredDay.shortBreakMinutes > 0 || hoveredDay.longBreakMinutes > 0) && (
                      <span className="text-[var(--text-muted)] text-[10px] hidden md:inline shrink-0">
                        ☕ Breaks: {hoveredDay.shortBreakMinutes}m S / {hoveredDay.longBreakMinutes}m L
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[var(--text-muted)] italic">
                  <Calendar className="w-3.5 h-3.5 opacity-50 shrink-0" />
                  <span>Hover over any day square in the calendar to inspect study sessions and break times</span>
                </div>
              )}
            </div>
          </div>

          {/* Pomodoro Focus Tip */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-[var(--text-primary)]">
                Streak Target Based on Configured Focus Duration
              </span>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Daily streaks require at least <strong>{stats.minFocusThreshold} minutes</strong> of focused study (matching your Pomodoro settings). Every minute is accurately accumulated, even across paused or partial sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
