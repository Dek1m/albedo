import { describe, expect, it } from 'vitest';
import { bytesLabel, homeDisplay, joinHomeRel } from './addFilePath';

describe('addFilePath', () => {
  it('joins under parent', () => {
    expect(joinHomeRel('docs', 'a.txt')).toBe('docs/a.txt');
    expect(joinHomeRel('', 'a.txt')).toBe('a.txt');
  });

  it('rejects parent escape', () => {
    expect(() => joinHomeRel('docs', '../x')).toThrow('invalid path');
  });

  it('formats home and bytes', () => {
    expect(homeDisplay('a/b')).toBe('~/a/b');
    expect(bytesLabel(12)).toBe('12 B');
  });
});
