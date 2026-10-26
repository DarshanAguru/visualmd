import React from 'react';
import { StepperNode, StepItem } from '@visualmd/compiler';
import { Stepper } from '../components/widgets/Stepper';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { VisualMDStepperProps } from './types';

export const VisualMDStepper: React.FC<VisualMDStepperProps> = ({
  node: propNode,
  title = 'Interactive Workflow',
  steps = [],
  theme = 'obsidian',
  className = '',
  style = {},
}) => {
  const node: StepperNode = propNode || {
    id: 'stepper-node-standalone',
    type: 'stepper',
    title,
    steps,
  };

  return (
    <div
      data-theme={theme}
      data-visualmd-widget="stepper"
      className={`vmd-widget-stepper font-sans text-[var(--text-primary)] ${className}`}
      style={style}
    >
      <ErrorBoundary fallbackTitle="Unable to render stepper">
        <Stepper node={node} />
      </ErrorBoundary>
    </div>
  );
};
