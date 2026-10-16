import React, { useState } from 'react';
import { TabsNode } from '@visualmd/compiler';
import { Columns3 } from 'lucide-react';
import { MarkdownRenderer } from '../document/MarkdownRenderer';
import { CodeBox } from './CodeBox';
import { CalloutBox } from './CalloutBox';
import { Stepper } from './Stepper';
import { MetricsGrid } from './MetricsGrid';
import { QuizBox } from './QuizBox';
import { CanvasSandbox } from './CanvasSandbox';
import { Annotation } from '../../types';

interface TabsViewProps {
  node: TabsNode;
  annotations?: Annotation[];
  onDeleteAnnotation?: (id: string) => void;
}

export const TabsView: React.FC<TabsViewProps> = ({
  node,
  annotations,
  onDeleteAnnotation,
}) => {
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  if (!node.tabs || node.tabs.length === 0) return null;

  const currentTab = node.tabs[activeTabIdx] || node.tabs[0];

  return (
    <div className="my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs overflow-hidden">
      {/* Tab bar header */}
      <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] overflow-x-auto">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)] mr-2 pb-2">
          <Columns3 className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Compare:</span>
        </div>
        {node.tabs.map((tab, idx) => {
          const isActive = idx === activeTabIdx;
          return (
            <button
              key={idx}
              onClick={() => setActiveTabIdx(idx)}
              className={`px-3.5 py-1.5 rounded-t-lg text-xs font-medium transition-all relative border-t border-x ${
                isActive
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] -mb-[1px] font-semibold'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.title}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content body */}
      <div
        className="p-5 leading-relaxed text-[var(--text-primary)]"
        style={{ fontSize: 'calc(1rem * var(--vmd-font-scale, 1))' }}
      >
        {currentTab.nodes && currentTab.nodes.length > 0 ? (
          <div className="space-y-4">
            {currentTab.nodes.map((subNode) => {
              switch (subNode.type) {
                case 'snippet':
                  return <CodeBox key={subNode.id} node={subNode as any} />;
                case 'stepper':
                  return (
                    <Stepper
                      key={subNode.id}
                      node={subNode as any}
                      annotations={annotations}
                      onDeleteAnnotation={onDeleteAnnotation}
                    />
                  );
                case 'canvas':
                  return <CanvasSandbox key={subNode.id} node={subNode as any} />;
                case 'callout':
                  return (
                    <CalloutBox
                      key={subNode.id}
                      node={subNode as any}
                      annotations={annotations}
                      onDeleteAnnotation={onDeleteAnnotation}
                    />
                  );
                case 'metrics':
                  return <MetricsGrid key={subNode.id} node={subNode as any} />;
                case 'quiz':
                  return <QuizBox key={subNode.id} node={subNode as any} />;
                case 'markdown':
                  return (
                    <MarkdownRenderer
                      key={subNode.id}
                      content={(subNode as any).content}
                      annotations={annotations}
                      onDeleteAnnotation={onDeleteAnnotation}
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>
        ) : (
          <MarkdownRenderer
            content={currentTab.content}
            annotations={annotations}
            onDeleteAnnotation={onDeleteAnnotation}
          />
        )}
      </div>
    </div>
  );
};
