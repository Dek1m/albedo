import { describe, expect, it } from 'vitest';
import { estimatePromptTokens } from './estimatePromptTokens';

describe('estimatePromptTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimatePromptTokens('')).toBe(0);
  });

  it('counts latin as roughly chars/4', () => {
    expect(estimatePromptTokens('abcd')).toBeGreaterThanOrEqual(1);
    expect(estimatePromptTokens('hello world')).toBeGreaterThan(1);
  });

  it('treats cyrillic denser than latin', () => {
    const latin = estimatePromptTokens('aaaaaaaa');
    const cyr = estimatePromptTokens('аааааааа');
    expect(cyr).toBeGreaterThanOrEqual(latin);
  });
});
