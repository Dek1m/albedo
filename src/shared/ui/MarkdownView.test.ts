import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './MarkdownView';

describe('renderMarkdown', () => {
  it('escapes script tags in paragraphs', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes img onerror payloads', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('onerror=alert(1)');
  });

  it('keeps a hostile fence lang out of the html', () => {
    const html = renderMarkdown('```"><script>\ncode\n```');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('"><script>');
    expect(html).toContain('code');
  });

  it('renders a table', () => {
    const html = renderMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table class="albedo-md-table">');
    expect(html).toContain('<th>a</th>');
    expect(html).toContain('<td>2</td>');
  });

  it('renders a list without br inside items', () => {
    const html = renderMarkdown('- one\n- two');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).not.toContain('<br');
  });

  it('numbers the gutter per source line', () => {
    const html = renderMarkdown('```js\na\nb\nc\n```');
    expect(html).toContain('<span class="albedo-code-gutter" aria-hidden="true">1\n2\n3</span>');
  });

  it('renders an unfinished fence as code while streaming', () => {
    expect(() => renderMarkdown('```py\nprint("hi")')).not.toThrow();
    const html = renderMarkdown('```py\nprint("hi")');
    expect(html).toContain('<pre class="albedo-md-code">');
    expect(html).toContain('print');
  });
});
