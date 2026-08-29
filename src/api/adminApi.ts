import { apiClient } from './client';

export type OuKind = 'folder' | 'users_bin' | 'groups_bin';

export interface DomainUser {
  id: string;
  username: string;
  workspaceDb: string;
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
  };
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

export const adminApi = {
  async domainTree(): Promise<DomainOu[]> {
    const raw = await apiClient.call<unknown>('admin', 'domain_tree', {});
    return normalizeDomainTree(raw);
  },

  async createOu(parentId: string, name: string): Promise<void> {
    await apiClient.call('admin', 'create_ou', { parent_id: parentId, name });
  },

  async renameOu(ouId: string, name: string): Promise<void> {
    await apiClient.call('admin', 'rename_ou', { ou_id: ouId, name });
  },

  async createUserInOu(input: {
    username: string;
    password: string;
    email?: string;
    ouId?: string;
  }): Promise<void> {
    await apiClient.call('admin', 'create_user_in_ou', {
      username: input.username,
      password: input.password,
      email: input.email ?? null,
      ou_id: input.ouId ?? null,
    });
  },

  async createGroupInOu(name: string, ouId?: string, description?: string): Promise<void> {
    await apiClient.call('admin', 'create_group_in_ou', {
      name,
      description: description ?? null,
      ou_id: ouId ?? null,
    });
  },

  async renameUser(userId: string, username: string): Promise<void> {
    await apiClient.call('admin', 'rename_user', { user_id: userId, username });
  },

  async renameGroup(groupId: string, name: string): Promise<void> {
    await apiClient.call('admin', 'rename_group', { group_id: groupId, name });
  },

  async listRoles(): Promise<AdminRole[]> {
    const raw = await apiClient.call<unknown>('admin', 'list_roles', {});
    if (Array.isArray(raw)) {
      return raw.map(mapRole).filter((role): role is AdminRole => role !== null);
    }
    const row = asRecord(raw);
    const items = row ? pickList(row, 'items', 'roles') : [];
    return items.map(mapRole).filter((role): role is AdminRole => role !== null);
  },

  async upsertRoleMask(roleId: string, capabilityMask: number): Promise<void> {
    await apiClient.call('admin', 'upsert_role_mask', {
      role_id: roleId,
      capability_mask: capabilityMask,
    });
  },
};
