import type { ReactElement } from 'react';
import { highlightCode } from '../../features/ai/markdownPrompt';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/`([^`]+)`/g, '<code class="albedo-md-inline">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(?:<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`);
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function renderMarkdown(raw: string): string {
  const parts: string[] = [];
  const fence = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null = fence.exec(raw);
  while (match) {
    parts.push(inline(raw.slice(last, match.index)));
    const lang = match[1] ?? '';
    const body = escapeHtml(match[2] ?? '');
    parts.push(`<pre class="albedo-md-code"><code>${highlightCode(body, lang)}</code></pre>`);
    last = match.index + match[0].length;
    match = fence.exec(raw);
  }
  const rest = raw.slice(last);
  const open = /^```(\w*)\n?([\s\S]*)$/.exec(rest);
  if (open) {
    parts.push(`<pre class="albedo-md-code"><code>${highlightCode(escapeHtml(open[2] ?? ''), open[1] ?? '')}</code></pre>`);
  } else {
    parts.push(inline(rest));
  }
  return parts.join('');
}

export function MarkdownView({ text }: { text: string }): ReactElement {
  return <div className="albedo-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}
