import type { ChipDisplayMode } from '../domain/chipDisplayMode';
import { apiClient } from './client';

export type OuKind = 'folder' | 'users_bin' | 'groups_bin';

export interface DomainUser {
  id: string;
  username: string;
  workspaceDb: string;
  email: string;
}

export interface AdminCaps {
  usersUpdate: boolean;
  groupsCreate: boolean;
  groupsUpdate: boolean;
  rolesUpdate: boolean;
}

export interface DirectoryUser {
  id: string;
  username: string;
  nickname: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  userPrompt: string;
  chipDisplayMode: ChipDisplayMode;
  avatarUrl: string | null;
}

export interface DirectoryUserPatch {
  username: string;
  nickname: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  userPrompt: string;
  chipDisplayMode: ChipDisplayMode;
}

export interface UserGroup {
  id: string;
  name: string;
  isBuiltin: boolean;
  isPrimary: boolean;
}

export interface DomainGroup {
  id: string;
  name: string;
  isBuiltin: boolean;
}

export interface DomainOu {
  id: string;
  parentId: string | null;
  name: string;
  kind: OuKind;
  isSystem: boolean;
  isBuiltin: boolean;
  sortOrder: number;
  children: DomainOu[];
  users: DomainUser[];
  groups: DomainGroup[];
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  capabilityMask: number;
  permissions: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function pickBool(row: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return false;
}

function pickNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && /^-?\d+$/.test(value)) {
      return Number(value);
    }
  }
  return 0;
}

function pickKind(row: Record<string, unknown>): OuKind {
  const raw = pickStr(row, 'kind');
  if (raw === 'users_bin' || raw === 'groups_bin' || raw === 'folder') {
    return raw;
  }
  return 'folder';
}

function pickList(row: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function asMask(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >>> 0;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value) >>> 0;
  }
  return 0;
}

function mapUser(raw: unknown): DomainUser | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const id = pickStr(row, 'id', 'user_id', 'userId');
  const username = pickStr(row, 'username', 'name');
  if (!id || !username) {
    return null;
  }
  return {
    id,
    username,
    workspaceDb: pickStr(row, 'workspace_db', 'workspaceDb'),
    email: pickStr(row, 'email'),
  };
}

function pickChip(row: Record<string, unknown>): ChipDisplayMode {
  return pickStr(row, 'chip_display_mode', 'chipDisplayMode') === 'full_name' ? 'full_name' : 'nickname';
}

function mapCaps(raw: unknown): AdminCaps {
  const row = asRecord(raw);
  if (!row) {
    return { usersUpdate: false, groupsCreate: false, groupsUpdate: false, rolesUpdate: false };
  }
  return {
    usersUpdate: pickBool(row, 'users_update', 'usersUpdate'),
    groupsCreate: pickBool(row, 'groups_create', 'groupsCreate'),
    groupsUpdate: pickBool(row, 'groups_update', 'groupsUpdate'),
    rolesUpdate: pickBool(row, 'roles_update', 'rolesUpdate'),
  };
}

function mapDirectoryUser(raw: unknown): DirectoryUser | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const nested = asRecord(row.user) ?? asRecord(row.profile);
  const src = nested ?? row;
  const id = pickStr(src, 'id', 'user_id', 'userId');
  const username = pickStr(src, 'username', 'name');
  if (!id || !username) {
    return null;
  }
  return {
    id,
    username,
    nickname: pickStr(src, 'nickname'),
    firstName: pickStr(src, 'first_name', 'firstName'),
    lastName: pickStr(src, 'last_name', 'lastName'),
    dateOfBirth: pickStr(src, 'date_of_birth', 'dateOfBirth'),
    email: pickStr(src, 'email'),
    phone: pickStr(src, 'phone'),
    userPrompt: pickStr(src, 'user_prompt', 'userPrompt'),
    chipDisplayMode: pickChip(src),
    avatarUrl: pickStr(src, 'avatar_url', 'avatarUrl') || null,
  };
}

function mapUserGroup(raw: unknown): UserGroup | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const id = pickStr(row, 'id', 'group_id', 'groupId');
  const name = pickStr(row, 'name');
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    isBuiltin: pickBool(row, 'is_builtin', 'isBuiltin'),
    isPrimary: pickBool(row, 'is_primary', 'isPrimary'),
  };
}

function mapIdList(raw: unknown, ...keys: string[]): string[] {
  const list = Array.isArray(raw) ? raw : pickList(asRecord(raw) ?? {}, ...keys);
  const ids: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item) {
      ids.push(item);
      continue;
    }
    const row = asRecord(item);
    if (!row) {
      continue;
    }
    if (row.assigned === false) {
      continue;
    }
    const id = pickStr(row, 'id', 'group_id', 'groupId');
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

function createdId(raw: unknown): string | null {
  if (typeof raw === 'string' && raw) {
    return raw;
  }
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  return pickStr(row, 'id', 'user_id', 'userId') || null;
}

function mapGroup(raw: unknown): DomainGroup | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const id = pickStr(row, 'id', 'group_id', 'groupId');
  const name = pickStr(row, 'name');
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    isBuiltin: pickBool(row, 'is_builtin', 'isBuiltin'),
  };
}

function mapOu(raw: unknown): DomainOu | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const id = pickStr(row, 'id', 'ou_id', 'ouId');
  const name = pickStr(row, 'name');
  if (!id || !name) {
    return null;
  }
  const parentRaw = row.parent_id ?? row.parentId;
  const parentId = parentRaw === null || parentRaw === undefined ? null : String(parentRaw);
  return {
    id,
    parentId: parentId === '' || parentId === 'null' ? null : parentId,
    name,
    kind: pickKind(row),
    isSystem: pickBool(row, 'is_system', 'isSystem'),
    isBuiltin: pickBool(row, 'is_builtin', 'isBuiltin'),
    sortOrder: pickNum(row, 'sort_order', 'sortOrder'),
    children: pickList(row, 'children').map(mapOu).filter((node): node is DomainOu => node !== null),
    users: pickList(row, 'users').map(mapUser).filter((node): node is DomainUser => node !== null),
    groups: pickList(row, 'groups').map(mapGroup).filter((node): node is DomainGroup => node !== null),
  };
}

function sortForest(nodes: DomainOu[]): DomainOu[] {
  const copy = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  for (const node of copy) {
    node.children = sortForest(node.children);
  }
  return copy;
}

function nestFlat(nodes: DomainOu[]): DomainOu[] {
  const byId = new Map(nodes.map((node) => [node.id, { ...node, children: [] as DomainOu[] }]));
  const roots: DomainOu[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return sortForest(roots);
}

/** Бэкенд может отдать дерево или плоский список — нормализуем на клиенте. */
function normalizeDomainTree(raw: unknown): DomainOu[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    const mapped = raw.map(mapOu).filter((node): node is DomainOu => node !== null);
    const nested = mapped.some((node) => node.children.length > 0);
    return nested ? sortForest(mapped) : nestFlat(mapped);
  }
  const row = asRecord(raw);
  if (!row) {
    return [];
  }
  if (typeof row.id === 'string' || typeof row.name === 'string') {
    const root = mapOu(raw);
    return root ? [root] : [];
  }
  for (const key of ['tree', 'items', 'nodes', 'roots', 'root', 'children']) {
    if (key in row) {
      return normalizeDomainTree(row[key]);
    }
  }
  return [];
}

export type PrefKind = 'bool' | 'int' | 'float' | 'string' | 'enum';
export type PrefTarget = 'runtime' | 'env' | 'compose';

export interface PrefField {
  key: string;
  name: string;
  label: string;
  hint: string;
  kind: PrefKind;
  value: unknown;
  default: unknown;
  group: string;
  env: string | null;
  target: PrefTarget;
  needsRestart: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

export interface PrefGroup {
  id: string;
  label: string;
  fields: PrefField[];
}

export interface PrefModule {
  name: string;
  displayName: string;
  groups: PrefGroup[];
}

export interface PrefCatalog {
  modules: PrefModule[];
}

function asKind(raw: string): PrefKind {
  if (raw === 'bool' || raw === 'int' || raw === 'float' || raw === 'enum') {
    return raw;
  }
  return 'string';
}

function asTarget(raw: string): PrefTarget {
  if (raw === 'env' || raw === 'compose') {
    return raw;
  }
  return 'runtime';
}

function mapPrefField(raw: unknown): PrefField | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const key = pickStr(row, 'key');
  if (!key) {
    return null;
  }
  const options = pickList(row, 'options').filter((item): item is string => typeof item === 'string');
  const min = row.min ?? row.minimum;
  const max = row.max ?? row.maximum;
  return {
    key,
    name: pickStr(row, 'name') || key.split('.').pop() || key,
    label: pickStr(row, 'label') || key,
    hint: pickStr(row, 'hint'),
    kind: asKind(pickStr(row, 'kind')),
    value: row.value,
    default: row.default,
    group: pickStr(row, 'group') || 'General',
    env: pickStr(row, 'env') || null,
    target: asTarget(pickStr(row, 'target')),
    needsRestart: pickBool(row, 'needs_restart', 'needsRestart'),
    min: typeof min === 'number' ? min : undefined,
    max: typeof max === 'number' ? max : undefined,
    options: options.length ? options : undefined,
  };
}

function mapPrefGroup(raw: unknown): PrefGroup | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const fields = pickList(row, 'fields').map(mapPrefField).filter((item): item is PrefField => item !== null);
  const id = pickStr(row, 'id', 'label') || 'General';
  return { id, label: pickStr(row, 'label') || id, fields };
}

function mapPrefModule(raw: unknown): PrefModule | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const name = pickStr(row, 'name');
  if (!name) {
    return null;
  }
  return {
    name,
    displayName: pickStr(row, 'display_name', 'displayName') || name,
    groups: pickList(row, 'groups').map(mapPrefGroup).filter((item): item is PrefGroup => item !== null),
  };
}

function mapPrefCatalog(raw: unknown): PrefCatalog {
  if (Array.isArray(raw)) {
    const modules = raw.map(mapPrefModule).filter((item): item is PrefModule => item !== null);
    if (modules.length) {
      return { modules };
    }
  }
  const row = asRecord(raw);
  if (!row) {
    return { modules: [] };
  }
  return {
    modules: pickList(row, 'modules').map(mapPrefModule).filter((item): item is PrefModule => item !== null),
  };
}

function mapRole(raw: unknown): AdminRole | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const id = pickStr(row, 'id', 'role_id', 'roleId');
  const name = pickStr(row, 'name');
  if (!id || !name) {
    return null;
  }
  const permissions = pickList(row, 'permissions').filter((item): item is string => typeof item === 'string');
  return {
    id,
    name,
    description: pickStr(row, 'description'),
    isBuiltin: pickBool(row, 'is_builtin', 'isBuiltin'),
    capabilityMask: asMask(row.capability_mask ?? row.capabilityMask),
    permissions,
  };
}

export const systemApi = {
  async caps(): Promise<AdminCaps> {
    const raw = await apiClient.call<unknown>('system', 'caps', {});
    return mapCaps(raw);
  },

  async domainTree(): Promise<DomainOu[]> {
    const raw = await apiClient.call<unknown>('system', 'domain_tree', {});
    return normalizeDomainTree(raw);
  },

  async createOu(parentId: string, name: string): Promise<void> {
    await apiClient.call('system', 'create_ou', { parent_id: parentId, name });
  },

  async renameOu(ouId: string, name: string): Promise<void> {
    await apiClient.call('system', 'rename_ou', { ou_id: ouId, name });
  },

  async deleteOu(ouId: string): Promise<void> {
    await apiClient.call('system', 'delete_ou', { ou_id: ouId });
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.call('system', 'delete_directory_user', { user_id: userId });
  },

  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.call('system', 'delete_directory_group', { group_id: groupId });
  },

  async createUserInOu(input: {
    username: string;
    password: string;
    email?: string;
    ouId?: string;
  }): Promise<string | null> {
    const raw = await apiClient.call<unknown>('system', 'create_user_in_ou', {
      username: input.username,
      password: input.password,
      email: input.email ?? null,
      ou_id: input.ouId ?? null,
    });
    return createdId(raw);
  },

  async getDirectoryUser(userId: string): Promise<DirectoryUser | null> {
    const raw = await apiClient.call<unknown>('system', 'get_directory_user', { user_id: userId });
    return mapDirectoryUser(raw);
  },

  async setDirectoryAvatar(userId: string, imageB64: string, contentType: string): Promise<string> {
    const row = await apiClient.call<{ avatar_url?: string }>('system', 'set_directory_avatar', {
      user_id: userId,
      image_b64: imageB64,
      content_type: contentType,
    });
    return String(row.avatar_url ?? '');
  },

  async updateDirectoryUser(userId: string, patch: DirectoryUserPatch): Promise<void> {
    await apiClient.call('system', 'update_directory_user', {
      user_id: userId,
      username: patch.username,
      nickname: patch.nickname,
      first_name: patch.firstName,
      last_name: patch.lastName,
      date_of_birth: patch.dateOfBirth || null,
      email: patch.email,
      phone: patch.phone,
      user_prompt: patch.userPrompt,
      chip_display_mode: patch.chipDisplayMode,
    });
  },

  async listUserGroups(userId: string): Promise<UserGroup[]> {
    const raw = await apiClient.call<unknown>('system', 'list_user_groups', { user_id: userId });
    const list = Array.isArray(raw) ? raw : pickList(asRecord(raw) ?? {}, 'items', 'groups');
    return list.map(mapUserGroup).filter((group): group is UserGroup => group !== null);
  },

  async createGroupInOu(name: string, ouId?: string, description?: string): Promise<string | null> {
    const raw = await apiClient.call<unknown>('system', 'create_group_in_ou', {
      name,
      description: description ?? null,
      ou_id: ouId ?? null,
    });
    return createdId(raw);
  },

  async renameUser(userId: string, username: string): Promise<void> {
    await apiClient.call('system', 'rename_user', { user_id: userId, username });
  },

  async renameGroup(groupId: string, name: string): Promise<void> {
    await apiClient.call('system', 'rename_group', { group_id: groupId, name });
  },

  async listRoles(): Promise<AdminRole[]> {
    const raw = await apiClient.call<unknown>('system', 'list_roles', {});
    if (Array.isArray(raw)) {
      return raw.map(mapRole).filter((role): role is AdminRole => role !== null);
    }
    const row = asRecord(raw);
    const items = row ? pickList(row, 'items', 'roles') : [];
    return items.map(mapRole).filter((role): role is AdminRole => role !== null);
  },

  async upsertRoleMask(roleId: string, capabilityMask: number): Promise<void> {
    await apiClient.call('system', 'upsert_role_mask', {
      role_id: roleId,
      capability_mask: capabilityMask,
    });
  },

  async createRole(name: string, capabilityMask: number): Promise<string | null> {
    const raw = await apiClient.call<unknown>('system', 'create_role', {
      name,
      capability_mask: capabilityMask,
    });
    return createdId(raw);
  },

  async listRoleGroups(roleId: string): Promise<string[]> {
    const raw = await apiClient.call<unknown>('system', 'list_role_groups', { role_id: roleId });
    return mapIdList(raw, 'items', 'groups', 'group_ids', 'groupIds');
  },

  async listGroupRoles(groupId: string): Promise<string[]> {
    const raw = await apiClient.call<unknown>('system', 'list_group_roles', { group_id: groupId });
    return mapIdList(raw, 'items', 'roles', 'role_ids', 'roleIds');
  },

  async assignGroupRole(groupId: string, roleId: string): Promise<void> {
    await apiClient.call('system', 'assign_group_role', { group_id: groupId, role_id: roleId });
  },

  async removeGroupRole(groupId: string, roleId: string): Promise<void> {
    await apiClient.call('system', 'remove_group_role', { group_id: groupId, role_id: roleId });
  },

  async prefList(): Promise<PrefCatalog> {
    const raw = await apiClient.call<unknown>('system', 'pref_list', {});
    return mapPrefCatalog(raw);
  },

  async prefGet(key: string): Promise<PrefField | null> {
    const raw = await apiClient.call<unknown>('system', 'pref_get', { key });
    const row = asRecord(raw);
    const item = row?.item ?? raw;
    return mapPrefField(item);
  },

  async prefSet(key: string, value: unknown): Promise<{ needsRestart: boolean }> {
    const raw = await apiClient.call<unknown>('system', 'pref_set', { key, value });
    const row = asRecord(raw);
    return { needsRestart: row ? pickBool(row, 'needs_restart', 'needsRestart') : false };
  },
};
