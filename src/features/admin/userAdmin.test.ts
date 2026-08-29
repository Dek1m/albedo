import { describe, expect, it } from 'vitest';
import { isUserAdmin } from './userAdmin';

const capsOn = { usersUpdate: true, groupsCreate: false, groupsUpdate: false, rolesUpdate: false };
const capsOff = { usersUpdate: false, groupsCreate: false, groupsUpdate: false, rolesUpdate: false };
const admin = { isBootstrapAdmin: true, isSuperadmin: false };
const superadmin = { isBootstrapAdmin: false, isSuperadmin: true };
const regular = { isBootstrapAdmin: false, isSuperadmin: false };

describe('isUserAdmin', () => {
  it('allows caps.users_update', () => {
    expect(isUserAdmin(capsOn, regular)).toBe(true);
  });

  it('allows bootstrap and superadmin without caps', () => {
    expect(isUserAdmin(null, admin)).toBe(true);
    expect(isUserAdmin(capsOff, superadmin)).toBe(true);
  });

  it('denies regular user without caps', () => {
    expect(isUserAdmin(null, regular)).toBe(false);
    expect(isUserAdmin(capsOff, regular)).toBe(false);
    expect(isUserAdmin(null, null)).toBe(false);
  });
});
