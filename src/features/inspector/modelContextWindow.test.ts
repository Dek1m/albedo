import { describe, expect, it } from 'vitest';
import { matchContextWindow } from './modelContextWindow';

describe('matchContextWindow', () => {
  it('matches exact and substring model ids case-insensitively', () => {
    expect(matchContextWindow('gpt-4o')).toBe(128_000);
    expect(matchContextWindow('GPT-4o-2024-11-20')).toBe(128_000);
    expect(matchContextWindow('openai/gpt-4.1')).toBe(1_000_000);
    expect(matchContextWindow('deepseek-r1-distill')).toBe(128_000);
  });

  it('prefers the more specific entry', () => {
    // deepseek-chat отличается от generic deepseek — порядок в таблице решает.
    expect(matchContextWindow('deepseek-chat')).toBe(64_000);
    expect(matchContextWindow('deepseek-reasoner')).toBe(128_000);
  });

  it('returns null for unknown and empty', () => {
    expect(matchContextWindow('yoba-9000')).toBeNull();
    expect(matchContextWindow('')).toBeNull();
    expect(matchContextWindow('  ')).toBeNull();
  });
});
