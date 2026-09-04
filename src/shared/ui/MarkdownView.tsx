import type { ReactElement } from 'react';
import { highlightCode } from '../../features/ai/markdownPrompt';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMd(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code class="albedo-md-inline">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function isTableSep(line: string): boolean {
  return line.includes('-') && /^\s*\|?\s*:?-{2,}[-:|\s]*$/.test(line);
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(header: string[], rows: string[][]): string {
  const th = header.map((cell) => `<th>${inlineMd(cell)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMd(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="albedo-md-table"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

function isBlockStart(line: string, next: string | undefined): boolean {
  if (/^```/.test(line) || /^#{1,6} /.test(line) || /^\s*[-*] /.test(line)) {
    return true;
  }
  if (line.includes('|') && next !== undefined && isTableSep(next)) {
    return true;
  }
  return false;
}

export function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i] ?? '')) {
        body.push(lines[i] ?? '');
        i += 1;
      }
      i += 1;
      out.push(`<pre class="albedo-md-code"><code>${highlightCode(escapeHtml(body.join('\n')), lang)}</code></pre>`);
      continue;
    }

    if (line.includes('|') && isTableSep(lines[i + 1] ?? '')) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').includes('|') && (lines[i] ?? '').trim() !== '') {
        rows.push(splitRow(lines[i] ?? ''));
        i += 1;
      }
      out.push(renderTable(header, rows));
      continue;
    }

    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i] ?? '')) {
        items.push(`<li>${inlineMd((lines[i] ?? '').replace(/^\s*[-*] /, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min((heading[1] ?? '#').length + 1, 6);
      out.push(`<h${level}>${inlineMd(heading[2] ?? '')}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !isBlockStart(lines[i] ?? '', lines[i + 1])
    ) {
      para.push(lines[i] ?? '');
      i += 1;
    }
    // Внутри абзаца — одинарный перенос; между абзацами — компактный margin.
    out.push(`<p class="albedo-md-p">${para.map(inlineMd).join('<br/>')}</p>`);
  }
  return out.join('');
}

export function MarkdownView({ text }: { text: string }): ReactElement {
  return <div className="albedo-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}
