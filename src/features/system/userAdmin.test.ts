import { describe, expect, it } from 'vitest';
import { isDomainAdmin, isUserAdmin } from './userAdmin';

const capsOn = { usersUpdate: true, groupsCreate: false, groupsUpdate: false, rolesUpdate: false, domainsCreate: false };
const capsOff = { usersUpdate: false, groupsCreate: false, groupsUpdate: false, rolesUpdate: false, domainsCreate: false };
const domainCaps = { usersUpdate: false, groupsCreate: false, groupsUpdate: false, rolesUpdate: false, domainsCreate: true };
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

describe('isDomainAdmin', () => {
  it('allows caps.domains_create', () => {
    expect(isDomainAdmin(domainCaps, regular)).toBe(true);
  });

  it('allows bootstrap and superadmin without caps', () => {
    expect(isDomainAdmin(null, admin)).toBe(true);
    expect(isDomainAdmin(capsOff, superadmin)).toBe(true);
  });

  it('denies regular user without domains_create', () => {
    expect(isDomainAdmin(capsOn, regular)).toBe(false);
    expect(isDomainAdmin(capsOff, regular)).toBe(false);
    expect(isDomainAdmin(null, null)).toBe(false);
  });
});
