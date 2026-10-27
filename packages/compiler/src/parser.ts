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
  MindMapNode,
  MindMapItem,
  MindMapItemType,
  ParseOptions,
  VisualMDParseError,
  VisualMDValidationError,
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

export function parseBulletTree(rawLines: string[], defaultTitle: string = 'Mind Map'): MindMapItem {
  const root: MindMapItem = {
    id: 'mm-root',
    text: defaultTitle,
    type: 'root',
    children: [],
  };

  const stack: { level: number; node: MindMapItem }[] = [{ level: -1, node: root }];
  let itemIdCounter = 0;

  for (const line of rawLines) {
    if (!line.trim()) continue;
    if (/^\s*mindmap\s*$/i.test(line)) continue;

    let indentSpaces = 0;
    let text = '';

    const indentMatch = line.match(/^(\s*)(?:[-*+•]|\d+[.)])\s+(.*)$/);
    if (indentMatch) {
      indentSpaces = indentMatch[1].replace(/\t/g, '    ').length;
      text = indentMatch[2].trim();
    } else {
      const headingMatch = line.match(/^(\s*)(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const hLevel = headingMatch[2].length;
        const hText = headingMatch[3].trim();
        // If H1 matches root title or root is default, set root.text and don't create duplicate child
        if (hLevel === 1 && (root.text === defaultTitle || hText.toLowerCase() === root.text.toLowerCase())) {
          root.text = hText;
          continue;
        }
        indentSpaces = (hLevel - 1) * 2;
        text = hText;
      } else {
        const trimmed = line.trim();
        if (/^root(?:\({1,2}|\[{1,2})(.*?)(?:\){1,2}|\]{1,2})$/i.test(trimmed)) {
          root.text = trimmed.replace(/^root(?:\({1,2}|\[{1,2})(.*?)(?:\){1,2}|\]{1,2})$/i, '$1').trim();
          continue;
        }
        continue;
      }
    }
    if (!text) continue;

    let badge: string | undefined;
    let summary: string | undefined;
    let itemType: MindMapItemType = 'concept';

    // Parse inline tags like [badge: Vision], [summary: Explanatory note], [type: metric]
    const badgeMatch = text.match(/\[badge:\s*([^\]]+)\]/i);
    if (badgeMatch) {
      badge = badgeMatch[1].trim();
      text = text.replace(badgeMatch[0], '').trim();
    }

    const summaryMatch = text.match(/\[summary:\s*([^\]]+)\]/i);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      text = text.replace(summaryMatch[0], '').trim();
    }

    const typeMatch = text.match(/\[type:\s*(root|heading|concept|metric|step|quiz|callout|formula|snippet)\]/i);
    if (typeMatch) {
      itemType = typeMatch[1].toLowerCase() as MindMapItemType;
      text = text.replace(typeMatch[0], '').trim();
    }

    // Detect **Term**: Definition syntax
    const defMatch = text.match(/^\*\*([^*]+)\*\*(?::\s*|\s+[-–—]\s+)(.+)$/);
    if (defMatch) {
      text = defMatch[1].trim();
      if (!summary) summary = defMatch[2].replace(/[*_`]/g, '').trim();
      if (!badge) badge = 'Concept';
    } else {
      const plainDefMatch = text.match(/^([^:–—]{2,55})(?::\s+|\s+[-–—]\s+)(.+)$/);
      if (plainDefMatch && !summary) {
        text = plainDefMatch[1].trim();
        summary = plainDefMatch[2].replace(/[*_`]/g, '').trim();
      }
    }

    const newNode: MindMapItem = {
      id: `mm-${itemIdCounter++}`,
      text: text.replace(/[*_`]/g, '').trim() || text,
      type: itemType,
      badge,
      summary,
      children: [],
    };

    while (stack.length > 1 && stack[stack.length - 1].level >= indentSpaces) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    if (!parent.children) parent.children = [];
    parent.children.push(newNode);

    stack.push({ level: indentSpaces, node: newNode });
  }

  // Ensure intermediate nodes with children have a descriptive summary
  function ensureBulletSummaries(item: MindMapItem) {
    if (!item.summary) {
      if (item.children && item.children.length > 0) {
        const childNames = item.children.map((c) => c.text).filter(Boolean);
        if (childNames.length > 0) {
          item.summary = `Topic covering ${item.children.length} sub-concept${item.children.length === 1 ? '' : 's'}: ${childNames.slice(0, 4).join(', ')}${childNames.length > 4 ? '...' : ''}.`;
        }
      }
    }
    if (item.children) {
      for (const child of item.children) {
        ensureBulletSummaries(child);
      }
    }
  }
  ensureBulletSummaries(root);

  // If root only has 1 top-level child that matches the title or default title, unwrap to avoid duplicate root
  if (root.children && root.children.length === 1) {
    if (defaultTitle === 'Mind Map' || root.children[0].text.toLowerCase() === root.text.toLowerCase()) {
      return root.children[0];
    }
  }

  return root;
}

// Convert a MindMap tree back into clean, indented bullet points
function exportMindMapToBulletText(item: MindMapItem, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  let line = `${indent}- ${item.text}`;
  if (item.badge) line += ` [badge: ${item.badge}]`;
  if (item.summary) line += ` [summary: ${item.summary}]`;
  let result = line;
  if (item.children && item.children.length > 0) {
    for (const c of item.children) {
      result += '\n' + exportMindMapToBulletText(c, depth + 1);
    }
  }
  return result;
}

/**
 * Universal .mindmap file parser supporting:
 * 1. JSON mind map hierarchies ({ title, root })
 * 2. VisualMD macro blocks ($MINDMAP$S...$MINDMAP$E)
 * 3. Mermaid mindmap syntax (mindmap\n  root((Title))...)
 * 4. Indented markdown bullet trees (# Title\n- Concept...)
 */
export function parseMindMapFile(rawText: string, defaultTitle: string = 'Mind Map'): {
  title: string;
  root: MindMapItem;
  vmdContent: string;
} {
  const trimmed = (rawText || '').trim();
  let title = defaultTitle;

  // 1. JSON format
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (parsedJson.root && parsedJson.root.text) {
        title = parsedJson.title || parsedJson.root.text || defaultTitle;
        return {
          title,
          root: parsedJson.root,
          vmdContent: `# ${title}\n\n$MINDMAP$S?title=${encodeURIComponent(title)}\n${exportMindMapToBulletText(parsedJson.root)}\n$MINDMAP$E\n`,
        };
      } else if (parsedJson.text) {
        title = parsedJson.text;
        return {
          title,
          root: parsedJson,
          vmdContent: `# ${title}\n\n$MINDMAP$S?title=${encodeURIComponent(title)}\n${exportMindMapToBulletText(parsedJson)}\n$MINDMAP$E\n`,
        };
      }
    } catch {
      // not JSON, fallback to text parser
    }
  }

  // 2. VisualMD block: $MINDMAP$S...$MINDMAP$E
  const blockMatch = trimmed.match(/\$MINDMAP\$S(?:\?title=([^\r\n]*))?[\r\n]+([\s\S]*?)\$MINDMAP\$E/i);
  if (blockMatch) {
    if (blockMatch[1]) {
      try {
        title = decodeURIComponent(blockMatch[1]);
      } catch {
        title = blockMatch[1];
      }
    }
    const lines = blockMatch[2].split(/\r?\n/);
    const root = parseBulletTree(lines, title);
    return {
      title,
      root,
      vmdContent: `# ${title}\n\n${trimmed}\n`,
    };
  }

  // 3. Plain indented bullets or markdown
  const lines = trimmed.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('#')) {
      title = l.replace(/^#+\s*/, '').trim();
      break;
    }
  }

  const root = parseBulletTree(lines, title);
  return {
    title,
    root,
    vmdContent: `# ${title}\n\n$MINDMAP$S?title=${encodeURIComponent(title)}\n${trimmed}\n$MINDMAP$E\n`,
  };
}

/**
 * Build a comprehensive knowledge graph mind map from any VmdDocument.
 * Deeply extracts headings, nested lists, definitions, key formulas, widgets,
 * and code snippets across the entire document.
 */
export function buildDocumentMindMap(doc: VmdDocument): MindMapItem {
  const root: MindMapItem = {
    id: 'doc-root',
    text: doc.title || 'Document Outline',
    type: 'root',
    badge: 'Overview',
    children: [],
  };

  let idCounter = 1;
  const headingStack: { level: number; node: MindMapItem }[] = [{ level: 0, node: root }];
  let listStack: { indent: number; node: MindMapItem }[] = [];

  for (const node of doc.nodes) {
    const getCurrentHeading = (): MindMapItem => {
      return headingStack[headingStack.length - 1].node;
    };

    if (node.type === 'markdown') {
      const lines = (node as MarkdownNode).content.split(/\r?\n/);
      let summaryBuffer: string[] = [];

      const flushSummary = () => {
        const cur = getCurrentHeading();
        if (cur && summaryBuffer.length > 0) {
          const text = summaryBuffer.join(' ').replace(/[*_`#]/g, '').trim();
          if (text) {
            if (!cur.summary) {
              cur.summary = text.length > 320 ? text.slice(0, 320) + '...' : text;
            } else if (cur.summary.length < 240) {
              const combined = `${cur.summary}\n\n${text}`;
              cur.summary = combined.length > 350 ? combined.slice(0, 350) + '...' : combined;
            }
          }
        }
        summaryBuffer = [];
      };

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const rawLine = lines[lineIdx];
        const trimmed = rawLine.trim();
        if (!trimmed) {
          if (summaryBuffer.length > 0) flushSummary();
          continue;
        }

        // Ignore thematic breaks / horizontal rules: ---, ***, ___, ===
        if (/^[-*_]{3,}\s*$/.test(trimmed) || /^={3,}\s*$/.test(trimmed)) {
          if (summaryBuffer.length > 0) flushSummary();
          listStack = [];
          continue;
        }

        // 1. Headings (H1 to H6)
        const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (hMatch) {
          flushSummary();
          listStack = [];
          const level = hMatch[1].length;
          let text = hMatch[2].replace(/^[-–—#]+\s*/, '').replace(/[*_`]/g, '').trim();
          if (!text || /^[-*_]{2,}$/.test(text)) continue;

          // Check for inline badges or summaries: [badge: Core], [summary: Explanatory note]
          let explicitBadge: string | undefined;
          let explicitSummary: string | undefined;

          const badgeMatch = text.match(/\[badge:\s*([^\]]+)\]/i);
          if (badgeMatch) {
            explicitBadge = badgeMatch[1].trim();
            text = text.replace(badgeMatch[0], '').trim();
          }

          const summaryMatch = text.match(/\[summary:\s*([^\]]+)\]/i);
          if (summaryMatch) {
            explicitSummary = summaryMatch[1].trim();
            text = text.replace(summaryMatch[0], '').trim();
          }

          // Check for colon subtitle in heading: "## Architecture: Distributed Ledger"
          if (!explicitSummary) {
            const colonDef = text.match(/^([^:–—]{2,55})(?::\s+|\s+[-–—]\s+)(.+)$/);
            if (colonDef) {
              text = colonDef[1].trim();
              explicitSummary = colonDef[2].trim();
            }
          }

          // Document H1 title matches root
          if (level === 1 && text.toLowerCase() === (doc.title || '').toLowerCase()) {
            root.text = text;
            if (explicitSummary) root.summary = explicitSummary;
            continue;
          }

          const hNode: MindMapItem = {
            id: `doc-mm-${idCounter++}`,
            text,
            summary: explicitSummary,
            type: 'heading',
            badge: explicitBadge || `H${level}`,
            children: [],
          };

          while (headingStack.length > 1 && headingStack[headingStack.length - 1].level >= level) {
            headingStack.pop();
          }

          const parent = headingStack[headingStack.length - 1].node;
          if (!parent.children) parent.children = [];
          parent.children.push(hNode);

          headingStack.push({ level, node: hNode });
          continue;
        }

        // 2. Math Formulas ($$...$$ or standalone equation)
        const mathMatch = trimmed.match(/^\$\$(.*?)\$\$$/);
        const isRawFormula = !mathMatch && !trimmed.startsWith('$$') && /^(?:\\?(?:text|frac)|ext|rac)\{[^{}]+\}[^=]*=[^=]+$/.test(trimmed);
        if (mathMatch || trimmed.startsWith('$$') || isRawFormula) {
          flushSummary();
          const rawFormula = (mathMatch ? mathMatch[1] : isRawFormula ? trimmed : trimmed.replace(/\$\$/g, '')).trim();
          const formula = healLatexString(rawFormula);
          if (formula) {
            const mathNode: MindMapItem = {
              id: `doc-mm-${idCounter++}`,
              text: formula.length > 50 ? formula.slice(0, 48) + '...' : formula,
              summary: `LaTeX Equation: $$${formula}$$`,
              type: 'formula',
              badge: 'Formula',
            };
            if (listStack.length > 0) {
              const parentListItem = listStack[listStack.length - 1].node;
              if (!parentListItem.children) parentListItem.children = [];
              parentListItem.children.push(mathNode);
            } else {
              const cur = getCurrentHeading();
              if (!cur.children) cur.children = [];
              cur.children.push(mathNode);
            }
          }
          continue;
        }

        // 3. Blockquotes (> ...)
        const quoteMatch = trimmed.match(/^>\s+(.+)$/);
        if (quoteMatch) {
          const quoteText = quoteMatch[1].replace(/[*_`]/g, '').trim();
          const cur = getCurrentHeading();
          if (!cur.children) cur.children = [];
          cur.children.push({
            id: `doc-mm-${idCounter++}`,
            text: quoteText.length > 70 ? quoteText.slice(0, 68) + '...' : quoteText,
            summary: quoteText,
            type: 'callout',
            badge: 'Takeaway',
          });
          continue;
        }

        // 4. Nested List Items: Bullets (-, *, +, •) and Numbered (1., 1))
        const listMatch = rawLine.match(/^(\s*)(?:[-*+•]|\d+[.)])\s+(.*)$/);
        if (listMatch) {
          flushSummary();
          const indent = listMatch[1].replace(/\t/g, '    ').length;
          let itemText = listMatch[2].trim();
          // Strip any leading multiple dashes, bullets, or horizontal rule artifacts
          itemText = itemText.replace(/^[-–—•*+]+\s*/, '').trim();
          if (!itemText || /^[-*_]{2,}$/.test(itemText)) continue;

          let explicitBadge: string | undefined;
          let explicitSummary: string | undefined;
          let itemType: MindMapItemType = 'concept';

          const badgeMatch = itemText.match(/\[badge:\s*([^\]]+)\]/i);
          if (badgeMatch) {
            explicitBadge = badgeMatch[1].trim();
            itemText = itemText.replace(badgeMatch[0], '').trim();
          }

          const summaryMatch = itemText.match(/\[summary:\s*([^\]]+)\]/i);
          if (summaryMatch) {
            explicitSummary = summaryMatch[1].trim();
            itemText = itemText.replace(summaryMatch[0], '').trim();
          }

          const typeMatch = itemText.match(/\[type:\s*(root|heading|concept|metric|step|quiz|callout|formula|snippet)\]/i);
          if (typeMatch) {
            itemType = typeMatch[1].toLowerCase() as MindMapItemType;
            itemText = itemText.replace(typeMatch[0], '').trim();
          }

          let badge = explicitBadge || 'Concept';
          let summary = explicitSummary;

          // Parse **Term**: Definition or **Term**: or Term: Definition
          const defMatch = itemText.match(/^\*\*([^*]+)\*\*(?::\s*|\s*:\s*|\s+[-–—]\s+)?(.*)$/);
          if (defMatch && defMatch[1].trim()) {
            itemText = defMatch[1].trim();
            if (defMatch[2] && defMatch[2].trim() && !summary) {
              summary = defMatch[2].replace(/[*_`]/g, '').trim();
            }
            if (!explicitBadge) badge = 'Key Concept';
          } else {
            const colonDef = itemText.match(/^([^:–—]{2,55})(?::\s+|\s+[-–—]\s+)(.+)$/);
            if (colonDef) {
              itemText = colonDef[1].trim();
              if (!summary) summary = colonDef[2].replace(/[*_`]/g, '').trim();
              if (!explicitBadge) badge = 'Key Point';
            }
          }

          const listItemNode: MindMapItem = {
            id: `doc-mm-${idCounter++}`,
            text: itemText.replace(/[*_`]/g, '').trim() || itemText,
            summary,
            type: itemType,
            badge,
            children: [],
          };

          // Nest under list hierarchy or under current heading
          while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indent) {
            listStack.pop();
          }

          if (listStack.length > 0) {
            const parentListItem = listStack[listStack.length - 1].node;
            if (!parentListItem.children) parentListItem.children = [];
            parentListItem.children.push(listItemNode);
          } else {
            const cur = getCurrentHeading();
            if (!cur.children) cur.children = [];
            cur.children.push(listItemNode);
          }

          listStack.push({ indent, node: listItemNode });
          continue;
        }

        // 5. Definitions inside standard paragraphs: **Term**: Definition
        const inlineDef = trimmed.match(/^\*\*([^*]+)\*\*(?::\s+|\s+[-–—]\s+)(.+)$/);
        if (inlineDef) {
          flushSummary();
          const term = inlineDef[1].trim();
          const def = inlineDef[2].replace(/[*_`]/g, '').trim();
          const cur = getCurrentHeading();
          if (!cur.children) cur.children = [];
          cur.children.push({
            id: `doc-mm-${idCounter++}`,
            text: term,
            summary: def,
            type: 'concept',
            badge: 'Definition',
          });
          continue;
        }

        // 6. Collect paragraph text for heading summary
        if (trimmed && !trimmed.startsWith('|') && !trimmed.startsWith('```')) {
          if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
            listStack = [];
          }
          summaryBuffer.push(trimmed);
        }
      }
      flushSummary();
    } else if (node.type === 'stepper') {
      const sNode = node as StepperNode;
      const stepBranch: MindMapItem = {
        id: `doc-mm-${idCounter++}`,
        text: `Steps: ${sNode.title}`,
        type: 'step',
        badge: `${sNode.steps.length} Steps`,
        summary: `Interactive workflow containing ${sNode.steps.length} stages`,
        children: sNode.steps.map((st) => ({
          id: `doc-mm-${idCounter++}`,
          text: st.title,
          type: 'step' as const,
          badge: `Step ${st.index}`,
          summary: st.content.replace(/[*_`#]/g, '').slice(0, 200),
        })),
      };
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(stepBranch);
    } else if (node.type === 'quiz') {
      const qNode = node as QuizNode;
      const quizBranch: MindMapItem = {
        id: `doc-mm-${idCounter++}`,
        text: `Quiz: ${qNode.question}`,
        type: 'quiz',
        badge: 'Knowledge Check',
        summary: qNode.explanation || 'Self-assessment quiz to test active recall',
        children: qNode.options.map((opt) => ({
          id: `doc-mm-${idCounter++}`,
          text: `${opt.isCorrect ? '✓ ' : ''}${opt.text}`,
          type: 'concept' as const,
          badge: opt.isCorrect ? 'Correct Answer' : 'Option',
        })),
      };
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(quizBranch);
    } else if (node.type === 'callout') {
      const cNode = node as CalloutNode;
      const calloutBranch: MindMapItem = {
        id: `doc-mm-${idCounter++}`,
        text: `Note: ${cNode.title || cNode.calloutType.toUpperCase()}`,
        type: 'callout',
        badge: cNode.calloutType.toUpperCase(),
        summary: cNode.content.replace(/[*_`#]/g, '').slice(0, 220),
      };
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(calloutBranch);
    } else if (node.type === 'metrics') {
      const mNode = node as MetricsNode;
      const metricsBranch: MindMapItem = {
        id: `doc-mm-${idCounter++}`,
        text: 'Key Metrics & KPIs',
        type: 'metric',
        badge: `${mNode.items.length} KPIs`,
        summary: mNode.items.map((it) => `${it.label}: ${it.value}`).join(' • '),
        children: mNode.items.map((it) => ({
          id: `doc-mm-${idCounter++}`,
          text: it.label,
          type: 'metric' as const,
          badge: it.value,
          summary: `${it.label} is set to ${it.value}`,
        })),
      };
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(metricsBranch);
    } else if (node.type === 'tabs') {
      const tNode = node as TabsNode;
      const tabsBranch: MindMapItem = {
        id: `doc-mm-${idCounter++}`,
        text: 'Comparative Tabs',
        type: 'concept',
        badge: `${tNode.tabs.length} Tabs`,
        summary: `Multi-tab perspective covering: ${tNode.tabs.map((t) => t.title).join(', ')}`,
        children: tNode.tabs.map((t) => ({
          id: `doc-mm-${idCounter++}`,
          text: t.title,
          type: 'concept' as const,
          badge: 'Tab',
          summary: t.content.replace(/[*_`#]/g, '').slice(0, 180),
        })),
      };
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(tabsBranch);
    } else if (node.type === 'snippet') {
      const snNode = node as SnippetNode;
      const snippetBranch: MindMapItem = {
        id: `doc-mm-${idCounter++}`,
        text: snNode.title || `Code: ${snNode.lang.toUpperCase()}`,
        type: 'snippet',
        badge: snNode.lang.toUpperCase(),
        summary: snNode.code.slice(0, 160),
      };
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(snippetBranch);
    } else if (node.type === 'mindmap') {
      const mmNode = node as MindMapNode;
      const parent = headingStack[headingStack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(mmNode.root);
    }
  }

  // Ensure every node and section has a rich, informative summary
  function ensureSummaries(item: MindMapItem) {
    if (!item.summary) {
      if (item.children && item.children.length > 0) {
        const childNames = item.children.map((c) => c.text).filter(Boolean);
        if (childNames.length > 0) {
          item.summary = `Section covering ${item.children.length} topic${item.children.length === 1 ? '' : 's'}: ${childNames.slice(0, 5).join(', ')}${childNames.length > 5 ? '...' : ''}.`;
        }
      } else if (item.type === 'heading') {
        item.summary = `Section discussion and concepts for ${item.text}.`;
      }
    }

    if (item.children) {
      for (const child of item.children) {
        ensureSummaries(child);
      }
    }
  }

  ensureSummaries(root);

  return root;
}

export function healLatexString(str: string = ''): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/(?<![a-zA-Z\\])ext\{/g, '\\text{')
    .replace(/(?<![a-zA-Z\\])rac\{/g, '\\frac{')
    .replace(/(?<![a-zA-Z\\])imes(?![a-zA-Z])/g, '\\times ')
    .replace(/(?<![a-zA-Z\\])extbf\{/g, '\\textbf{')
    .replace(/(?<![a-zA-Z\\])extit\{/g, '\\textit{')
    .replace(/(?<![a-zA-Z\\])qrt\{/g, '\\sqrt{');
}

export function autoHealVisualMD(rawText: string = ''): string {
  if (!rawText || typeof rawText !== 'string') return '';
  let content = rawText;

  // 1. Normalize common alias tags: $SNIPPET$START -> $SNIPPET$S, $SNIPPET$END -> $SNIPPET$E
  content = content.replace(/\$([A-Z_]+)\$START(?:\?(.*))?$/gim, '$$$1$S?$2');
  content = content.replace(/\$([A-Z_]+)\$END$/gim, '$$$1$E');

  // 2. Scan open macro blocks and close dangling ones
  const lines = content.split(/\r?\n/);
  const healedLines: string[] = [];
  const openBlocks: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const startMatch = trimmed.match(/^\$([A-Z_]+)\$S(?:\?(.*))?$/i);
    if (startMatch) {
      const block = startMatch[1].toUpperCase();
      // If a block of same or incompatible type was unclosed, close it first
      if (openBlocks.length > 0 && block !== 'TAB' && block !== 'STEP') {
        const last = openBlocks.pop()!;
        healedLines.push(`$${last}$E`);
      }
      openBlocks.push(block);
      healedLines.push(line);
      continue;
    }

    const endMatch = trimmed.match(/^\$([A-Z_]+)\$E$/i);
    if (endMatch) {
      const block = endMatch[1].toUpperCase();
      const idx = openBlocks.lastIndexOf(block);
      if (idx !== -1) {
        while (openBlocks.length > idx) {
          const closing = openBlocks.pop()!;
          if (closing === block) {
            healedLines.push(line);
          } else {
            healedLines.push(`$${closing}$E`);
          }
        }
        continue;
      }
    }

    // If heading encountered and an unclosed block is pending, auto-close before heading
    if (openBlocks.length > 0 && /^#{1,6}\s+/.test(trimmed)) {
      while (openBlocks.length > 0) {
        healedLines.push(`$${openBlocks.pop()!}$E`);
      }
    }

    healedLines.push(line);
  }

  // Close any blocks remaining open at EOF
  while (openBlocks.length > 0) {
    healedLines.push(`$${openBlocks.pop()!}$E`);
  }

  // Close unclosed fenced code blocks at EOF
  let inCodeFence = false;
  for (const l of healedLines) {
    if (/^(?:```|~~~)/.test(l.trim())) {
      inCodeFence = !inCodeFence;
    }
  }
  if (inCodeFence) {
    healedLines.push('```');
  }

  // Close unclosed math block ($$) at EOF (outside code fences)
  let inFence = false;
  let mathFenceCount = 0;
  for (const l of healedLines) {
    if (/^(?:```|~~~)/.test(l.trim())) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      const matches = l.match(/(?<!\\)\$\$/g);
      if (matches) {
        mathFenceCount += matches.length;
      }
    }
  }
  if (mathFenceCount % 2 === 1) {
    healedLines.push('$$');
  }

  let healedContent = healedLines.join('\n');

  // Normalize indented math lines (e.g. 2+ spaces before $$ inside or outside lists)
  // so CommonMark/marked does not mistake it for an indented code block
  healedContent = healedContent.replace(/(^|\n)[ \t]{2,}\$\$([\s\S]*?)\$\$/g, '$1\n\n$$$$$2$$$$\n\n');

  // Heal swallowed LaTeX commands in $$...$$ blocks
  healedContent = healedContent.replace(/\$\$([\s\S]*?)\$\$/g, (_match, innerMath) => {
    return `$$${healLatexString(innerMath)}$$`;
  });

  return healedContent;
}

export function parseVisualMD(rawText: string = '', options: ParseOptions = {}): VmdDocument {
  if (typeof rawText !== 'string') {
    if (options.strict) {
      throw new VisualMDParseError('Expected input to be a string', [
        { message: 'Input is not a string', severity: 'error', code: 'INVALID_INPUT_TYPE' },
      ]);
    }
    rawText = String(rawText || '');
  }

  if (options.strict) {
    const val = validateVisualMD(rawText);
    if (!val.isValid) {
      throw new VisualMDValidationError(
        `VisualMD validation failed with unclosed tags: ${val.unclosedTags.join(', ')}`,
        val.unclosedTags
      );
    }
  }

  const autoHeal = options.autoHeal ?? true;
  const processedText = autoHeal ? autoHealVisualMD(rawText) : rawText;
  const lines = processedText.split(/\r?\n/);
  const nodes: VmdNode[] = [];

  let currentTitle = 'Untitled VisualMD Document';
  let titleFound = false;

  let currentMarkdownBuffer: string[] = [];
  let currentMarkdownStartLine = -1;
  let nodeCounter = 0;

  function pushMarkdownLine(line: string, index: number) {
    if (currentMarkdownStartLine === -1) {
      currentMarkdownStartLine = index;
    }
    currentMarkdownBuffer.push(line);
  }

  function cleanMarkdownLines(rawLines: string[]): string[] {
    let inFence = false;
    return rawLines.filter((l) => {
      const trimmed = l.trim();
      if (/^(?:```|~~~)/.test(trimmed)) {
        inFence = !inFence;
        return true;
      }
      if (inFence) return true;
      if (/^\$[A-Z_]+(\$S|\$E)/i.test(trimmed)) return false;
      if (/^\$TAB(\?|$)/i.test(trimmed)) return false;
      if (/^\$STEP(?:@\d+)?(?:\?|$)/i.test(trimmed)) return false;
      if (/^\$EXPLANATION/i.test(trimmed)) return false;
      return true;
    });
  }

  function flushMarkdown(endLine?: number) {
    const cleaned = cleanMarkdownLines(currentMarkdownBuffer);
    const text = cleaned.join('\n').trim();
    if (text) {
      const sLine = currentMarkdownStartLine !== -1 ? currentMarkdownStartLine : 0;
      const eLine = endLine !== undefined ? endLine : (sLine + currentMarkdownBuffer.length - 1);
      nodes.push({
        id: `node-${nodeCounter++}`,
        type: 'markdown',
        content: text,
        raw: currentMarkdownBuffer.join('\n'),
        startLine: sLine,
        endLine: eLine,
      } as MarkdownNode);
    }
    currentMarkdownBuffer = [];
    currentMarkdownStartLine = -1;
  }

  type ActiveBlockType = 'SNIPPET' | 'STEPPER' | 'CANVAS' | 'TABS' | 'CALLOUT' | 'METRICS' | 'QUIZ' | 'MINDMAP';

  interface ActiveBlockState {
    type: ActiveBlockType;
    params: Record<string, string>;
    rawLines: string[];
    startLine: number;
    openLine: string;
  }

  let activeBlock: ActiveBlockState | null = null;

  function finalizeBlock(block: ActiveBlockState, endLine: number) {
    const id = `node-${nodeCounter++}`;
    const rawContent = block.rawLines.join('\n');
    const fullBlockRaw = [block.openLine, ...block.rawLines, `$${block.type}$E`].join('\n');

    let createdNode: VmdNode | null = null;

    try {
      switch (block.type) {
      case 'SNIPPET': {
        const lang = block.params.lang || 'text';
        const title = block.params.title;
        const highlight = block.params.highlight;
        const diff = block.params.diff === 'true';
        createdNode = {
          id,
          type: 'snippet',
          lang,
          title,
          highlight,
          diff,
          code: rawContent.trim(),
        } as SnippetNode;
        break;
      }

      case 'STEPPER': {
        const title = block.params.title || 'Step-by-Step Flow';
        const steps: StepItem[] = [];

        // Parse $STEP@N?title=...
        const stepLines = block.rawLines;
        let currentStep: { index: number; title: string; lines: string[] } | null = null;

        for (const line of stepLines) {
          const stepMatch = line.match(/^\$STEP(?:@(\d+))?(?:\?(.*))?$/i);
          if (stepMatch) {
            if (currentStep) {
              steps.push({
                index: currentStep.index,
                title: currentStep.title,
                content: currentStep.lines.join('\n').trim(),
              });
            }
            const idx = stepMatch[1] ? parseInt(stepMatch[1], 10) : steps.length + 1;
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

        createdNode = {
          id,
          type: 'stepper',
          title,
          steps,
        } as StepperNode;
        break;
      }

      case 'CANVAS': {
        const engine = (['canvas2d', 'svg', 'html', 'webgl'].includes(block.params.engine)
          ? block.params.engine
          : 'canvas2d') as CanvasNode['engine'];
        const height = parseInt(block.params.height, 10) || 300;
        const title = block.params.title;
        createdNode = {
          id,
          type: 'canvas',
          engine,
          height,
          title,
          code: rawContent.trim(),
        } as CanvasNode;
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

        createdNode = {
          id,
          type: 'tabs',
          tabs,
        } as TabsNode;
        break;
      }

      case 'CALLOUT': {
        const rawType = (block.params.type || '').toLowerCase().trim();
        let calloutType: CalloutType = 'insight';
        if (rawType === 'perf' || rawType === 'performance') {
          calloutType = 'perf';
        } else if (rawType === 'warn' || rawType === 'warning' || rawType === 'caution') {
          calloutType = 'warn';
        } else if (rawType === 'danger' || rawType === 'critical' || rawType === 'error') {
          calloutType = 'danger';
        } else if (rawType === 'tip') {
          calloutType = 'tip';
        } else if (rawType === 'insight' || rawType === 'info' || rawType === 'note') {
          calloutType = 'insight';
        }
        const title = block.params.title;
        createdNode = {
          id,
          type: 'callout',
          calloutType,
          title,
          content: rawContent.trim(),
        } as CalloutNode;
        break;
      }

      case 'METRICS': {
        const items: MetricItem[] = [];
        // Support either pipes or newlines, strip leading bullets
        const tokens = rawContent
          .split(/[|\n]/)
          .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
          .filter(Boolean);
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

        createdNode = {
          id,
          type: 'metrics',
          items,
        } as MetricsNode;
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

          // Support bulleted or numbered/lettered checklist options: 1. [x], A) [ ], - [x], [x]
          const optMatch = line.match(/^(?:(?:\d+\.|\w[.)])\s+)?(?:[-*+]\s+)?\[([ xX])\]\s*(.*)$/);
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

        createdNode = {
          id,
          type: 'quiz',
          question,
          options,
          explanation,
        } as QuizNode;
        break;
      }

      case 'MINDMAP': {
        const title = block.params.title || 'Mind Map';
        const root = parseBulletTree(block.rawLines, title);
        createdNode = {
          id,
          type: 'mindmap',
          title,
          root,
        } as MindMapNode;
        break;
      }
      }
    } catch (err) {
      if (options?.strict) {
        throw new VisualMDParseError(
          `Failed to parse ${block.type} block: ${err instanceof Error ? err.message : String(err)}`,
          [
            {
              line: block.startLine,
              message: err instanceof Error ? err.message : String(err),
              severity: 'error',
              code: 'BLOCK_PARSE_ERROR',
            },
          ]
        );
      }
      // Safe fallback: render raw content as a markdown block so rendering never crashes
      createdNode = {
        id,
        type: 'markdown',
        content: `> **Warning**: VisualMD could not parse the \`${block.type}\` block safely.\n\n\`\`\`\n${rawContent}\n\`\`\``,
      } as MarkdownNode;
    }

    if (createdNode) {
      createdNode.raw = fullBlockRaw;
      createdNode.startLine = block.startLine;
      createdNode.endLine = endLine;
      nodes.push(createdNode);
    }
  }

  let inMarkdownCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check code fence state when outside active VisualMD blocks
    if (!activeBlock) {
      if (/^(?:```|~~~)/.test(trimmed)) {
        inMarkdownCodeFence = !inMarkdownCodeFence;
        pushMarkdownLine(line, i);
        continue;
      }
      if (inMarkdownCodeFence) {
        pushMarkdownLine(line, i);
        continue;
      }
    }

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
        finalizeBlock(activeBlock, i);
        activeBlock = null;
        continue;
      }
      if (autoHeal && trimmed.match(/^#\s+/)) {
        finalizeBlock(activeBlock, i - 1);
        activeBlock = null;
        pushMarkdownLine(line, i);
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
        'MINDMAP',
      ];

      if (validBlockTypes.includes(blockType)) {
        // If an active block was already open and autoHeal is enabled, heal it
        if (activeBlock) {
          if (autoHeal) {
            finalizeBlock(activeBlock, i - 1);
            activeBlock = null;
          }
        }

        flushMarkdown(i - 1);
        activeBlock = {
          type: blockType,
          params: parseParams(startMatch[2] || ''),
          rawLines: [],
          startLine: i,
          openLine: line,
        };
        continue;
      }
    }

    // Check for end of VisualMD macro tag: $KEYWORD$E
    if (activeBlock) {
      const endMatch = trimmed.match(/^\$([A-Z_]+)\$E$/i);
      if (endMatch && endMatch[1].toUpperCase() === activeBlock.type) {
        finalizeBlock(activeBlock, i);
        activeBlock = null;
        continue;
      }

      // Auto-heal on markdown headings (H1-H6) or horizontal divider (---) if unclosed
      if (autoHeal && (trimmed.match(/^#{1,6}\s+/) || trimmed.match(/^(?:---|\*\*\*|___)\s*$/))) {
        finalizeBlock(activeBlock, i - 1);
        activeBlock = null;
        pushMarkdownLine(line, i);
        continue;
      }

      // Inside active block
      activeBlock.rawLines.push(line);
      continue;
    }

    // Regular markdown line
    pushMarkdownLine(line, i);
  }

  // End of file handling
  if (activeBlock) {
    finalizeBlock(activeBlock, lines.length - 1);
    activeBlock = null;
  }
  flushMarkdown(lines.length - 1);

  return {
    title: currentTitle,
    nodes,
    rawLength: rawText.length,
    parsedAt: new Date().toISOString(),
  };
}

export function validateVisualMD(rawText: string = ''): { isValid: boolean; errors: string[]; unclosedTags: string[] } {
  const safeText = typeof rawText === 'string' ? rawText : '';
  const errors: string[] = [];
  const unclosedTags: string[] = [];
  const lines = safeText.split(/\r?\n/);
  const openStack: { type: string; line: number }[] = [];
  let inMarkdownCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Ignore macro-like markers inside code fences
    if (/^(?:```|~~~)/.test(trimmed)) {
      inMarkdownCodeFence = !inMarkdownCodeFence;
      continue;
    }
    if (inMarkdownCodeFence) {
      continue;
    }

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
    unclosedTags.push(`$${unclosed.type}$S`);
    errors.push(`Line ${unclosed.line}: Tag $${unclosed.type}$S was never closed with $${unclosed.type}$E.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    unclosedTags,
  };
}
