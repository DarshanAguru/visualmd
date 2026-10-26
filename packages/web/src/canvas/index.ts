// Embedded styles for self-contained rendering
import 'katex/dist/katex.min.css';
import '../styles/index.css';

// Core Canvas Component
export { VisualMDCanvas } from './VisualMDCanvas';

// Modular Widgets
export { VisualMDSnippet } from './VisualMDSnippet';
export { VisualMDStepper } from './VisualMDStepper';
export { VisualMDMindMap } from './VisualMDMindMap';
export {
  VisualMDQuiz,
  VisualMDTabs,
  VisualMDCallout,
  VisualMDMetrics,
  VisualMDMarkdown,
} from './VisualMDWidgets';

// Universal Mount & Web Component
export { renderVisualMD, VisualMDElement } from './universal';

// Canvas & Widget Types
export * from './types';

// Re-export compiler APIs for complete end-to-end convenience
export * from '@visualmd/compiler';
