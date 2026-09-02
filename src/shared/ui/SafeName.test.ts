import { describe, expect, it } from 'vitest';
import { neutralizeBidi } from './neutralizeBidi';

describe('neutralizeBidi', () => {
  it('replaces bidi overrides with a visible marker', () => {
    expect(neutralizeBidi(`file\u202Etxt`)).toBe('file\u2AF4txt');
  });

  it('replaces isolate marks', () => {
    expect(neutralizeBidi(`ab\u2066cd\u2069`)).toBe('ab\u2AF4cd\u2AF4');
  });

  it('does not trim or fold the name', () => {
    expect(neutralizeBidi('  Anna  ')).toBe('  Anna  ');
  });
});
