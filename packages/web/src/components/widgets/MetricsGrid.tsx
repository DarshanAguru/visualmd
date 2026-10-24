import React from 'react';
import { MetricsNode } from '@visualmd/compiler';
import { Gauge } from 'lucide-react';

interface MetricsGridProps {
  node: MetricsNode;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ node }) => {
  if (!node.items || node.items.length === 0) return null;

  return (
    <div className="my-6">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        <Gauge className="w-3.5 h-3.5 text-blue-500" />
        <span>Benchmarks & KPIs</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {node.items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3.5 shadow-xs transition-colors hover:border-[var(--text-muted)] group select-text"
            title={`${item.label}: ${item.value}`}
          >
            <div
              className="text-[11px] font-medium text-[var(--text-muted)] truncate mb-1"
              title={item.label}
            >
              {item.label}
            </div>
            <div
              className="font-bold text-[var(--text-primary)] font-mono tracking-tight group-hover:text-blue-500 transition-colors break-words"
              style={{ fontSize: 'calc(1.1rem * var(--vmd-font-scale, 1))' }}
              title={item.value}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
