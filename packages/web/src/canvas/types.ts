import type React from 'react';
import type {
  VmdDocument,
  VmdNode,
  SnippetNode,
  StepperNode,
  CanvasNode,
  TabsNode,
  CalloutNode,
  MetricsNode,
  QuizNode,
  MindMapNode,
  MarkdownNode,
  MindMapItem,
  StepItem,
  TabItem,
  CalloutType,
  MetricItem,
  QuizOption,
} from '@visualmd/compiler';
import type { ThemeType } from '../types';

export type { ThemeType };

export interface VisualMDCanvasProps {
  /**
   * Pre-parsed VisualMD document from parseVisualMD().
   */
  doc?: VmdDocument | null;

  /**
   * Raw VisualMD or standard Markdown string.
   * If provided and doc is omitted, it is automatically parsed.
   */
  content?: string;

  /**
   * Visual theme preset.
   * Options: 'obsidian' | 'dark' | 'midnight' | 'tokyo' | 'dracula' | 'forest' | 'nord' | 'retro' | 'light' | 'editorial' | 'notebook' | 'sepia' | 'paper'
   * Defaults to 'obsidian'.
   */
  theme?: ThemeType;

  /**
   * CSS height of the canvas container.
   * E.g. '100%', '600px', '40rem', 600.
   */
  height?: string | number;

  /**
   * CSS width of the canvas container.
   * E.g. '100%', '800px', 'min(100%, 960px)', 800.
   */
  width?: string | number;

  /**
   * Overflow behavior for the canvas scroll container.
   * Options: 'auto' | 'hidden' | 'scroll' | 'visible'.
   * Defaults to 'auto'.
   */
  overflow?: 'auto' | 'hidden' | 'scroll' | 'visible';

  /**
   * Custom CSS class names applied to the root canvas element.
   */
  className?: string;

  /**
   * Custom inline styles applied to the root canvas element.
   */
  style?: React.CSSProperties;

  /**
   * Whether to display the document header title bar.
   * Defaults to true.
   */
  showTitle?: boolean;

  /**
   * Whether to display in read-only presentation mode (disables editing prompts).
   * Defaults to true.
   */
  readOnly?: boolean;

  /**
   * Filter which node types to display in the canvas.
   * If provided, only nodes with matching types will be rendered.
   * E.g. ['snippet'] to render only code snippets, or ['stepper', 'quiz'] for interactive study.
   */
  filterTypes?: VmdNode['type'][];

  /**
   * Font scale multiplier (e.g. 0.9, 1.0, 1.15).
   * Defaults to 1.
   */
  fontScale?: number;

  /**
   * Whether client-side sandboxed execution is enabled for snippets and canvas scripts.
   * Defaults to true.
   */
  enableSandbox?: boolean;

  /**
   * Optional custom runner for code execution.
   */
  onRunSnippet?: (code: string, lang: string) => Promise<{ success: boolean; output: string[]; error?: string }>;

  /**
   * Callback triggered when a document node is clicked.
   */
  onNodeClick?: (node: VmdNode) => void;

  /**
   * Custom action buttons to place in the canvas header bar.
   */
  headerActions?: React.ReactNode;

  /**
   * Custom fallback node when document is empty or parsing produces no nodes.
   */
  fallback?: React.ReactNode;
}

export interface VisualMDSnippetProps {
  node?: SnippetNode;
  code?: string;
  lang?: string;
  title?: string;
  diff?: boolean;
  highlight?: string;
  theme?: ThemeType;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  enableRun?: boolean;
  onRun?: (code: string, lang: string) => Promise<{ success: boolean; output: string[]; error?: string }>;
}

export interface VisualMDStepperProps {
  node?: StepperNode;
  title?: string;
  steps?: StepItem[];
  theme?: ThemeType;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDMindMapProps {
  node?: MindMapNode;
  root?: MindMapItem;
  content?: string;
  title?: string;
  theme?: ThemeType;
  height?: string | number;
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDQuizProps {
  node?: QuizNode;
  question?: string;
  options?: QuizOption[];
  explanation?: string;
  theme?: ThemeType;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDTabsProps {
  node?: TabsNode;
  tabs?: TabItem[];
  theme?: ThemeType;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDCalloutProps {
  node?: CalloutNode;
  calloutType?: CalloutType;
  title?: string;
  content?: string;
  theme?: ThemeType;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDMetricsProps {
  node?: MetricsNode;
  items?: MetricItem[];
  theme?: ThemeType;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDMarkdownProps {
  content: string;
  theme?: ThemeType;
  className?: string;
  style?: React.CSSProperties;
}

export interface VisualMDInstance {
  /**
   * Unmounts the rendered canvas and cleans up React DOM tree.
   */
  destroy: () => void;

  /**
   * Updates properties on the rendered canvas instance.
   */
  update: (props: Partial<VisualMDCanvasProps>) => void;
}
