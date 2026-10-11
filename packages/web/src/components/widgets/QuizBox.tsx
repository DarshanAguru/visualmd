import React, { useState } from 'react';
import { QuizNode } from '@visualmd/compiler';
import { HelpCircle, Check, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

interface QuizBoxProps {
  node: QuizNode;
}

export const QuizBox: React.FC<QuizBoxProps> = ({ node }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    setShowExplanation(true);
  };

  const hasAnswered = selectedIdx !== null;

  return (
    <div className="my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-500" />
          <h4 className="font-semibold text-[var(--text-primary)]" style={{ fontSize: 'calc(0.9375rem * var(--vmd-font-scale, 1))' }}>
            Knowledge Check: {node.question}
          </h4>
        </div>
        {hasAnswered && (
          <button
            onClick={() => {
              setSelectedIdx(null);
              setShowExplanation(false);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none"
            title="Reset quiz and try again"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        )}
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        {node.options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = option.isCorrect;

          let btnStyle = 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]';
          if (hasAnswered) {
            if (isCorrect) {
              btnStyle = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium';
            } else if (isSelected && !isCorrect) {
              btnStyle = 'border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400 line-through';
            } else {
              btnStyle = 'opacity-50 border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={hasAnswered}
              style={{ fontSize: 'calc(0.875rem * var(--vmd-font-scale, 1))' }}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${btnStyle}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono select-none">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option.text}</span>
              </div>

              {hasAnswered && (
                <div className="shrink-0 ml-2">
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <Check className="w-4 h-4" /> Correct
                    </span>
                  ) : isSelected ? (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                      <X className="w-4 h-4" /> Incorrect
                    </span>
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation drawer */}
      {hasAnswered && node.explanation && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span>Explanation & Rationale</span>
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showExplanation && (
            <div
              className="px-4 pb-3 leading-relaxed text-[var(--text-secondary)]"
              style={{ fontSize: 'calc(0.8125rem * var(--vmd-font-scale, 1))' }}
            >
              {node.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
