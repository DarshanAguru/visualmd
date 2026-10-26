import React from 'react';
import {
  QuizNode,
  TabsNode,
  CalloutNode,
  MetricsNode,
  QuizOption,
  TabItem,
  CalloutType,
  MetricItem,
} from '@visualmd/compiler';
import { QuizBox } from '../components/widgets/QuizBox';
import { TabsView } from '../components/widgets/TabsView';
import { CalloutBox } from '../components/widgets/CalloutBox';
import { MetricsGrid } from '../components/widgets/MetricsGrid';
import { MarkdownRenderer } from '../components/document/MarkdownRenderer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import {
  VisualMDQuizProps,
  VisualMDTabsProps,
  VisualMDCalloutProps,
  VisualMDMetricsProps,
  VisualMDMarkdownProps,
} from './types';

export const VisualMDQuiz: React.FC<VisualMDQuizProps> = ({
  node: propNode,
  question = 'Knowledge Check',
  options = [],
  explanation,
  theme = 'obsidian',
  className = '',
  style = {},
}) => {
  const node: QuizNode = propNode || {
    id: 'quiz-standalone',
    type: 'quiz',
    question,
    options,
    explanation,
  };

  return (
    <div data-theme={theme} className={`vmd-widget-quiz ${className}`} style={style}>
      <ErrorBoundary fallbackTitle="Unable to render quiz">
        <QuizBox node={node} />
      </ErrorBoundary>
    </div>
  );
};

export const VisualMDTabs: React.FC<VisualMDTabsProps> = ({
  node: propNode,
  tabs = [],
  theme = 'obsidian',
  className = '',
  style = {},
}) => {
  const node: TabsNode = propNode || {
    id: 'tabs-standalone',
    type: 'tabs',
    tabs,
  };

  return (
    <div data-theme={theme} className={`vmd-widget-tabs ${className}`} style={style}>
      <ErrorBoundary fallbackTitle="Unable to render tabs">
        <TabsView node={node} />
      </ErrorBoundary>
    </div>
  );
};

export const VisualMDCallout: React.FC<VisualMDCalloutProps> = ({
  node: propNode,
  calloutType = 'insight',
  title,
  content = '',
  theme = 'obsidian',
  className = '',
  style = {},
}) => {
  const node: CalloutNode = propNode || {
    id: 'callout-standalone',
    type: 'callout',
    calloutType,
    title,
    content,
  };

  return (
    <div data-theme={theme} className={`vmd-widget-callout ${className}`} style={style}>
      <ErrorBoundary fallbackTitle="Unable to render callout">
        <CalloutBox node={node} />
      </ErrorBoundary>
    </div>
  );
};

export const VisualMDMetrics: React.FC<VisualMDMetricsProps> = ({
  node: propNode,
  items = [],
  theme = 'obsidian',
  className = '',
  style = {},
}) => {
  const node: MetricsNode = propNode || {
    id: 'metrics-standalone',
    type: 'metrics',
    items,
  };

  return (
    <div data-theme={theme} className={`vmd-widget-metrics ${className}`} style={style}>
      <ErrorBoundary fallbackTitle="Unable to render metrics">
        <MetricsGrid node={node} />
      </ErrorBoundary>
    </div>
  );
};

export const VisualMDMarkdown: React.FC<VisualMDMarkdownProps> = ({
  content,
  theme = 'obsidian',
  className = '',
  style = {},
}) => {
  return (
    <div data-theme={theme} className={`vmd-widget-markdown ${className}`} style={style}>
      <ErrorBoundary fallbackTitle="Unable to render markdown">
        <MarkdownRenderer content={content} />
      </ErrorBoundary>
    </div>
  );
};
