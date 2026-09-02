import { describe, expect, it } from 'vitest';
import { isEveryoneGrant, isOwnShareablePath } from './shareable';

describe('isOwnShareablePath', () => {
  it('rejects empty home and excluded rows', () => {
    expect(isOwnShareablePath('')).toBe(false);
    expect(isOwnShareablePath('docs', { linked: true, excluded: true })).toBe(false);
  });

  it('allows linked and inherited paths', () => {
    expect(isOwnShareablePath('docs', { linked: true })).toBe(true);
    expect(isOwnShareablePath('docs/a', { inherited: true })).toBe(true);
    expect(isOwnShareablePath('tmp')).toBe(false);
  });
});

describe('isEveryoneGrant', () => {
  it('matches builtin group name exactly', () => {
    expect(isEveryoneGrant('Everyone', 'group')).toBe(true);
    expect(isEveryoneGrant('everyone', 'group')).toBe(false);
    expect(isEveryoneGrant('Everyone', 'user')).toBe(false);
  });
});
