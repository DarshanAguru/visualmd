export type CalloutType = 'insight' | 'perf' | 'warn' | 'danger' | 'tip';

export interface BaseNode {
  id: string;
  type: string;
}

export interface MarkdownNode extends BaseNode {
  type: 'markdown';
  content: string;
}

export interface SnippetNode extends BaseNode {
  type: 'snippet';
  lang: string;
  title?: string;
  highlight?: string;
  diff?: boolean;
  code: string;
}

export interface StepItem {
  index: number;
  title: string;
  content: string;
}

export interface StepperNode extends BaseNode {
  type: 'stepper';
  title: string;
  steps: StepItem[];
}

export interface CanvasNode extends BaseNode {
  type: 'canvas';
  engine: 'canvas2d' | 'svg' | 'html' | 'webgl';
  height: number;
  title?: string;
  code: string;
}

export interface TabItem {
  title: string;
  content: string;
  nodes?: VmdNode[];
}

export interface TabsNode extends BaseNode {
  type: 'tabs';
  tabs: TabItem[];
}

export interface CalloutNode extends BaseNode {
  type: 'callout';
  calloutType: CalloutType;
  title?: string;
  content: string;
}

export interface MetricItem {
  label: string;
  value: string;
  trend?: string;
}

export interface MetricsNode extends BaseNode {
  type: 'metrics';
  items: MetricItem[];
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizNode extends BaseNode {
  type: 'quiz';
  question: string;
  options: QuizOption[];
  explanation?: string;
}

export type MindMapItemType = 'root' | 'heading' | 'concept' | 'metric' | 'step' | 'quiz' | 'callout' | 'formula' | 'snippet';

export interface MindMapItem {
  id: string;
  text: string;
  type?: MindMapItemType;
  summary?: string;
  badge?: string;
  children?: MindMapItem[];
  collapsed?: boolean;
}

export interface MindMapNode extends BaseNode {
  type: 'mindmap';
  title?: string;
  root: MindMapItem;
}

export type VmdNode =
  | MarkdownNode
  | SnippetNode
  | StepperNode
  | CanvasNode
  | TabsNode
  | CalloutNode
  | MetricsNode
  | QuizNode
  | MindMapNode;

export interface VmdDocument {
  title: string;
  nodes: VmdNode[];
  rawLength: number;
  parsedAt: string;
}

export interface VisualMDDiagnostic {
  line?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export class VisualMDParseError extends Error {
  public diagnostics: VisualMDDiagnostic[];

  constructor(message: string, diagnostics: VisualMDDiagnostic[] = []) {
    super(message);
    this.name = 'VisualMDParseError';
    this.diagnostics = diagnostics;
  }
}

export class VisualMDValidationError extends Error {
  public unclosedTags: string[];

  constructor(message: string, unclosedTags: string[] = []) {
    super(message);
    this.name = 'VisualMDValidationError';
    this.unclosedTags = unclosedTags;
  }
}

export interface ParseOptions {
  autoHeal?: boolean;
  strict?: boolean;
  streamAutoHeal?: boolean;
  fallbackToMarkdown?: boolean;
}
