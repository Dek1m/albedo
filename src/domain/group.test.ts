import { describe, expect, it } from 'vitest';
import { asGroupId, canRemove } from './group';
import { asUserId } from './user';
import type { Group } from './group';
import type { User } from './user';

const baseUser: User = {
  id: asUserId('u1'),
  username: 'root',
  nickname: null,
  firstName: null,
  lastName: null,
  dateOfBirth: null,
  email: null,
  phone: null,
  avatarUrl: null,
  userPrompt: null,
  chipDisplayMode: 'nickname',
  isSuperadmin: true,
  isBootstrapAdmin: true,
  primaryGroupId: asGroupId('g1'),
};

function group(partial: Partial<Group>): Group {
  return {
    id: asGroupId('g1'),
    name: 'Users',
    description: null,
    isBuiltin: false,
    isPrimary: false,
    ...partial,
  };
}

describe('canRemove', () => {
  it('blocks primary', () => {
    expect(canRemove(baseUser, group({ isPrimary: true }))).toBe(false);
  });

  it('blocks Administrators for bootstrap admin', () => {
    expect(canRemove(baseUser, group({ name: 'Administrators' }))).toBe(false);
  });

  it('allows secondary group', () => {
    expect(canRemove({ ...baseUser, isBootstrapAdmin: false }, group({ name: 'Ops' }))).toBe(
      true,
    );
  });
});
