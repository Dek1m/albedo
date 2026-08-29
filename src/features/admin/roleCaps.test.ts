import { describe, expect, it } from 'vitest';
import { entitiesForModules, maskForModules, moduleBits } from './roleCaps';

describe('roleCaps', () => {
  it('lists LLM columns including Share', () => {
    const columns = entitiesForModules(new Set(['llm']));
    expect(columns.map((item) => item.label)).toEqual(['Providers', 'Share']);
  });

  it('appends Auth columns when both modules are on', () => {
    const columns = entitiesForModules(new Set(['llm', 'auth']));
    expect(columns.map((item) => item.label)).toEqual(['Providers', 'Share', 'Users', 'Groups']);
  });

  it('keeps only selected module bits', () => {
    const mask = moduleBits('llm') | moduleBits('auth');
    expect(maskForModules(mask, new Set(['llm']))).toBe(moduleBits('llm'));
  });
});
