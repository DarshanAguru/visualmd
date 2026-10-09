import React, { useMemo } from 'react';
import { marked } from 'marked';
import { Annotation } from '../../types';
import { Check, X, Edit3, CornerDownLeft } from 'lucide-react';

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

function enhanceMarkdownHtml(rawHtml: string): string {
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

  // 2. Tables Enhancement: wrap and add data attributes for cell editing + add row button
  let tableIdx = 0;
  html = html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const currentTableIdx = tableIdx++;
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
          return `<td${tdAttrs} data-table-idx="${currentTableIdx}" data-row-idx="${currentRowIdx}" data-col-idx="${currentColIdx}" class="vmd-table-cell cursor-pointer transition-colors" title="Click to edit cell">${displayContent}</td>`;
        });
      });
      return `<tbody>${enhancedBody}</tbody>`;
    });

    return `
      <div class="vmd-table-wrapper w-full max-w-full my-5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] shadow-xs overflow-hidden">
        <div class="vmd-table-scroll-container w-full max-w-full overflow-x-auto">
          ${enhancedTable}
        </div>
        <div class="vmd-table-footer flex items-center justify-between px-3.5 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] select-none">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] font-medium text-[var(--text-secondary)]">Table ${currentTableIdx + 1}</span>
            <span class="opacity-40">•</span>
            <span class="text-[10px] text-[var(--text-muted)]">Click cell to edit</span>
            <span class="vmd-table-scroll-hint hidden items-center gap-1 text-[9px] font-mono text-[var(--accent)] bg-[var(--accent-surface)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">⟷ Scrollable table</span>
          </div>
          <button type="button" class="vmd-add-table-row-btn flex items-center gap-1 px-2.5 py-0.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors font-medium cursor-pointer shadow-2xs" data-table-idx="${currentTableIdx}" title="Add a new row to this table">
            <span>+ Add Row</span>
          </button>
        </div>
      </div>
    `;
  });

  // 3. External Links: open in new tab securely
  html = html.replace(/<a\s+(href=["']https?:\/\/[^"']+["'])([^>]*)>/gi, '<a $1 target="_blank" rel="noopener noreferrer"$2>');

  // 4. Code Blocks / Templates: add 1-click copy button
  html = html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (_match, preAttrs, preContent) => {
    return `<div class="relative group/pre my-4"><pre${preAttrs}>${preContent}</pre><button type="button" class="vmd-copy-code-btn absolute top-2.5 right-2.5 px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all opacity-0 group-hover/pre:opacity-100 flex items-center gap-1 cursor-pointer shadow-xs select-none" title="Copy to clipboard">Copy</button></div>`;
  });

  return html;
}

function applySingleAnnotationToHtml(
  rawHtml: string,
  anno: Annotation
): string {
  if (!anno.selected_text || anno.selected_text.trim().length < 2) return rawHtml;

  const target = anno.selected_text.trim();
  const targetOccur = anno.occurrence_index ?? 0;
  let currentOccur = 0;
  let replaced = false;

  // Split HTML into HTML tags vs text tokens
  const parts = rawHtml.split(/(<[^>]+>)/g);
  let inCodeBlock = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Preserve tags and monitor code blocks
    if (part.startsWith('<')) {
      if (/^<pre\b/i.test(part) || /^<code\b/i.test(part)) inCodeBlock = true;
      if (/^<\/pre>/i.test(part) || /^<\/code>/i.test(part)) inCodeBlock = false;
      continue;
    }

    if (inCodeBlock || replaced) continue;

    const escapedTarget = escapeRegex(target);
    const regex = new RegExp(escapedTarget, 'gi');

    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let newPart = '';
    let partChanged = false;

    while ((match = regex.exec(part)) !== null) {
      if (currentOccur === targetOccur && !replaced) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        const matchedText = part.slice(matchStart, matchEnd);

        newPart += part.slice(lastIndex, matchStart);

        const isNote = anno.note && anno.note !== 'Highlighted snippet';
        const color = anno.color || 'yellow';

        if (isNote) {
          const safeNote = escapeHtml(anno.note);
          newPart +=
            `<span class="vmd-note-box vmd-note-${color}" data-note-id="${anno.id}">` +
              `<span class="vmd-note-text">${escapeHtml(matchedText)}</span>` +
              `<span class="vmd-note-badge">💬</span>` +
              `<span class="vmd-note-tooltip">` +
                `<span class="vmd-tooltip-header">` +
                  `<span style="color: var(--accent); font-weight: bold;">${color.toUpperCase()} NOTE</span>` +
                  `<span class="vmd-tooltip-delete" data-delete-id="${anno.id}" title="Delete note">✕</span>` +
                `</span>` +
                `<span class="vmd-tooltip-content">${safeNote}</span>` +
              `</span>` +
            `</span>`;
        } else {
          newPart += `<mark class="vmd-highlight vmd-highlight-${color}" data-note-id="${anno.id}" title="Highlighted in ${color}">${escapeHtml(matchedText)}</mark>`;
        }

        lastIndex = matchEnd;
        replaced = true;
        partChanged = true;
        break; // Replaced the single target occurrence!
      } else {
        currentOccur++;
      }
    }

    if (partChanged) {
      newPart += part.slice(lastIndex);
      parts[i] = newPart;
    }
  }

  // Fallback: If targetOccur was > 0 and not found, try occurrence 0
  if (!replaced && targetOccur > 0) {
    return applySingleAnnotationToHtml(rawHtml, { ...anno, occurrence_index: 0 });
  }

  return parts.join('');
}

function applyAnnotationsToHtml(
  rawHtml: string,
  annotations?: Annotation[]
): string {
  if (!annotations || annotations.length === 0) return rawHtml;

  let currentHtml = rawHtml;
  for (const anno of annotations) {
    currentHtml = applySingleAnnotationToHtml(currentHtml, anno);
  }
  return currentHtml;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  annotations,
  onDeleteAnnotation,
  onUpdateContent,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = React.useState<{
    tableIdx: number;
    rowIdx: number;
    colIdx: number;
    value: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);

  const html = useMemo(() => {
    try {
      const sanitized = sanitizeMarkdownContent(content);
      const parsedHtml = marked.parse(sanitized, { async: false, breaks: true }) as string;
      const enhancedHtml = enhanceMarkdownHtml(parsedHtml);
      return applyAnnotationsToHtml(enhancedHtml, annotations);
    } catch {
      return `<p>${escapeHtml(content)}</p>`;
    }
  }, [content, annotations]);

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

    // 3. Add Table Row Button
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

    // 4. Copy Code Block Button
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

    // 5. Table Cell Click -> Open Inline Cell Editor
    const cellEl = target.closest('td.vmd-table-cell') as HTMLElement | null;
    if (cellEl && onUpdateContent) {
      const tableIdxStr = cellEl.getAttribute('data-table-idx');
      const rowIdxStr = cellEl.getAttribute('data-row-idx');
      const colIdxStr = cellEl.getAttribute('data-col-idx');

      if (tableIdxStr !== null && rowIdxStr !== null && colIdxStr !== null) {
        const tableIdx = parseInt(tableIdxStr, 10);
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
        className="markdown-body leading-relaxed font-normal text-[var(--text-primary)] w-full max-w-full"
        style={{
          fontSize: 'calc(1rem * var(--vmd-font-scale, 1))',
          color: 'var(--text-primary)',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Enhanced Spacious Table Cell Editor Popover with Backdrop */}
      {editingCell && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px]"
            onClick={() => setEditingCell(null)}
          />

          <div
            className="absolute z-50 animate-in fade-in zoom-in-95 duration-150"
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
        </>
      )}
    </div>
  );
};
