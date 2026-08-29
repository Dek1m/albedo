import { describe, expect, it } from 'vitest';
import { maskForModules, moduleBits, modulesFromMask } from './roleCaps';

describe('roleCaps', () => {
  it('picks modules that have bits set', () => {
    expect([...modulesFromMask(moduleBits('llm'))]).toEqual(['llm']);
  });

  it('keeps only selected module bits', () => {
    const mask = moduleBits('llm') | moduleBits('auth');
    expect(maskForModules(mask, new Set(['llm']))).toBe(moduleBits('llm'));
  });
});
