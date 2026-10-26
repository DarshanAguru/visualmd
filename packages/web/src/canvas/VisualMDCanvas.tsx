import React, { useMemo } from 'react';
import { parseVisualMD, VmdDocument, VmdNode } from '@visualmd/compiler';
import { CodeBox } from '../components/widgets/CodeBox';
import { Stepper } from '../components/widgets/Stepper';
import { CanvasSandbox } from '../components/widgets/CanvasSandbox';
import { TabsView } from '../components/widgets/TabsView';
import { CalloutBox } from '../components/widgets/CalloutBox';
import { MetricsGrid } from '../components/widgets/MetricsGrid';
import { QuizBox } from '../components/widgets/QuizBox';
import { MindMapView } from '../components/widgets/MindMapView';
import { MarkdownRenderer } from '../components/document/MarkdownRenderer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { VisualMDCanvasProps } from './types';
import { BookOpen, Clock, Layers } from 'lucide-react';

export const VisualMDCanvas: React.FC<VisualMDCanvasProps> = ({
  doc: propDoc,
  content,
  theme = 'obsidian',
  height = '100%',
  width = '100%',
  overflow = 'auto',
  className = '',
  style = {},
  showTitle = true,
  readOnly = true,
  filterTypes,
  fontScale = 1,
  headerActions,
  fallback,
  onNodeClick,
}) => {
  // Parse document if raw content is provided and doc is not
  const doc: VmdDocument = useMemo(() => {
    if (propDoc) return propDoc;
    if (typeof content === 'string') {
      try {
        return parseVisualMD(content, { autoHeal: true });
      } catch (err) {
        console.error('[VisualMD] Parse error in Canvas:', err);
        return {
          title: 'Document Parse Error',
          nodes: [
            {
              id: 'err-node',
              type: 'markdown',
              content: `> **Error parsing VisualMD content**: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          rawLength: content.length,
          parsedAt: new Date().toISOString(),
        };
      }
    }
    return {
      title: 'Untitled VisualMD Canvas',
      nodes: [],
      rawLength: 0,
      parsedAt: new Date().toISOString(),
    };
  }, [propDoc, content]);

  // Filter nodes if filterTypes is specified
  const filteredNodes: VmdNode[] = useMemo(() => {
    if (!doc.nodes || doc.nodes.length === 0) return [];
    if (!filterTypes || filterTypes.length === 0) return doc.nodes;
    const filterSet = new Set(filterTypes);
    return doc.nodes.filter((n) => filterSet.has(n.type));
  }, [doc.nodes, filterTypes]);

  // Calculate estimated reading time
  const readingTime = useMemo(() => {
    if (!content && (!doc.nodes || doc.nodes.length === 0)) return null;
    let wordCount = 0;
    for (const node of doc.nodes) {
      if (node.type === 'markdown') {
        wordCount += (node.content || '').split(/\s+/).filter(Boolean).length;
      } else if (node.type === 'snippet') {
        wordCount += (node.code || '').split(/\s+/).filter(Boolean).length;
      }
    }
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return `${minutes} min read`;
  }, [content, doc.nodes]);

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    overflow,
    ['--vmd-font-scale' as any]: fontScale,
    ...style,
  };

  return (
    <div
      data-theme={theme}
      data-visualmd-canvas="true"
      className={`vmd-canvas-root flex flex-col relative bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased transition-colors ${className}`}
      style={containerStyle}
    >
      {/* Optional Header Banner */}
      {showTitle && doc.title && (
        <header className="vmd-canvas-header sticky top-0 z-10 px-6 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {doc.title}
              </h2>
              <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-muted)] font-mono">
                {readingTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readingTime}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {filteredNodes.length} {filteredNodes.length === 1 ? 'block' : 'blocks'}
                </span>
              </div>
            </div>
          </div>

          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </header>
      )}

      {/* Main Content Body */}
      <div className="vmd-canvas-body flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {filteredNodes.length === 0 ? (
          fallback || (
            <div className="text-center py-16 text-[var(--text-muted)] text-sm">
              No content to display in this canvas.
            </div>
          )
        ) : (
          filteredNodes.map((node, idx) => (
            <div
              key={node.id || `node-${idx}`}
              data-node-id={node.id}
              onClick={() => onNodeClick?.(node)}
              className="vmd-canvas-node-card transition-all"
            >
              <ErrorBoundary fallbackTitle={`Unable to render ${node.type} block`}>
                {(() => {
                  switch (node.type) {
                    case 'snippet':
                      return <CodeBox node={node as any} />;
                    case 'stepper':
                      return <Stepper node={node as any} />;
                    case 'canvas':
                      return <CanvasSandbox node={node as any} />;
                    case 'tabs':
                      return <TabsView node={node as any} />;
                    case 'callout':
                      return <CalloutBox node={node as any} />;
                    case 'metrics':
                      return <MetricsGrid node={node as any} />;
                    case 'quiz':
                      return <QuizBox node={node as any} />;
                    case 'mindmap':
                      return <MindMapView node={node as any} />;
                    case 'markdown':
                      return <MarkdownRenderer content={(node as any).content} />;
                    default:
                      return null;
                  }
                })()}
              </ErrorBoundary>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
