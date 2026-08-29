import { describe, expect, it, vi } from 'vitest';
import type { DomainOu } from '../../../api/adminApi';
import { DomainFolderMenu } from './DomainFolderMenu';

function ou(partial: Partial<DomainOu> & Pick<DomainOu, 'name' | 'kind' | 'isSystem'>): DomainOu {
  return {
    id: partial.id ?? partial.name,
    parentId: partial.parentId ?? null,
    name: partial.name,
    kind: partial.kind,
    isSystem: partial.isSystem,
    isBuiltin: partial.isBuiltin ?? partial.isSystem,
    sortOrder: partial.sortOrder ?? 0,
    children: [],
    users: [],
    groups: [],
  };
}

function byId(items: ReturnType<DomainFolderMenu['items']>, id: string) {
  const walk = (list: typeof items): (typeof items)[number] | undefined => {
    for (const item of list) {
      if (item.id === id) {
        return item;
      }
      if (item.children) {
        const found = walk(item.children);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };
  return walk(items);
}

describe('DomainFolderMenu', () => {
  const actions = {
    onNewFolder: vi.fn(),
    onCreateUser: vi.fn(),
    onCreateGroup: vi.fn(),
    onRename: vi.fn(),
  };
  const menu = new DomainFolderMenu(actions);

  it('keeps Tasks submenu', () => {
    const items = menu.items(ou({ name: 'Team', kind: 'folder', isSystem: false }));
    expect(byId(items, 'tasks')?.children?.map((item) => item.id)).toEqual([
      'tasks.create-user',
      'tasks.create-group',
    ]);
  });

  it('disables rename and create on Argenta', () => {
    const items = menu.items(ou({ name: 'Argenta', kind: 'folder', isSystem: true }));
    expect(byId(items, 'new-folder')?.disabled).toBe(false);
    expect(byId(items, 'rename')?.disabled).toBe(true);
    expect(byId(items, 'tasks.create-user')?.disabled).toBe(true);
    expect(byId(items, 'tasks.create-group')?.disabled).toBe(true);
  });

  it('allows user create only in Users bin among system bins', () => {
    const items = menu.items(ou({ name: 'Users', kind: 'users_bin', isSystem: true }));
    expect(byId(items, 'new-folder')?.disabled).toBe(true);
    expect(byId(items, 'tasks.create-user')?.disabled).toBe(false);
    expect(byId(items, 'tasks.create-group')?.disabled).toBe(true);
    expect(byId(items, 'rename')?.disabled).toBe(true);
  });

  it('allows group create in Groups bin', () => {
    const items = menu.items(ou({ name: 'Groups', kind: 'groups_bin', isSystem: true }));
    expect(byId(items, 'new-folder')?.disabled).toBe(true);
    expect(byId(items, 'tasks.create-user')?.disabled).toBe(true);
    expect(byId(items, 'tasks.create-group')?.disabled).toBe(false);
  });

  it('enables all writes on ordinary folder', () => {
    const items = menu.items(ou({ name: 'Sales', kind: 'folder', isSystem: false }));
    expect(byId(items, 'new-folder')?.disabled).toBeFalsy();
    expect(byId(items, 'rename')?.disabled).toBeFalsy();
    expect(byId(items, 'tasks.create-user')?.disabled).toBeFalsy();
    expect(byId(items, 'tasks.create-group')?.disabled).toBeFalsy();
  });
});
