import { toast } from '../../shared/toast/toastStore';

export function folderToast(
  kind: 'added' | 'removed' | 'created' | 'deleted',
  names: string[],
): void {
  const items = names.map((name) => name.trim()).filter(Boolean);
  if (items.length === 0) {
    return;
  }
  if (items.length > 1) {
    const many = {
      added: 'Folders added to workspace',
      removed: 'Folders removed from workspace',
      created: 'Folders created',
      deleted: 'Folders deleted',
    };
    toast(many[kind], 'ok');
    return;
  }
  const name = items[0];
  const one = {
    added: `Folder ${name} added to workspace`,
    removed: `Folder ${name} removed from workspace`,
    created: `Folder ${name} created`,
    deleted: `Folder ${name} deleted`,
  };
  toast(one[kind], 'ok');
}

export function pathTail(rel: string): string {
  const parts = rel.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? rel;
}

export function newSegments(rel: string, linked: Set<string>): string[] {
  let prefix = '';
  for (const item of linked) {
    if (rel === item || rel.startsWith(`${item}/`)) {
      if (item.length > prefix.length) {
        prefix = item;
      }
    }
  }
  if (rel === prefix) {
    return [];
  }
  const rest = prefix ? rel.slice(prefix.length + 1) : rel;
  return rest.split('/').filter(Boolean);
}
