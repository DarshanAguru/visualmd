import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import { Annotation } from '../../types';
import { Check, X, Edit3, CornerDownLeft, MessageSquare, Trash2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  annotations?: Annotation[];
  onDeleteAnnotation?: (id: string) => void;
  onUpdateContent?: (newContent: string) => void;
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeRenderedHtml(html: string): string {
  if (!html) return '';
  let safe = html;
  // 1. Strip all <script> tags and enclosed scripts
  safe = safe.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 2. Strip embedded object, embed, iframe, form, base, link, meta tags
  safe = safe.replace(/<\/?(?:object|embed|iframe|frame|frameset|applet|base|meta|link|form)\b[^>]*>/gi, '');
  // 3. Strip all inline event handlers (onerror, onload, onclick, onmouseover, etc.)
  safe = safe.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 4. Neutralize dangerous pseudo-protocols (javascript:, vbscript:, data:text/html)
  safe = safe.replace(/\b(href|src|action)\s*=\s*(["']?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"'\s>]*\2/gi, '$1="about:blank#blocked"');
  return safe;
}

function sanitizeMarkdownContent(raw: string): string {
  if (!raw) return '';
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      // Filter out any macro directives that shouldn't appear in the display
      if (/^\$[A-Z_]+(\$S|\$E)/i.test(trimmed)) return false;
      if (/^\$TAB(\?|$)/i.test(trimmed)) return false;
      if (/^\$STEP@\d+/i.test(trimmed)) return false;
      if (/^\$EXPLANATION/i.test(trimmed)) return false;
      return true;
    })
    .join('\n');
}

interface MathItem {
  math: string;
  isBlock: boolean;
}

function renderMathExpression(math: string, isBlock: boolean): string {
  let m = math.trim();
  const escapedOriginal = escapeHtml(m);

  // Greek letters
  const greek: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
    rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
    chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
    Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  };
  m = m.replace(/\\([a-zA-Z]+)/g, (match, word) => greek[word] || match);

  // Mathematical operators & relations
  m = m
    .replace(/\\(?:le|leq)\b/g, '≤')
    .replace(/\\(?:ge|geq)\b/g, '≥')
    .replace(/\\(?:ne|neq)\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\mp\b/g, '∓')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\subset\b/g, '⊂')
    .replace(/\\subseteq\b/g, '⊆')
    .replace(/\\cap\b/g, '∩')
    .replace(/\\cup\b/g, '∪')
    .replace(/\\forall\b/g, '∀')
    .replace(/\\exists\b/g, '∃')
    .replace(/\\(?:to|rightarrow)\b/g, '→')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Leftarrow\b/g, '⇐')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\partial\b/g, '∂')
    .replace(/\\nabla\b/g, '∇')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Fractions: \frac{a}{b} -> (a / b)
  m = m.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');

  // Subscripts: X_1 or X_{abc}
  m = m.replace(/([a-zA-Z0-9\)\}])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
  m = m.replace(/([a-zA-Z0-9\)\}])_([a-zA-Z0-9]+)/g, '$1<sub>$2</sub>');

  // Superscripts: X^2 or X^{abc}
  m = m.replace(/([a-zA-Z0-9\)\}])\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
  m = m.replace(/([a-zA-Z0-9\)\}])\^([a-zA-Z0-9]+)/g, '$1<sup>$2</sup>');

  // Single-letter variable names italicized
  m = m.replace(/\b([A-Za-z])\b(?![^<]*>)/g, '<i>$1</i>');

  if (isBlock) {
    return `<div class="vmd-math-block select-text" title="Math formula: ${escapedOriginal}">${m}</div>`;
  }
  return `<span class="vmd-math select-text" title="Math: ${escapedOriginal}">${m}</span>`;
}

function preprocessMath(markdown: string): { text: string; mathMap: Map<string, MathItem> } {
  const mathMap = new Map<string, MathItem>();
  let counter = 0;

  // Protect code fences and inline backticks
  const codeBlocks: string[] = [];
  let protectedText = markdown.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `VMDCODEFENCE${codeBlocks.length}END`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 1. Block math: $$...$$
  protectedText = protectedText.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    const key = `VMDMATHBLOCK${counter++}END`;
    mathMap.set(key, { math, isBlock: true });
    return `\n\n${key}\n\n`;
  });

  // 2. Inline math: $...$
  protectedText = protectedText.replace(/(?<!\\)\$([^\s$](?:[^$]*?[^\s$])?)\$/g, (match, math) => {
    // If it's pure numbers/currency e.g. $50 or $100.00, leave as literal currency
    if (/^\d+(?:\.\d{1,2})?$/.test(math.trim())) {
      return match;
    }
    const key = `VMDMATHINLINE${counter++}END`;
    mathMap.set(key, { math, isBlock: false });
    return key;
  });

  // Restore code fences
  protectedText = protectedText.replace(/VMDCODEFENCE(\d+)END/g, (_match, idx) => {
    return codeBlocks[parseInt(idx, 10)] || '';
  });

  return { text: protectedText, mathMap };
}

function restoreMath(html: string, mathMap: Map<string, MathItem>): string {
  let result = html;
  for (const [key, item] of mathMap.entries()) {
    const rendered = renderMathExpression(item.math, item.isBlock);
    if (item.isBlock) {
      const pWrapped = new RegExp(`<p>\\s*${key}\\s*<\\/p>`, 'gi');
      if (pWrapped.test(result)) {
        result = result.replace(pWrapped, rendered);
      } else {
        result = result.replaceAll(key, rendered);
      }
    } else {
      result = result.replaceAll(key, rendered);
    }
    // Backward-compatibility: in case marked or anything wrapped in <strong>/<em>
    result = result.replace(new RegExp(`<strong>\\s*${key}\\s*<\\/strong>`, 'gi'), rendered);
    result = result.replace(new RegExp(`<em>\\s*${key}\\s*<\\/em>`, 'gi'), rendered);
  }
  // Sanitize any stray legacy placeholder tokens from previous renders
  result = result.replace(/<(?:strong|em)>\s*VMD_(?:INLINE|BLOCK)_MATH_\d+\s*<\/(?:strong|em)>/gi, '');
  result = result.replace(/__VMD_(?:INLINE|BLOCK)_MATH_\d+__/gi, '');
  return result;
}

function toggleTaskItem(markdown: string, targetIndex: number): string {
  let currentIndex = 0;
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([ \t]*-[ \t]+\[)([ xX])(\][ \t]+.*)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const isChecked = match[2].toLowerCase() === 'x';
        lines[i] = match[1] + (isChecked ? ' ' : 'x') + match[3];
        return lines.join('\n');
      }
      currentIndex++;
    }
  }
  return markdown;
}

function getTableCellValue(markdown: string, tableIndex: number, rowIndex: number, colIndex: number): string {
  const lines = markdown.split(/\r?\n/);
  let currentTable = -1;
  let inTable = false;
  let currentBodyRow = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTable++;
        currentBodyRow = -1;
      }

      const isDelimiter = /^\|(?:\s*:?-+:?\s*\|)+$/.test(line);
      if (isDelimiter) {
        currentBodyRow = 0;
        continue;
      }

      if (currentTable === tableIndex && currentBodyRow >= 0) {
        if (currentBodyRow === rowIndex) {
          const cells = lines[i].split('|').slice(1, -1);
          if (colIndex >= 0 && colIndex < cells.length) {
            return cells[colIndex].trim();
          }
        }
        currentBodyRow++;
      }
    } else {
      inTable = false;
    }
  }
  return '';
}

function updateTableCell(
  markdown: string,
  tableIndex: number,
  rowIndex: number,
  colIndex: number,
  newValue: string
): string {
  const lines = markdown.split(/\r?\n/);
  let currentTable = -1;
  let inTable = false;
  let currentBodyRow = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTable++;
        currentBodyRow = -1;
      }

      const isDelimiter = /^\|(?:\s*:?-+:?\s*\|)+$/.test(line);
      if (isDelimiter) {
        currentBodyRow = 0;
        continue;
      }

      if (currentTable === tableIndex && currentBodyRow >= 0) {
        if (currentBodyRow === rowIndex) {
          const rawParts = lines[i].split('|');
          const cells = rawParts.slice(1, -1);
          if (colIndex >= 0 && colIndex < cells.length) {
            cells[colIndex] = ' ' + newValue.replace(/\|/g, '\\|').trim() + ' ';
            lines[i] = '|' + cells.join('|') + '|';
            return lines.join('\n');
          }
        }
        currentBodyRow++;
      }
    } else {
      inTable = false;
    }
  }
  return markdown;
}

function addTableRow(markdown: string, tableIndex: number): string {
  const lines = markdown.split(/\r?\n/);
  let currentTable = -1;
  let inTable = false;
  let lastRowLine = -1;
  let colCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTable++;
      }
      if (currentTable === tableIndex) {
        lastRowLine = i;
        if (colCount === 0) {
          colCount = line.split('|').slice(1, -1).length;
        }
      }
    } else {
      if (inTable && currentTable === tableIndex) {
        break;
      }
      inTable = false;
    }
  }

  if (lastRowLine >= 0 && colCount > 0) {
    const emptyRow = '|' + Array(colCount).fill('   ').join('|') + '|';
    lines.splice(lastRowLine + 1, 0, emptyRow);
    return lines.join('\n');
  }
  return markdown;
}

function enhanceMarkdownHtml(rawHtml: string, editableTables: Set<number>): string {
  let html = rawHtml;

  // 1. Task Checkboxes: make them checkable with data-task-idx
  let taskIdx = 0;
  html = html.replace(/<input([^>]*?)type=["']checkbox["']([^>]*?)>/gi, (_match, before, after) => {
    const isChecked = /checked/i.test(before + after);
    const idx = taskIdx++;
    return `<input type="checkbox" class="vmd-task-checkbox cursor-pointer" data-task-idx="${idx}" ${isChecked ? 'checked' : ''} />`;
  });

  // Mark task list items for clean styling
  html = html.replace(/<li([^>]*)>(\s*<input[^>]*class=["']vmd-task-checkbox[^>]*>)/gi, '<li$1 class="vmd-task-item">$2');

  // 2. Tables Enhancement: wrap and add data attributes for cell editing + table header toolbar
  let tableIdx = 0;
  html = html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const currentTableIdx = tableIdx++;
    const isEditable = editableTables.has(currentTableIdx);
    let rowIdx = 0;
    const enhancedTable = tableHtml.replace(/<tbody>([\s\S]*?)<\/tbody>/gi, (_tbodyMatch, tbodyContent) => {
      const enhancedBody = tbodyContent.replace(/<tr[\s\S]*?<\/tr>/gi, (trMatch: string) => {
        const currentRowIdx = rowIdx++;
        let colIdx = 0;
        return trMatch.replace(/<td([^>]*)>([\s\S]*?)<\/td>/gi, (_tdMatch: string, tdAttrs: string, cellContent: string) => {
          const currentColIdx = colIdx++;
          const trimmed = cellContent.trim();
          const isEmpty = !trimmed || trimmed === '&nbsp;';
          const displayContent = isEmpty
            ? `<span class="vmd-cell-placeholder text-[var(--text-muted)] italic text-[11px] opacity-60 select-none flex items-center gap-1 pointer-events-none"><span class="text-[9px] opacity-40">✎</span> <span class="opacity-70">empty</span></span>`
            : cellContent;
          const cursorClass = isEditable ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : 'cursor-default select-text';
          const cellTitle = isEditable ? 'Click to edit cell contents' : 'Read-only cell (select text to highlight or add note)';
          return `<td${tdAttrs} data-table-idx="${currentTableIdx}" data-row-idx="${currentRowIdx}" data-col-idx="${currentColIdx}" class="vmd-table-cell ${cursorClass} transition-colors" title="${cellTitle}">${displayContent}</td>`;
        });
      });
      return `<tbody>${enhancedBody}</tbody>`;
    });

    return `
      <div class="vmd-table-wrapper w-full max-w-full my-5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] shadow-xs relative">
        <div class="vmd-table-header flex items-center justify-between px-3.5 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-xs select-none">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-mono text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Table ${currentTableIdx + 1}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium border ${isEditable ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-slate-500/10 text-[var(--text-muted)] border-slate-500/20'}">
              ${isEditable ? '✎ Edit Mode' : '🔒 Read-Only'}
            </span>
            <span class="text-[10px] text-[var(--text-muted)] hidden sm:inline truncate">
              ${isEditable ? 'Click any cell to edit contents' : 'Select cell text to highlight or add notes'}
            </span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" class="vmd-toggle-table-edit-btn flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium cursor-pointer border transition-colors ${isEditable ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-color)]'}" data-table-idx="${currentTableIdx}" title="${isEditable ? 'Finish editing table' : 'Edit table contents and cells'}">
              <span>${isEditable ? '✓ Done' : '✎ Edit Table'}</span>
            </button>
            ${isEditable ? `
              <button type="button" class="vmd-add-table-row-btn flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-[10px] transition-colors cursor-pointer" data-table-idx="${currentTableIdx}" title="Add a new row to this table">
                <span>+ Row</span>
              </button>
            ` : ''}
          </div>
        </div>
        <div class="vmd-table-scroll-container w-full max-w-full overflow-x-auto">
          ${enhancedTable}
        </div>
        <div class="vmd-table-footer flex items-center justify-between px-3.5 py-1.5 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] select-none">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[9px] text-[var(--text-muted)]">Rows & columns auto-aligned</span>
            <span class="vmd-table-scroll-hint hidden items-center gap-1 text-[9px] font-mono text-[var(--accent)] bg-[var(--accent-surface)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">⟷ Scrollable table</span>
          </div>
          ${isEditable ? `
            <button type="button" class="vmd-add-table-row-btn flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-[10px] transition-colors cursor-pointer" data-table-idx="${currentTableIdx}" title="Add a new row to this table">
              <span>+ Add Row</span>
            </button>
          ` : `
            <span class="text-[9px] font-mono text-[var(--text-muted)]">Click '✎ Edit Table' above to edit</span>
          `}
        </div>
      </div>
    `;
  });

  // 3. Images: rewrite relative paths to /api/assets and style responsive container with error fallback
  html = html.replace(/<img([^>]+?)src=["']([^"']+)["']([^>]*?)>/gi, (_match, before, src, after) => {
    const trimmedSrc = src.trim();
    let finalSrc = trimmedSrc;
    if (!/^(https?:|data:|blob:|\/\/)/i.test(trimmedSrc)) {
      // Relative path -> route through /api/assets/
      const clean = trimmedSrc.replace(/^(\.\/|\/)+/, '');
      finalSrc = `/api/assets/${clean}`;
    }
    return `<div class="vmd-image-container">
      <img${before}src="${finalSrc}" loading="lazy" class="vmd-rendered-image transition-transform hover:scale-[1.005]" ${after} />
      <div class="vmd-image-fallback-badge hidden items-center gap-2 p-2.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 font-mono mt-1 select-none">
        <span>🖼️ Image not found in workspace:</span>
        <span class="underline">${trimmedSrc}</span>
      </div>
    </div>`;
  });

  // 4. Links: rewrite relative non-markdown asset downloads and handle external links
  html = html.replace(/<a([^>]+?)href=["']([^"']+)["']([^>]*?)>/gi, (_match, before, href, after) => {
    const trimmedHref = href.trim();
    // External link
    if (/^https?:\/\//i.test(trimmedHref)) {
      return `<a${before}href="${trimmedHref}" target="_blank" rel="noopener noreferrer"${after}>`;
    }
    // Relative link to non-markdown file/asset (e.g. pdf, csv, zip, png)
    if (
      !/^(mailto:|#|javascript:|\/\/)/i.test(trimmedHref) &&
      !/\.(vmd|md|markdown|mdown|mkd|mkdn)$/i.test(trimmedHref) &&
      !trimmedHref.startsWith('/view/')
    ) {
      const clean = trimmedHref.replace(/^(\.\/|\/)+/, '');
      return `<a${before}href="/api/assets/${clean}" target="_blank" rel="noopener noreferrer"${after}>`;
    }
    return `<a${before}href="${trimmedHref}"${after}>`;
  });

  // 5. Code Blocks / Templates: add 1-click copy button
  html = html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (_match, preAttrs, preContent) => {
    return `<div class="relative group/pre my-4"><pre${preAttrs}>${preContent}</pre><button type="button" class="vmd-copy-code-btn absolute top-2.5 right-2.5 px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all opacity-0 group-hover/pre:opacity-100 flex items-center gap-1 cursor-pointer shadow-xs select-none" title="Copy to clipboard">Copy</button></div>`;
  });

  return html;
}

/**
 * Robust DOM TreeWalker annotation application.
 * Reliably highlights text across multiple lines, bullet points, links, and tags,
 * and anchors table cells even after text edits.
 */
function applyDOMAnnotations(container: HTMLElement, baseHtml: string, annotations?: Annotation[]) {
  // Always reset to pristine baseHtml first to prevent duplicate stacking!
  container.innerHTML = baseHtml;

  // Cleanly attach image error fallback handlers without inline JS attributes
  container.querySelectorAll<HTMLImageElement>('img.vmd-rendered-image').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        img.parentElement?.classList.add('vmd-image-failed');
      },
      { once: true }
    );
  });

  if (!annotations || annotations.length === 0) return;

  // 1. Table cell anchored annotations (only when there is no specific selected text range)
  for (const anno of annotations) {
    if (anno.table_cell && (!anno.selected_text || anno.selected_text.trim().length < 2)) {
      const parts = anno.table_cell.split(':');
      if (parts.length === 3) {
        const [tIdx, rIdx, cIdx] = parts;
        const cell = container.querySelector(
          `td[data-table-idx="${tIdx}"][data-row-idx="${rIdx}"][data-col-idx="${cIdx}"]`
        ) as HTMLElement | null;
        if (cell) {
          cell.setAttribute('data-note-id', anno.id);
          cell.classList.add('vmd-cell-annotated');
          cell.style.cursor = 'pointer';
          const color = anno.color || 'yellow';
          const isNote = Boolean(anno.note && anno.note !== 'Highlighted snippet');
          if (isNote) {
            cell.title = `Note: ${anno.note} (Hover cell to view note)`;
            const badge = document.createElement('span');
            badge.className = `vmd-cell-badge inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-${color}-500/15 text-${color}-600 dark:text-${color}-400 border border-${color}-500/30 select-none pointer-events-none relative`;
            badge.setAttribute('data-note-id', anno.id);
            badge.textContent = '💬 Note';
            cell.appendChild(badge);
          }
        }
      }
    }
  }

  // 2. Text range annotations (multi-line, cross-tag, and inside table cells)
  for (const anno of annotations) {
    if (!anno.selected_text || anno.selected_text.trim().length < 2) continue;

    const targetRaw = anno.selected_text.trim();
    const targetOccur = anno.occurrence_index ?? 0;
    const color = anno.color || 'yellow';
    const isNote = Boolean(anno.note && anno.note !== 'Highlighted snippet');

    // Create a TreeWalker that visits text nodes
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
          if (
            parent.closest('.vmd-note-tooltip') ||
            parent.closest('.vmd-note-box') ||
            parent.closest('.vmd-highlight') ||
            parent.closest('.vmd-cell-badge') ||
            parent.closest('.vmd-table-header') ||
            parent.closest('.vmd-table-footer')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    interface TextNodeInfo {
      node: Text;
      start: number;
      end: number;
    }
    const nodes: TextNodeInfo[] = [];
    let fullText = '';
    let curr: Node | null;
    while ((curr = walker.nextNode())) {
      const textNode = curr as Text;
      const val = textNode.nodeValue || '';
      const start = fullText.length;
      fullText += val;
      nodes.push({ node: textNode, start, end: fullText.length });
    }

    if (nodes.length === 0 || !fullText) continue;

    // Search target in fullText
    let matchStart = -1;
    let matchEnd = -1;

    // 1. Direct search (case-insensitive)
    let searchIdx = 0;
    let currentOccur = 0;
    const lowerFull = fullText.toLowerCase();
    const lowerTarget = targetRaw.toLowerCase();

    while ((searchIdx = lowerFull.indexOf(lowerTarget, searchIdx)) !== -1) {
      if (currentOccur === targetOccur) {
        matchStart = searchIdx;
        matchEnd = searchIdx + targetRaw.length;
        break;
      }
      currentOccur++;
      searchIdx += lowerTarget.length;
    }

    // 2. Fallback: Normalized whitespace search across tags / lines
    if (matchStart === -1) {
      const tokens = targetRaw
        .split(/\s+/)
        .filter(Boolean)
        .map(escapeRegex);
      if (tokens.length > 0) {
        const pattern = tokens.join('\\s+');
        try {
          const regex = new RegExp(pattern, 'gi');
          let m: RegExpExecArray | null;
          let regOccur = 0;
          while ((m = regex.exec(fullText)) !== null) {
            if (regOccur === targetOccur || matchStart === -1) {
              matchStart = m.index;
              matchEnd = m.index + m[0].length;
              if (regOccur === targetOccur) break;
            }
            regOccur++;
          }
        } catch {}
      }
    }

    // 3. Fallback: First 30 characters and last 30 characters for long multi-line selections
    if (matchStart === -1 && targetRaw.length > 40) {
      const startSnippet = targetRaw.slice(0, 30).trim().toLowerCase();
      const endSnippet = targetRaw.slice(-30).trim().toLowerCase();
      const sIdx = lowerFull.indexOf(startSnippet);
      if (sIdx !== -1) {
        const eIdx = lowerFull.indexOf(endSnippet, sIdx);
        if (eIdx !== -1) {
          matchStart = sIdx;
          matchEnd = eIdx + endSnippet.length;
        }
      }
    }

    if (matchStart === -1 || matchEnd <= matchStart) continue;

    // Collect overlapping text nodes
    const overlappingNodes: { info: TextNodeInfo; nodeStart: number; nodeEnd: number }[] = [];
    for (const info of nodes) {
      if (info.end <= matchStart) continue;
      if (info.start >= matchEnd) break;
      const nodeStart = Math.max(0, matchStart - info.start);
      const nodeEnd = Math.min(info.node.nodeValue?.length || 0, matchEnd - info.start);
      if (nodeEnd > nodeStart) {
        overlappingNodes.push({ info, nodeStart, nodeEnd });
      }
    }

    let isFirstSegment = true;
    for (const item of overlappingNodes) {
      const textNode = item.info.node;
      const fullNodeText = textNode.nodeValue || '';
      const beforeText = fullNodeText.slice(0, item.nodeStart);
      const matchText = fullNodeText.slice(item.nodeStart, item.nodeEnd);
      const afterText = fullNodeText.slice(item.nodeEnd);

      const parent = textNode.parentNode;
      if (!parent) continue;

      const fragment = document.createDocumentFragment();
      if (beforeText) {
        fragment.appendChild(document.createTextNode(beforeText));
      }

      if (isNote) {
        const noteWrapper = document.createElement('span');
        noteWrapper.className = `vmd-note-box vmd-note-${color}`;
        noteWrapper.setAttribute('data-note-id', anno.id);

        const textSpan = document.createElement('span');
        textSpan.className = 'vmd-note-text';
        textSpan.textContent = matchText;
        noteWrapper.appendChild(textSpan);

        if (isFirstSegment) {
          const badge = document.createElement('span');
          badge.className = 'vmd-note-badge';
          badge.textContent = '💬';
          noteWrapper.appendChild(badge);
          isFirstSegment = false;
        }

        fragment.appendChild(noteWrapper);
      } else {
        const mark = document.createElement('mark');
        mark.className = `vmd-highlight vmd-highlight-${color}`;
        mark.setAttribute('data-note-id', anno.id);
        mark.title = `Highlighted in ${color}`;
        mark.textContent = matchText;
        fragment.appendChild(mark);
      }

      if (afterText) {
        fragment.appendChild(document.createTextNode(afterText));
      }

      try {
        parent.replaceChild(fragment, textNode);
      } catch {}
    }
  }
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  annotations,
  onDeleteAnnotation,
  onUpdateContent,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [editableTables, setEditableTables] = React.useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = React.useState<{
    tableIdx: number;
    rowIdx: number;
    colIdx: number;
    value: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);

  const [activeTooltip, setActiveTooltip] = React.useState<{
    id: string;
    note: string;
    color: string;
    title: string;
    badgeRect: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [tooltipHeight, setTooltipHeight] = React.useState(140);
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const tooltipLeaveTimer = React.useRef<any>(null);

  React.useLayoutEffect(() => {
    if (tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h && Math.abs(h - tooltipHeight) > 2) {
        setTooltipHeight(h);
      }
    }
  }, [activeTooltip]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const allActive = containerRef.current.querySelectorAll('.vmd-note-active');
    allActive.forEach((el) => el.classList.remove('vmd-note-active'));

    if (activeTooltip) {
      const targetEl = containerRef.current.querySelector(`[data-note-id="${activeTooltip.id}"]`);
      if (targetEl) {
        targetEl.classList.add('vmd-note-active');
      }
    }
  }, [activeTooltip?.id]);

  const html = useMemo(() => {
    try {
      const sanitized = sanitizeMarkdownContent(content);
      const { text: mathPreprocessed, mathMap } = preprocessMath(sanitized);
      const parsedHtml = marked.parse(mathPreprocessed, { async: false, breaks: true }) as string;
      const safeHtml = sanitizeRenderedHtml(parsedHtml);
      const withMath = restoreMath(safeHtml, mathMap);
      return enhanceMarkdownHtml(withMath, editableTables);
    } catch {
      return `<p>${escapeHtml(content)}</p>`;
    }
  }, [content, editableTables]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    applyDOMAnnotations(containerRef.current, html, annotations);
  }, [html, annotations]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const scrollContainers = containerRef.current.querySelectorAll<HTMLElement>('.vmd-table-scroll-container');
    const checkOverflow = () => {
      scrollContainers.forEach((sc) => {
        const hasOverflow = sc.scrollWidth > sc.clientWidth + 2;
        const wrapper = sc.closest('.vmd-table-wrapper');
        if (wrapper) {
          const hint = wrapper.querySelector('.vmd-table-scroll-hint');
          if (hint) {
            hint.classList.toggle('hidden', !hasOverflow);
            hint.classList.toggle('inline-flex', hasOverflow);
          }
        }
      });
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [html]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const handleTableScroll = () => {
      setActiveTooltip(null);
    };
    const scrollContainers = containerRef.current.querySelectorAll('.vmd-table-scroll-container');
    scrollContainers.forEach((el) => el.addEventListener('scroll', handleTableScroll));
    return () => {
      scrollContainers.forEach((el) => el.removeEventListener('scroll', handleTableScroll));
    };
  }, [html]);

  React.useEffect(() => {
    const handleScrollOrKey = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') {
        setActiveTooltip(null);
        return;
      }
      if (e.type === 'scroll') {
        setActiveTooltip(null);
      }
    };
    window.addEventListener('scroll', handleScrollOrKey, true);
    window.addEventListener('keydown', handleScrollOrKey);
    return () => {
      window.removeEventListener('scroll', handleScrollOrKey, true);
      window.removeEventListener('keydown', handleScrollOrKey);
    };
  }, []);

  const getTooltipStyle = () => {
    if (!activeTooltip || !containerRef.current) return null;
    const margin = 14;
    const contRect = containerRef.current.getBoundingClientRect();
    const sidebarEl = document.querySelector('aside');
    const sidebarRight = sidebarEl ? sidebarEl.getBoundingClientRect().right : 0;
    const availableLeftGutter = contRect.left - sidebarRight;

    // Use generous card width when ample left gutter is available
    let cardWidth = 280;
    if (availableLeftGutter >= 340) {
      cardWidth = 320;
    } else if (availableLeftGutter < 290) {
      cardWidth = Math.max(240, Math.min(270, availableLeftGutter - 20));
    }

    let left: number;
    let isDockedInMargin = false;

    if (availableLeftGutter >= cardWidth + margin) {
      // Laptop/Desktop: Render cleanly in the empty left margin directly beside the component
      left = contRect.left - cardWidth - margin;
      isDockedInMargin = true;
    } else if (contRect.left >= cardWidth + 12) {
      // Moderate space: dock to the left of the content
      left = Math.max(sidebarRight + 12, contRect.left - cardWidth - 12);
      isDockedInMargin = true;
    } else {
      // Less width screens: safely align to left boundary without overflowing sidebar
      left = Math.max(sidebarRight + 12, Math.min(contRect.left + 8, window.innerWidth - cardWidth - 16));
      isDockedInMargin = false;
    }

    // Exact horizontal axis alignment: center vertically on the note's horizontal center!
    const noteCenterY = activeTooltip.badgeRect.top + activeTooltip.badgeRect.height / 2;
    const top = Math.round(noteCenterY - (tooltipHeight / 2));

    // Generous full Y-axis space utilization: allow note body to expand down to the bottom of the viewport
    const maxBodyHeight = Math.max(260, window.innerHeight - Math.max(0, top) - 110);
    const maxCardHeight = Math.max(340, window.innerHeight - Math.max(0, top) - 16);

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      maxBodyHeight,
      maxCardHeight: `${maxCardHeight}px`,
      isDockedInMargin,
    };
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Match the entire cell if annotated, or the note badge, or the text note box
    const noteEl = target.closest('td[data-note-id], .vmd-cell-badge, .vmd-note-box') as HTMLElement | null;
    if (!noteEl || !containerRef.current) return;

    if (tooltipLeaveTimer.current) {
      clearTimeout(tooltipLeaveTimer.current);
      tooltipLeaveTimer.current = null;
    }

    const annoId = noteEl.getAttribute('data-note-id');
    if (!annoId) return;

    const anno = annotations?.find((a) => a.id === annoId);
    const isNote = Boolean(anno?.note && anno.note !== 'Highlighted snippet');
    if (!anno || !isNote) return;

    if (activeTooltip && activeTooltip.id === anno.id) return;

    // Anchor to noteEl (the exact word/box) if selected_text, else row
    const anchorEl = (anno.table_cell && (!anno.selected_text || anno.selected_text.trim().length < 2))
      ? (noteEl.closest('tr') || noteEl)
      : noteEl;
    const badgeRect = anchorEl.getBoundingClientRect();

    let title = 'Note';
    if (anno.selected_text && anno.selected_text.trim().length >= 2) {
      const snippet = anno.selected_text.trim();
      title = snippet.length > 25 ? `Note: "${snippet.slice(0, 22)}..."` : `Note: "${snippet}"`;
    } else if (anno.table_cell) {
      const parts = anno.table_cell.split(':');
      if (parts.length === 3) {
        title = `Table ${Number(parts[0]) + 1} • Row ${Number(parts[1]) + 1}, Col ${Number(parts[2]) + 1}`;
      } else {
        title = 'Table Cell Note';
      }
    }

    setActiveTooltip({
      id: anno.id,
      note: anno.note,
      color: anno.color || 'yellow',
      title,
      badgeRect: { top: badgeRect.top, left: badgeRect.left, width: badgeRect.width, height: badgeRect.height },
    });
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related.closest('.vmd-floating-note-tooltip, td[data-note-id], .vmd-cell-badge, .vmd-note-box')) {
      return;
    }
    if (tooltipLeaveTimer.current) {
      clearTimeout(tooltipLeaveTimer.current);
    }
    tooltipLeaveTimer.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 1. Delete Annotation
    const deleteId = target.getAttribute('data-delete-id');
    if (deleteId && onDeleteAnnotation) {
      e.stopPropagation();
      onDeleteAnnotation(deleteId);
      return;
    }

    // 2. Checkbox Click (Task list item)
    let checkboxTarget: HTMLElement | null = null;
    if (target.tagName.toLowerCase() === 'input' && target.getAttribute('data-task-idx') !== null) {
      checkboxTarget = target;
    } else {
      const taskLi = target.closest('li.vmd-task-item') as HTMLElement | null;
      if (taskLi) {
        checkboxTarget = taskLi.querySelector('input.vmd-task-checkbox');
      }
    }

    if (checkboxTarget && onUpdateContent) {
      const taskIdxStr = checkboxTarget.getAttribute('data-task-idx');
      if (taskIdxStr !== null) {
        e.stopPropagation();
        const taskIdx = parseInt(taskIdxStr, 10);
        const updatedContent = toggleTaskItem(content, taskIdx);
        onUpdateContent(updatedContent);
        return;
      }
    }

    // 3. Toggle Table Edit Mode (Read-Only vs Edit Mode)
    const toggleBtn = target.closest('.vmd-toggle-table-edit-btn') as HTMLElement | null;
    if (toggleBtn) {
      e.stopPropagation();
      const tIdx = parseInt(toggleBtn.getAttribute('data-table-idx') || '0', 10);
      setEditableTables((prev) => {
        const next = new Set(prev);
        if (next.has(tIdx)) {
          next.delete(tIdx);
        } else {
          next.add(tIdx);
        }
        return next;
      });
      return;
    }

    // 4. Add Table Row Button
    const addRowBtn = target.closest('.vmd-add-table-row-btn') as HTMLElement | null;
    if (addRowBtn && onUpdateContent) {
      e.stopPropagation();
      const tableIdxStr = addRowBtn.getAttribute('data-table-idx');
      if (tableIdxStr !== null) {
        const tableIdx = parseInt(tableIdxStr, 10);
        const updatedContent = addTableRow(content, tableIdx);
        onUpdateContent(updatedContent);
        return;
      }
    }

    // 5. Copy Code Block Button
    const copyBtn = target.closest('.vmd-copy-code-btn') as HTMLElement | null;
    if (copyBtn) {
      e.stopPropagation();
      const codeEl = copyBtn.closest('.group\\/pre')?.querySelector('pre code');
      const textToCopy = codeEl ? codeEl.textContent || '' : '';
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        const origText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          if (copyBtn) copyBtn.textContent = origText || 'Copy';
        }, 2000);
      }
      return;
    }

    // 6. Table Cell Click -> Open Inline Cell Editor ONLY IF in Edit Mode
    const cellEl = target.closest('td.vmd-table-cell') as HTMLElement | null;
    if (cellEl && onUpdateContent) {
      const tableIdxStr = cellEl.getAttribute('data-table-idx');
      const rowIdxStr = cellEl.getAttribute('data-row-idx');
      const colIdxStr = cellEl.getAttribute('data-col-idx');

      if (tableIdxStr !== null && rowIdxStr !== null && colIdxStr !== null) {
        const tableIdx = parseInt(tableIdxStr, 10);
        // If table is in Read-Only mode (the default), do NOT open cell editor!
        // Allow user to select text freely for highlighting or note taking.
        if (!editableTables.has(tableIdx)) {
          return;
        }

        const rowIdx = parseInt(rowIdxStr, 10);
        const colIdx = parseInt(colIdxStr, 10);

        const currentVal = getTableCellValue(content, tableIdx, rowIdx, colIdx);
        const rect = cellEl.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          const editorWidth = Math.min(520, Math.max(340, containerRect.width - 32));
          let left = rect.left - containerRect.left;
          if (left + editorWidth > containerRect.width - 16) {
            left = Math.max(16, containerRect.width - editorWidth - 16);
          }
          if (left < 16) left = 16;

          const spaceBelow = window.innerHeight - rect.bottom;
          const estimatedHeight = 220;
          let top = rect.top - containerRect.top + rect.height + 6;
          if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
            top = Math.max(8, rect.top - containerRect.top - estimatedHeight - 6);
          }

          setEditingCell({
            tableIdx,
            rowIdx,
            colIdx,
            value: currentVal,
            rect: {
              top,
              left,
              width: editorWidth,
              height: Math.max(rect.height, 40),
            },
          });
        }
      }
    }

    // 7. Click outside tooltip dismisses it
    if (activeTooltip && !target.closest('.vmd-floating-note-tooltip')) {
      setActiveTooltip(null);
    }
  };

  const handleCommitCellEdit = (newValue: string) => {
    if (!editingCell) return;
    const { tableIdx, rowIdx, colIdx, value } = editingCell;
    setEditingCell(null);

    if (newValue.trim() !== value.trim() && onUpdateContent) {
      const updated = updateTableCell(content, tableIdx, rowIdx, colIdx, newValue);
      onUpdateContent(updated);
    }
  };

  return (
    <div className="relative w-full max-w-full">
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        className="markdown-body leading-relaxed font-normal text-[var(--text-primary)] w-full max-w-full"
        style={{
          fontSize: 'calc(1rem * var(--vmd-font-scale, 1))',
          color: 'var(--text-primary)',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Enhanced Spacious Table Cell Editor Popover with Backdrop */}
      {editingCell && createPortal(
        <>
          <div
            className="fixed inset-0 z-[99] bg-black/15 backdrop-blur-[1px]"
            onClick={() => setEditingCell(null)}
          />

          <div
            className="fixed z-[100] animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${editingCell.rect.top}px`,
              left: `${editingCell.rect.left}px`,
              width: `${editingCell.rect.width}px`,
              maxWidth: 'calc(100% - 32px)',
            }}
          >
            <div className="bg-[var(--bg-card)] border-2 border-[var(--accent)] rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 ring-4 ring-[var(--accent)]/15">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-[var(--border-color)] text-[10px] text-[var(--text-muted)] font-medium">
                <span className="flex items-center gap-1.5 font-mono text-[var(--text-primary)]">
                  <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Table {editingCell.tableIdx + 1} • Row {editingCell.rowIdx + 1}, Col {editingCell.colIdx + 1}
                </span>
                <span className="opacity-70 font-mono text-[9px]">Enter to save • Esc to cancel</span>
              </div>

              <textarea
                id="vmd-table-cell-editor-textarea"
                defaultValue={editingCell.value}
                autoFocus
                rows={Math.min(6, Math.max(3, Math.ceil((editingCell.value || '').length / 40)))}
                onFocus={(e) => {
                  e.target.select();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    handleCommitCellEdit(e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingCell(null);
                  }
                }}
                className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg p-2.5 text-xs font-mono leading-relaxed border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent)] resize-y min-h-[75px]"
                placeholder="Enter cell text, link, formula, or notes..."
              />

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('vmd-table-cell-editor-textarea') as HTMLTextAreaElement | null;
                      if (el) el.value = '';
                    }}
                    className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                    title="Clear content"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('vmd-table-cell-editor-textarea') as HTMLTextAreaElement | null;
                    if (el) {
                      handleCommitCellEdit(el.value);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-opacity cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Cell
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Smart Margin Note Card - Shows on Left Side Empty Area */}
      {(() => {
        if (!activeTooltip) return null;
        const pos = getTooltipStyle();
        if (!pos) return null;

        return (
          <div
            ref={tooltipRef}
            className="vmd-floating-note-tooltip fixed z-[9999999] pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-150"
            onMouseEnter={() => {
              if (tooltipLeaveTimer.current) {
                clearTimeout(tooltipLeaveTimer.current);
                tooltipLeaveTimer.current = null;
              }
            }}
            onMouseLeave={() => {
              setActiveTooltip(null);
            }}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxCardHeight,
            }}
          >
            <div className="relative p-3.5 rounded-2xl bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)] text-xs leading-relaxed backdrop-blur-md flex flex-col">
              {/* Pointer arrow aligning directly on the note's horizontal axis */}
              {pos.isDockedInMargin && (
                <div
                  className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-[var(--bg-card)] border-t border-r border-[var(--border-color)] z-10"
                />
              )}

              {/* Left accent color strip */}
              <div
                className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
                style={{
                  backgroundColor:
                    activeTooltip.color === 'emerald'
                      ? '#10b981'
                      : activeTooltip.color === 'sky'
                      ? '#38bdf8'
                      : activeTooltip.color === 'rose'
                      ? '#f43f5e'
                      : activeTooltip.color === 'purple'
                      ? '#a855f7'
                      : activeTooltip.color === 'orange'
                      ? '#ea580c'
                      : activeTooltip.color === 'teal'
                      ? '#0d9488'
                      : activeTooltip.color === 'coral'
                      ? '#dc2626'
                      : '#f59e0b',
                }}
              />

              {/* Card Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border-color)] pl-1.5 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="p-1.5 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-surface)' }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] truncate leading-tight">
                      {activeTooltip.title}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      Marginal Note
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteAnnotation) onDeleteAnnotation(activeTooltip.id);
                      setActiveTooltip(null);
                    }}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content Body - Utilizes full available Y-axis space instead of small scroll view */}
              <div
                style={{ maxHeight: `${pos.maxBodyHeight}px` }}
                className="pl-1.5 pr-1 text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed overflow-y-auto selection:bg-blue-500/20"
              >
                {activeTooltip.note}
              </div>

              {/* Status Footer */}
              <div className="mt-2.5 pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[9px] text-[var(--text-muted)] font-mono select-none pl-1.5">
                <span>Hover away to dismiss</span>
                <span>Esc to close</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
