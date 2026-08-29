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
});
