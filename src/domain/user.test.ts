import { describe, expect, it } from 'vitest';
import { asUserId, chipLabel, initials } from './user';
import type { User } from './user';

function user(partial: Partial<User>): User {
  return {
    id: asUserId('u1'),
    username: 'root',
    nickname: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    avatarUrl: null,
    userPrompt: null,
    chipDisplayMode: 'nickname',
    isSuperadmin: false,
    isBootstrapAdmin: false,
    primaryGroupId: null,
    ...partial,
  };
}

describe('chipLabel', () => {
  it('uses nickname when mode is nickname', () => {
    expect(chipLabel(user({ nickname: 'Neo', chipDisplayMode: 'nickname' }))).toBe('Neo');
  });

  it('falls back to full name if nickname empty', () => {
    expect(
      chipLabel(user({ firstName: 'Ada', lastName: 'Lovelace', chipDisplayMode: 'nickname' })),
    ).toBe('Ada Lovelace');
  });

  it('uses full name when mode is full_name', () => {
    expect(
      chipLabel(
        user({
          nickname: 'Neo',
          firstName: 'Ada',
          lastName: 'Lovelace',
          chipDisplayMode: 'full_name',
        }),
      ),
    ).toBe('Ada Lovelace');
  });

  it('falls back to username when both empty', () => {
    expect(chipLabel(user({ chipDisplayMode: 'full_name' }))).toBe('root');
  });
});

describe('initials', () => {
  it('takes two letters from one word', () => {
    expect(initials('Neo')).toBe('NE');
  });

  it('takes first letters of two words', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
  });
});
