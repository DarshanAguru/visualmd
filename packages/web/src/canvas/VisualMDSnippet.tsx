import React from 'react';
import { SnippetNode } from '@visualmd/compiler';
import { CodeBox } from '../components/widgets/CodeBox';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { VisualMDSnippetProps } from './types';

export const VisualMDSnippet: React.FC<VisualMDSnippetProps> = ({
  node: propNode,
  code = '',
  lang = 'typescript',
  title,
  diff = false,
  highlight,
  theme = 'obsidian',
  height,
  className = '',
  style = {},
}) => {
  const node: SnippetNode = propNode || {
    id: 'snippet-node-standalone',
    type: 'snippet',
    code,
    lang,
    title,
    diff,
    highlight,
  };

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  };

  return (
    <div
      data-theme={theme}
      data-visualmd-widget="snippet"
      className={`vmd-widget-snippet font-sans text-[var(--text-primary)] ${className}`}
      style={containerStyle}
    >
      <ErrorBoundary fallbackTitle="Unable to render code snippet">
        <CodeBox node={node} />
      </ErrorBoundary>
    </div>
  );
};
