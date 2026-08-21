import type { ChipDisplayMode } from './chipDisplayMode';
import type { GroupId } from './group';

export type UserId = string & { readonly __brand: 'UserId' };

export interface User {
  id: UserId;
  username: string;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  userPrompt: string | null;
  chipDisplayMode: ChipDisplayMode;
  isSuperadmin: boolean;
  isBootstrapAdmin: boolean;
  primaryGroupId: GroupId | null;
}

export type Profile = User;

export function chipLabel(user: User): string {
  if (user.chipDisplayMode === 'nickname') {
    const nick = user.nickname?.trim();
    if (nick) {
      return nick;
    }
  }
  const full = [user.firstName, user.lastName]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  if (full) {
    return full;
  }
  const nick = user.nickname?.trim();
  if (nick) {
    return nick;
  }
  return user.username;
}

export function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0] ?? '?';
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const second = parts[1] ?? '';
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
}

export function splitEmail(email: string | null): { local: string; domain: string } | null {
  if (!email || !email.includes('@')) {
    return null;
  }
  const at = email.indexOf('@');
  return { local: email.slice(0, at), domain: email.slice(at) };
}

export function asUserId(value: string): UserId {
  return value as UserId;
}
