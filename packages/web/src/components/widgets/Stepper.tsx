import React, { useState } from 'react';
import { StepperNode } from '@visualmd/compiler';
import { ChevronLeft, ChevronRight, PlayCircle, CheckCircle2 } from 'lucide-react';
import { MarkdownRenderer } from '../document/MarkdownRenderer';
import { Annotation } from '../../types';

interface StepperProps {
  node: StepperNode;
  annotations?: Annotation[];
  onDeleteAnnotation?: (id: string) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  node,
  annotations,
  onDeleteAnnotation,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const steps = node.steps;
  if (!steps || steps.length === 0) return null;

  const currentStep = steps[currentStepIdx] || steps[0];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      if (currentStepIdx < steps.length - 1) {
        e.preventDefault();
        setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1));
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentStepIdx > 0) {
        e.preventDefault();
        setCurrentStepIdx((prev) => Math.max(0, prev - 1));
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs overflow-hidden focus:outline-none focus:ring-1 focus:ring-blue-500/50"
    >
      {/* Stepper Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            {node.title}
          </h3>
        </div>
        <div className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]">
          Step {currentStepIdx + 1} of {steps.length}
        </div>
      </div>

      {/* Progress pill bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIdx;
          const isCompleted = idx < currentStepIdx;

          return (
            <button
              key={idx}
              onClick={() => setCurrentStepIdx(idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold shadow-xs'
                  : isCompleted
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold border border-current">
                  {idx + 1}
                </span>
              )}
              <span className="truncate max-w-[120px]">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active step content */}
      <div className="p-5">
        <h4 className="font-bold text-[var(--text-primary)] mb-2" style={{ fontSize: 'calc(1.05rem * var(--vmd-font-scale, 1))' }}>
          {currentStep.title}
        </h4>
        <div className="leading-relaxed text-[var(--text-primary)]" style={{ fontSize: 'calc(1rem * var(--vmd-font-scale, 1))' }}>
          <MarkdownRenderer
            content={currentStep.content}
            annotations={annotations}
            onDeleteAnnotation={onDeleteAnnotation}
          />
        </div>
      </div>

      {/* Stepper Footer Controls */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
        <button
          disabled={currentStepIdx === 0}
          onClick={() => setCurrentStepIdx((prev) => Math.max(0, prev - 1))}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:pointer-events-none transition-colors text-[var(--text-secondary)]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === currentStepIdx
                  ? 'w-5 bg-blue-500'
                  : idx < currentStepIdx
                  ? 'w-1.5 bg-blue-500/40'
                  : 'w-1.5 bg-[var(--border-color)]'
              }`}
            />
          ))}
        </div>

        <button
          disabled={currentStepIdx === steps.length - 1}
          onClick={() => setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1))}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-md bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-opacity"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
