import { describe, expect, it, vi } from 'vitest';
import { WorkspaceFolderMenu } from './WorkspaceFolderMenu';

describe('WorkspaceFolderMenu', () => {
  const actions = {
    onNewFolder: vi.fn(),
    onNewFile: vi.fn(),
    onRename: vi.fn(),
    onRemoveFromWorkspace: vi.fn(),
    onDeleteFromDisk: vi.fn(),
    onShare: vi.fn(),
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

  it('shows Share only for shareable paths', () => {
    const hidden = menu.items({ relPath: 'tmp', canRemoveFromWorkspace: false });
    expect(hidden.some((item) => item.id === 'share')).toBe(false);
    const shown = menu.items({ relPath: 'docs', canRemoveFromWorkspace: true, canShare: true });
    expect(shown.map((item) => item.id)).toContain('share');
    shown.find((item) => item.id === 'share')?.action?.();
    expect(actions.onShare).toHaveBeenCalledWith('docs');
  });

  it('hides new folder actions for files', () => {
    const items = menu.items({
      relPath: 'docs/a.txt',
      kind: 'file',
      canRemoveFromWorkspace: false,
      canShare: true,
    });
    expect(items.map((item) => item.id)).toEqual([
      'rename',
      'share',
      'remove-from-workspace',
      'delete-from-disk',
    ]);
  });
});
