import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { VisualMDCanvas } from './VisualMDCanvas';
import { VisualMDCanvasProps, VisualMDInstance } from './types';

/**
 * Universal programmatic DOM mount function.
 * Mounts VisualMD Canvas directly into any DOM element for Angular, Vue, Svelte, or Vanilla JS.
 *
 * @example
 * ```typescript
 * import { renderVisualMD } from 'visualmd/canvas';
 *
 * const instance = renderVisualMD(document.getElementById('editor-container'), {
 *   content: '# Live Stream\n$STEPPER$S...',
 *   theme: 'obsidian',
 *   height: '600px'
 * });
 *
 * // Clean up upon component destroy:
 * instance.destroy();
 * ```
 */
export function renderVisualMD(container: HTMLElement, initialProps: VisualMDCanvasProps = {}): VisualMDInstance {
  let currentProps = { ...initialProps };
  const root: Root = createRoot(container);
  root.render(React.createElement(VisualMDCanvas, currentProps));

  return {
    destroy() {
      root.unmount();
    },
    update(newProps: Partial<VisualMDCanvasProps>) {
      currentProps = { ...currentProps, ...newProps };
      root.render(React.createElement(VisualMDCanvas, currentProps));
    },
  };
}

/**
 * Custom Element Web Component: <visualmd-canvas>
 * Enables drop-in usage across HTML templates, Angular components, Vue templates, or Webflow.
 *
 * @example
 * ```html
 * <visualmd-canvas content="# Architecture Flow" theme="tokyo" height="500px"></visualmd-canvas>
 * ```
 */
export class VisualMDElement extends HTMLElement {
  private _instance: VisualMDInstance | null = null;

  static get observedAttributes() {
    return ['content', 'theme', 'height', 'width', 'overflow'];
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this._instance) {
      this._instance.destroy();
      this._instance = null;
    }
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    const content = this.getAttribute('content') || this.textContent || '';
    const theme = (this.getAttribute('theme') as any) || 'obsidian';
    const height = this.getAttribute('height') || '100%';
    const width = this.getAttribute('width') || '100%';
    const overflow = (this.getAttribute('overflow') as any) || 'auto';

    if (!this._instance) {
      this._instance = renderVisualMD(this, {
        content,
        theme,
        height,
        width,
        overflow,
      });
    } else {
      this._instance.update({
        content,
        theme,
        height,
        width,
        overflow,
      });
    }
  }
}

// Auto-register custom element if running in browser
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get('visualmd-canvas')) {
    customElements.define('visualmd-canvas', VisualMDElement);
  }
}
