import { describe, expect, it } from 'vitest';
import { entitiesForModules, maskForModules, moduleBits } from './roleCaps';

describe('roleCaps', () => {
  it('lists LLM columns including Share and Agents', () => {
    const columns = entitiesForModules(new Set(['llm']));
    expect(columns.map((item) => item.label)).toEqual(['Providers', 'Share', 'Agents']);
  });

  it('lists Domain columns', () => {
    const columns = entitiesForModules(new Set(['domain']));
    expect(columns.map((item) => item.label)).toEqual(['Domains', 'Federation']);
  });

  it('appends Auth and Domain columns when all modules are on', () => {
    const columns = entitiesForModules(new Set(['llm', 'auth', 'domain']));
    expect(columns.map((item) => item.label)).toEqual([
      'Providers',
      'Share',
      'Agents',
      'Users',
      'Groups',
      'Domains',
      'Federation',
    ]);
  });

  it('maps llm module bits to providers@0, share@12, agents@24', () => {
    expect(moduleBits('llm')).toBe(0xf | (0xf << 12) | (0xf << 24));
  });

  it('maps domain module bits to domains@16, federation@20 (mask.py mia)', () => {
    expect(moduleBits('domain')).toBe((0xf << 16) | (0xf << 20));
  });

  it('keeps only selected module bits', () => {
    const mask = moduleBits('llm') | moduleBits('auth') | moduleBits('domain');
    expect(maskForModules(mask, new Set(['llm']))).toBe(moduleBits('llm'));
    expect(maskForModules(mask, new Set(['domain']))).toBe(moduleBits('domain'));
  });
});
