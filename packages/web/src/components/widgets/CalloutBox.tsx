import React from 'react';
import { CalloutNode, CalloutType } from '@visualmd/compiler';
import { Lightbulb, Zap, AlertTriangle, Flame, Info } from 'lucide-react';
import { MarkdownRenderer } from '../document/MarkdownRenderer';
import { Annotation } from '../../types';

interface CalloutBoxProps {
  node: CalloutNode;
  annotations?: Annotation[];
  onDeleteAnnotation?: (id: string) => void;
}

const configMap: Record<
  CalloutType,
  {
    icon: React.ComponentType<{ className?: string }>;
    borderColor: string;
    bgColor: string;
    accentColor: string;
    badgeText: string;
  }
> = {
  insight: {
    icon: Lightbulb,
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/5 dark:bg-blue-500/10',
    accentColor: 'text-blue-600 dark:text-blue-400',
    badgeText: 'Insight',
  },
  tip: {
    icon: Info,
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    badgeText: 'Pro Tip',
  },
  perf: {
    icon: Zap,
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/5 dark:bg-purple-500/10',
    accentColor: 'text-purple-600 dark:text-purple-400',
    badgeText: 'Performance',
  },
  warn: {
    icon: AlertTriangle,
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/5 dark:bg-amber-500/10',
    accentColor: 'text-amber-600 dark:text-amber-400',
    badgeText: 'Warning',
  },
  danger: {
    icon: Flame,
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-500/5 dark:bg-rose-500/10',
    accentColor: 'text-rose-600 dark:text-rose-400',
    badgeText: 'Critical Trap',
  },
};

export const CalloutBox: React.FC<CalloutBoxProps> = ({
  node,
  annotations,
  onDeleteAnnotation,
}) => {
  const cfg = configMap[node.calloutType] || configMap.insight;
  const Icon = cfg.icon;

  return (
    <div
      className={`my-5 rounded-xl border ${cfg.borderColor} ${cfg.bgColor} p-4 transition-all`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${cfg.accentColor}`} />
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-current ${cfg.accentColor}`}
        >
          {node.title || cfg.badgeText}
        </span>
      </div>
      <div className="leading-relaxed text-[var(--text-primary)]" style={{ fontSize: 'calc(1rem * var(--vmd-font-scale, 1))' }}>
        <MarkdownRenderer
          content={node.content}
          annotations={annotations}
          onDeleteAnnotation={onDeleteAnnotation}
        />
      </div>
    </div>
  );
};
