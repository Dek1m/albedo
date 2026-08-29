import { describe, expect, it, vi } from 'vitest';
import { WorkspaceFolderMenu } from './WorkspaceFolderMenu';

describe('WorkspaceFolderMenu', () => {
  const actions = {
    onNewFolder: vi.fn(),
    onNewFile: vi.fn(),
    onRename: vi.fn(),
    onRemoveFromWorkspace: vi.fn(),
    onDeleteFromDisk: vi.fn(),
  };
  const menu = new WorkspaceFolderMenu(actions);

  it('lists folder actions', () => {
    const items = menu.items({ relPath: 'src', canRemoveFromWorkspace: true });
    expect(items.map((item) => item.id)).toEqual([
      'new-folder',
      'new-file',
      'rename',
      'remove-from-workspace',
      'delete-from-disk',
    ]);
  });

  it('disables remove when folder is not in workspace', () => {
    const items = menu.items({ relPath: 'tmp', canRemoveFromWorkspace: false });
    expect(items.find((item) => item.id === 'remove-from-workspace')?.disabled).toBe(true);
  });
});
