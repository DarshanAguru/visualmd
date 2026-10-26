import React, { useMemo } from 'react';
import { MindMapNode, MindMapItem, parseMindMapFile, parseBulletTree } from '@visualmd/compiler';
import { MindMapView } from '../components/widgets/MindMapView';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { VisualMDMindMapProps } from './types';

export const VisualMDMindMap: React.FC<VisualMDMindMapProps> = ({
  node: propNode,
  root: propRoot,
  content,
  title = 'Mind Map',
  theme = 'obsidian',
  height = '500px',
  width = '100%',
  className = '',
  style = {},
}) => {
  const node: MindMapNode = useMemo(() => {
    if (propNode) return propNode;
    if (propRoot) {
      return {
        id: 'mm-node-standalone',
        type: 'mindmap',
        title: propRoot.text || title,
        root: propRoot,
      };
    }
    if (typeof content === 'string') {
      try {
        const parsed = parseMindMapFile(content, title);
        return {
          id: 'mm-node-standalone',
          type: 'mindmap',
          title: parsed.title,
          root: parsed.root,
        };
      } catch (err) {
        console.error('[VisualMD] Failed to parse mindmap content:', err);
      }
    }
    return {
      id: 'mm-node-standalone',
      type: 'mindmap',
      title,
      root: {
        id: 'mm-root-empty',
        text: title,
        type: 'root',
        children: [],
      },
    };
  }, [propNode, propRoot, content, title]);

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    ...style,
  };

  return (
    <div
      data-theme={theme}
      data-visualmd-widget="mindmap"
      className={`vmd-widget-mindmap font-sans text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden ${className}`}
      style={containerStyle}
    >
      <ErrorBoundary fallbackTitle="Unable to render mind map">
        <MindMapView node={node} />
      </ErrorBoundary>
    </div>
  );
};
