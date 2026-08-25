import type { ReactElement } from 'react';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(raw: string): string {
  const parts: string[] = [];
  const fence = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null = fence.exec(raw);
  while (match) {
    parts.push(inline(raw.slice(last, match.index)));
    parts.push(`<pre class="albedo-md-code"><code>${escapeHtml(match[2] ?? '')}</code></pre>`);
    last = match.index + match[0].length;
    match = fence.exec(raw);
  }
  parts.push(inline(raw.slice(last)));
  return parts.join('');
}

function inline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code class="albedo-md-inline">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

export function MarkdownView({ text }: { text: string }): ReactElement {
  return <div className="albedo-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}
