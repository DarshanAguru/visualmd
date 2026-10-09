import {
  VmdDocument,
  VmdNode,
  MarkdownNode,
  SnippetNode,
  StepperNode,
  StepItem,
  CanvasNode,
  TabsNode,
  TabItem,
  CalloutNode,
  CalloutType,
  MetricsNode,
  MetricItem,
  QuizNode,
  QuizOption,
  ParseOptions,
} from './types.js';

function safeDecode(str: string): string {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' ')).trim();
  } catch {
    return str.replace(/\+/g, ' ').trim();
  }
}

function parseParams(paramString: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!paramString || !paramString.trim()) return result;

  const clean = paramString.startsWith('?') ? paramString.slice(1) : paramString;
  const pairs = clean.split('&');

  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      const key = safeDecode(pair);
      if (key) result[key] = 'true';
    } else {
      const key = safeDecode(pair.slice(0, eqIdx));
      const val = safeDecode(pair.slice(eqIdx + 1));
      if (key) result[key] = val;
    }
  }

  return result;
}

export function parseVisualMD(rawText: string, options: ParseOptions = {}): VmdDocument {
  const autoHeal = options.autoHeal ?? true;
  const lines = rawText.split(/\r?\n/);
  const nodes: VmdNode[] = [];

  let currentTitle = 'Untitled VisualMD Document';
  let titleFound = false;

  let currentMarkdownBuffer: string[] = [];
  let nodeCounter = 0;

  function cleanMarkdownLines(rawLines: string[]): string[] {
    return rawLines.filter((l) => {
      const trimmed = l.trim();
      if (/^\$[A-Z_]+(\$S|\$E)/i.test(trimmed)) return false;
      if (/^\$TAB(\?|$)/i.test(trimmed)) return false;
      if (/^\$STEP@\d+/i.test(trimmed)) return false;
      if (/^\$EXPLANATION/i.test(trimmed)) return false;
      return true;
    });
  }

  function flushMarkdown() {
    const cleaned = cleanMarkdownLines(currentMarkdownBuffer);
    const text = cleaned.join('\n').trim();
    if (text) {
      nodes.push({
        id: `node-${nodeCounter++}`,
        type: 'markdown',
        content: text,
      } as MarkdownNode);
    }
    currentMarkdownBuffer = [];
  }

  type ActiveBlockType = 'SNIPPET' | 'STEPPER' | 'CANVAS' | 'TABS' | 'CALLOUT' | 'METRICS' | 'QUIZ';

  interface ActiveBlockState {
    type: ActiveBlockType;
    params: Record<string, string>;
    rawLines: string[];
    startLine: number;
  }

  let activeBlock: ActiveBlockState | null = null;

  function finalizeBlock(block: ActiveBlockState) {
    const id = `node-${nodeCounter++}`;
    const rawContent = block.rawLines.join('\n');

    switch (block.type) {
      case 'SNIPPET': {
        const lang = block.params.lang || 'text';
        const title = block.params.title;
        const highlight = block.params.highlight;
        const diff = block.params.diff === 'true';
        nodes.push({
          id,
          type: 'snippet',
          lang,
          title,
          highlight,
          diff,
          code: rawContent.trim(),
        } as SnippetNode);
        break;
      }

      case 'STEPPER': {
        const title = block.params.title || 'Step-by-Step Flow';
        const steps: StepItem[] = [];

        // Parse $STEP@N?title=...
        const stepLines = block.rawLines;
        let currentStep: { index: number; title: string; lines: string[] } | null = null;

        for (const line of stepLines) {
          const stepMatch = line.match(/^\$STEP@(\d+)(?:\?(.*))?$/i);
          if (stepMatch) {
            if (currentStep) {
              steps.push({
                index: currentStep.index,
                title: currentStep.title,
                content: currentStep.lines.join('\n').trim(),
              });
            }
            const idx = parseInt(stepMatch[1], 10) || steps.length + 1;
            const p = parseParams(stepMatch[2] || '');
            currentStep = {
              index: idx,
              title: p.title || `Step ${idx}`,
              lines: [],
            };
          } else if (currentStep) {
            currentStep.lines.push(line);
          } else {
            // Content before first step
            if (line.trim()) {
              currentStep = {
                index: 1,
                title: 'Initial Step',
                lines: [line],
              };
            }
          }
        }

        if (currentStep) {
          steps.push({
            index: currentStep.index,
            title: currentStep.title,
            content: currentStep.lines.join('\n').trim(),
          });
        }

        nodes.push({
          id,
          type: 'stepper',
          title,
          steps,
        } as StepperNode);
        break;
      }

      case 'CANVAS': {
        const engine = (['canvas2d', 'svg', 'html', 'webgl'].includes(block.params.engine)
          ? block.params.engine
          : 'canvas2d') as CanvasNode['engine'];
        const height = parseInt(block.params.height, 10) || 300;
        const title = block.params.title;
        nodes.push({
          id,
          type: 'canvas',
          engine,
          height,
          title,
          code: rawContent.trim(),
        } as CanvasNode);
        break;
      }

      case 'TABS': {
        const tabs: TabItem[] = [];
        let currentTab: { title: string; lines: string[] } | null = null;

        for (const line of block.rawLines) {
          const tabMatch = line.match(/^\$TAB(?:\?(.*))?$/i);
          if (tabMatch) {
            if (currentTab) {
              const tabContent = currentTab.lines.join('\n').trim();
              const subDoc = parseVisualMD(tabContent, { autoHeal: true });
              tabs.push({
                title: currentTab.title,
                content: tabContent,
                nodes: subDoc.nodes,
              });
            }
            const p = parseParams(tabMatch[1] || '');
            currentTab = {
              title: p.title || `Tab ${tabs.length + 1}`,
              lines: [],
            };
          } else if (currentTab) {
            currentTab.lines.push(line);
          } else {
            if (line.trim()) {
              currentTab = {
                title: 'Overview',
                lines: [line],
              };
            }
          }
        }

        if (currentTab) {
          const tabContent = currentTab.lines.join('\n').trim();
          const subDoc = parseVisualMD(tabContent, { autoHeal: true });
          tabs.push({
            title: currentTab.title,
            content: tabContent,
            nodes: subDoc.nodes,
          });
        }

        nodes.push({
          id,
          type: 'tabs',
          tabs,
        } as TabsNode);
        break;
      }

      case 'CALLOUT': {
        const validTypes: CalloutType[] = ['insight', 'perf', 'warn', 'danger', 'tip'];
        const calloutType = validTypes.includes(block.params.type as CalloutType)
          ? (block.params.type as CalloutType)
          : 'insight';
        const title = block.params.title;
        nodes.push({
          id,
          type: 'callout',
          calloutType,
          title,
          content: rawContent.trim(),
        } as CalloutNode);
        break;
      }

      case 'METRICS': {
        const items: MetricItem[] = [];
        // Support either pipes or newlines
        const tokens = rawContent.split(/[|\n]/).map((s) => s.trim()).filter(Boolean);
        for (const token of tokens) {
          const colonIdx = token.indexOf(':');
          if (colonIdx !== -1) {
            items.push({
              label: token.slice(0, colonIdx).trim(),
              value: token.slice(colonIdx + 1).trim(),
            });
          } else {
            items.push({
              label: 'Metric',
              value: token,
            });
          }
        }

        nodes.push({
          id,
          type: 'metrics',
          items,
        } as MetricsNode);
        break;
      }

      case 'QUIZ': {
        const question = block.params.q || block.params.question || 'Knowledge Check';
        const options: QuizOption[] = [];
        let explanation: string | undefined;
        let inExplanation = false;
        const explanationLines: string[] = [];

        for (const line of block.rawLines) {
          if (line.trim().toUpperCase().startsWith('$EXPLANATION')) {
            inExplanation = true;
            continue;
          }

          if (inExplanation) {
            explanationLines.push(line);
            continue;
          }

          const optMatch = line.match(/^(?:[-*+]\s+)?\[([ xX])\]\s*(.*)$/);
          if (optMatch) {
            options.push({
              isCorrect: optMatch[1].toLowerCase() === 'x',
              text: optMatch[2].trim(),
            });
          }
        }

        if (explanationLines.length > 0) {
          explanation = explanationLines.join('\n').trim();
        }

        nodes.push({
          id,
          type: 'quiz',
          question,
          options,
          explanation,
        } as QuizNode);
        break;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for document title if not set yet
    if (!titleFound && !activeBlock) {
      const h1Match = trimmed.match(/^#\s+(.+)$/);
      if (h1Match) {
        currentTitle = h1Match[1].trim();
        titleFound = true;
      }
    }

    // If inside a container block like TABS:
    // It must collect all inner lines until $TABS$E (or top-level H1 heal)
    if (activeBlock && activeBlock.type === 'TABS') {
      const endMatch = trimmed.match(/^\$TABS\$E$/i);
      if (endMatch) {
        finalizeBlock(activeBlock);
        activeBlock = null;
        continue;
      }
      if (autoHeal && trimmed.match(/^#\s+/)) {
        finalizeBlock(activeBlock);
        activeBlock = null;
        currentMarkdownBuffer.push(line);
        continue;
      }
      activeBlock.rawLines.push(line);
      continue;
    }

    // Check for start of VisualMD macro tag: $KEYWORD$S(?params)?
    const startMatch = trimmed.match(/^\$([A-Z_]+)\$S(?:\?(.*))?$/i);
    if (startMatch) {
      const blockType = startMatch[1].toUpperCase() as ActiveBlockType;
      const validBlockTypes: ActiveBlockType[] = [
        'SNIPPET',
        'STEPPER',
        'CANVAS',
        'TABS',
        'CALLOUT',
        'METRICS',
        'QUIZ',
      ];

      if (validBlockTypes.includes(blockType)) {
        // If an active block was already open and autoHeal is enabled, heal it
        if (activeBlock) {
          if (autoHeal) {
            finalizeBlock(activeBlock);
            activeBlock = null;
          }
        }

        flushMarkdown();
        activeBlock = {
          type: blockType,
          params: parseParams(startMatch[2] || ''),
          rawLines: [],
          startLine: i,
        };
        continue;
      }
    }

    // Check for end of VisualMD macro tag: $KEYWORD$E
    if (activeBlock) {
      const endMatch = trimmed.match(/^\$([A-Z_]+)\$E$/i);
      if (endMatch && endMatch[1].toUpperCase() === activeBlock.type) {
        finalizeBlock(activeBlock);
        activeBlock = null;
        continue;
      }

      // Auto-heal on markdown headings (H1-H6) or horizontal divider (---) if unclosed
      if (autoHeal && (trimmed.match(/^#{1,6}\s+/) || trimmed.match(/^(?:---|\*\*\*|___)\s*$/))) {
        finalizeBlock(activeBlock);
        activeBlock = null;
        currentMarkdownBuffer.push(line);
        continue;
      }

      // Inside active block
      activeBlock.rawLines.push(line);
      continue;
    }

    // Regular markdown line
    currentMarkdownBuffer.push(line);
  }

  // End of file handling
  if (activeBlock) {
    finalizeBlock(activeBlock);
    activeBlock = null;
  }
  flushMarkdown();

  return {
    title: currentTitle,
    nodes,
    rawLength: rawText.length,
    parsedAt: new Date().toISOString(),
  };
}

export function validateVisualMD(rawText: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = rawText.split(/\r?\n/);
  const openStack: { type: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const startMatch = trimmed.match(/^\$([A-Z_]+)\$S(?:\?.*)?$/i);
    if (startMatch) {
      openStack.push({ type: startMatch[1].toUpperCase(), line: i + 1 });
      continue;
    }

    const endMatch = trimmed.match(/^\$([A-Z_]+)\$E$/i);
    if (endMatch) {
      const endType = endMatch[1].toUpperCase();
      if (openStack.length === 0) {
        errors.push(`Line ${i + 1}: Found end tag $${endType}$E without matching start tag.`);
      } else {
        const last = openStack.pop()!;
        if (last.type !== endType) {
          errors.push(
            `Line ${i + 1}: Mismatched end tag $${endType}$E for $${last.type}$S opened on line ${last.line}.`
          );
        }
      }
    }
  }

  while (openStack.length > 0) {
    const unclosed = openStack.pop()!;
    errors.push(`Line ${unclosed.line}: Tag $${unclosed.type}$S was never closed with $${unclosed.type}$E.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
