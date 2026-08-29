import type { User } from './user';

export type GroupId = string & { readonly __brand: 'GroupId' };

export interface Group {
  id: GroupId;
  name: string;
  description: string | null;
  isBuiltin: boolean;
  isPrimary: boolean;
}

export function canRemove(user: User, group: Group): boolean {
  if (group.isPrimary) {
    return false;
  }
  if (group.name === 'Administrators' && user.isBootstrapAdmin) {
    return false;
  }
  return true;
}

export function asGroupId(value: string): GroupId {
  return value as GroupId;
}

export function removeBlockedReason(user: User, group: Group): string | null {
  if (group.isPrimary) {
    return 'Cannot remove the primary group';
  }
  if (group.name === 'Administrators' && user.isBootstrapAdmin) {
    return 'Cannot remove Administrators from the bootstrap admin';
  }
  return null;
}
