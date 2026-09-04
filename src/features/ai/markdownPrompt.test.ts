import { describe, expect, it } from 'vitest';
import { highlightMarkdown } from './markdownPrompt';

describe('highlightMarkdown', () => {
  it('marks headings and bold', () => {
    const html = highlightMarkdown('# Title\n**bold**');
    expect(html).toContain('md-h');
    expect(html).toContain('md-b');
  });

  it('escapes html', () => {
    expect(highlightMarkdown('<script>')).toContain('&lt;script&gt;');
  });

  it('highlights python keywords in a fence', () => {
    const html = highlightMarkdown('```python\ndef hello():\n  return 1\n```');
    expect(html).toContain('md-kw');
    expect(html).toContain('def');
  });
});
