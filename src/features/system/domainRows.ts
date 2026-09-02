import type { DomainGroup, DomainOu, DomainUser } from '../../api/systemApi';

export type DomainFilterField = 'any' | 'uuid' | 'name' | 'type' | 'email' | 'workspace';
export type DirectoryType = 'ou' | 'user' | 'group';

export interface DirectoryRow {
  key: string;
  id: string;
  name: string;
  type: DirectoryType;
  extra: string;
  email: string;
  workspace: string;
}

export const FILTER_FIELDS: { value: DomainFilterField; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'uuid', label: 'UUID' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'email', label: 'Email' },
  { value: 'workspace', label: 'Workspace' },
];

function flags(isBuiltin: boolean, isSystem = false): string {
  const parts: string[] = [];
  if (isBuiltin) {
    parts.push('builtin');
  }
  if (isSystem) {
    parts.push('system');
  }
  return parts.join('/');
}

export function ouRow(node: DomainOu): DirectoryRow {
  return {
    key: `ou:${node.id}`,
    id: node.id,
    name: node.name,
    type: 'ou',
    extra: flags(node.isBuiltin, node.isSystem),
    email: '',
    workspace: '',
  };
}

export function userRow(user: DomainUser): DirectoryRow {
  return {
    key: `user:${user.id}`,
    id: user.id,
    name: user.username,
    type: 'user',
    extra: user.workspaceDb,
    email: user.email,
    workspace: user.workspaceDb,
  };
}

export function groupRow(group: DomainGroup): DirectoryRow {
  return {
    key: `group:${group.id}`,
    id: group.id,
    name: group.name,
    type: 'group',
    extra: flags(group.isBuiltin),
    email: '',
    workspace: '',
  };
}

export function folderRows(node: DomainOu): DirectoryRow[] {
  return [
    ...node.children.map(ouRow),
    ...node.users.map(userRow),
    ...node.groups.map(groupRow),
  ];
}

export function allRows(nodes: DomainOu[]): DirectoryRow[] {
  const rows: DirectoryRow[] = [];
  const walk = (list: DomainOu[]): void => {
    for (const node of list) {
      rows.push(ouRow(node));
      rows.push(...node.users.map(userRow));
      rows.push(...node.groups.map(groupRow));
      walk(node.children);
    }
  };
  walk(nodes);
  return rows;
}

export function findOu(nodes: DomainOu[], id: string): DomainOu | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const child = findOu(node.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}

function contains(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle);
}

function matches(row: DirectoryRow, field: DomainFilterField, needle: string): boolean {
  // Type — точное значение ou|user|group, иначе "ou" ловит group.
  if (field === 'type') {
    return row.type === needle;
  }
  if (field === 'uuid') {
    return contains(row.id, needle);
  }
  if (field === 'name') {
    return contains(row.name, needle);
  }
  if (field === 'email') {
    return contains(row.email, needle);
  }
  if (field === 'workspace') {
    return contains(row.workspace, needle);
  }
  return (
    row.type === needle ||
    contains(row.id, needle) ||
    contains(row.name, needle) ||
    contains(row.email, needle) ||
    contains(row.workspace, needle) ||
    contains(row.extra, needle)
  );
}

export function filterRows(rows: DirectoryRow[], field: DomainFilterField, query: string): DirectoryRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return rows;
  }
  return rows.filter((row) => matches(row, field, needle));
}

export function visibleRows(
  tree: DomainOu[],
  selectedOuId: string | null,
  field: DomainFilterField,
  query: string,
): DirectoryRow[] {
  const searching = query.trim().length > 0;
  if (searching) {
    return filterRows(allRows(tree), field, query);
  }
  const folder = selectedOuId ? findOu(tree, selectedOuId) : null;
  return folder ? folderRows(folder) : [];
}
