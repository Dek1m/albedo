import { memo } from 'react';
import type { ReactElement } from 'react';
import { copyText } from '../copyText';
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

function renderCodeBlock(body: string[], lang: string): string {
  const source = body.join('\n');
  const lineCount = body.length;
  const gutter = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
  const code = highlightCode(escapeHtml(source), lang);
  return (
    `<div class="albedo-code">` +
    `<button type="button" class="albedo-code-copy" aria-label="Copy code">` +
    `<i class="bi bi-clipboard albedo-code-copy-icon"></i>` +
    `<i class="bi bi-check2 albedo-code-done-icon"></i>` +
    `</button>` +
    `<span class="albedo-code-gutter" aria-hidden="true">${gutter}</span>` +
    `<pre class="albedo-md-code"><code>${code}</code></pre>` +
    `</div>`
  );
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
      out.push(renderCodeBlock(body, lang));
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

async function copyFrom(target: HTMLElement): Promise<void> {
  const code = target.closest('.albedo-code')?.querySelector('pre');
  if (!code) {
    return;
  }
  // Прод работает по HTTP без TLS — navigator.clipboard там undefined, copyText уходит в execCommand-фолбэк.
  await copyText(code.textContent ?? '');
}

export const MarkdownView = memo(function MarkdownView({ text }: { text: string }): ReactElement {
  return (
    <div
      className="albedo-md"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      onClick={(event) => {
        const btn = (event.target as HTMLElement).closest('.albedo-code-copy');
        if (!(btn instanceof HTMLElement)) {
          return;
        }
        void copyFrom(btn).then(
          () => {
            btn.classList.add('is-copied');
            window.setTimeout(() => btn.classList.remove('is-copied'), 1200);
          },
          () => {
            btn.classList.add('is-failed');
            window.setTimeout(() => btn.classList.remove('is-failed'), 1000);
          },
        );
      }}
    />
  );
});
