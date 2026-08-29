import type { AdminCaps } from '../../api/adminApi';

export interface AdminIdentity {
  isBootstrapAdmin: boolean;
  isSuperadmin: boolean;
}

/** user_admin: caps.users_update или bootstrap/superadmin. Без этого таблица read-only. */
export function isUserAdmin(caps: AdminCaps | null, profile: AdminIdentity | null): boolean {
  if (profile?.isBootstrapAdmin || profile?.isSuperadmin) {
    return true;
  }
  return Boolean(caps?.usersUpdate);
}

export function isGroupAdmin(caps: AdminCaps | null, profile: AdminIdentity | null): boolean {
  if (profile?.isBootstrapAdmin || profile?.isSuperadmin) {
    return true;
  }
  return Boolean(caps?.groupsCreate || caps?.groupsUpdate);
}

export function isRoleAdmin(caps: AdminCaps | null, profile: AdminIdentity | null): boolean {
  if (profile?.isBootstrapAdmin || profile?.isSuperadmin) {
    return true;
  }
  return Boolean(caps?.rolesUpdate);
}
