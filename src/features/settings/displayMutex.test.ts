import { describe, expect, it } from 'vitest';
import { isMode, selectDisplayMode } from './displayMutex';

describe('displayMutex', () => {
  it('selecting one mode replaces the other', () => {
    expect(selectDisplayMode('full_name')).toBe('full_name');
    expect(isMode('full_name', 'nickname')).toBe(false);
    expect(isMode(selectDisplayMode('nickname'), 'nickname')).toBe(true);
  });
});
