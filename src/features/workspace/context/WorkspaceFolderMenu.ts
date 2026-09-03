import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface WorkspaceFolderTarget {
  relPath: string;
  kind?: 'folder' | 'file';
  canRemoveFromWorkspace: boolean;
  canRename?: boolean;
  canDeleteFromDisk?: boolean;
  canShare?: boolean;
}

export interface WorkspaceFolderActions {
  onNewFolder: (relPath: string) => void;
  onNewFile: (relPath: string) => void;
  onRename: (relPath: string) => void;
  onRemoveFromWorkspace: (relPath: string) => void;
  onDeleteFromDisk: (relPath: string) => void;
  onShare?: (relPath: string) => void;
}

export class WorkspaceFolderMenu {
  constructor(private readonly actions: WorkspaceFolderActions) {}

  items(target: WorkspaceFolderTarget): MenuItem[] {
    const folder = target.kind !== 'file';
    const rows: MenuItem[] = [];
    if (folder) {
      rows.push(
        {
          id: 'new-folder',
          label: 'New folder',
          action: () => this.actions.onNewFolder(target.relPath),
        },
        {
          id: 'new-file',
          label: 'New file',
          action: () => this.actions.onNewFile(target.relPath),
        },
      );
    }
    rows.push({
      id: 'rename',
      label: 'Rename',
      disabled: target.canRename === false,
      action: () => this.actions.onRename(target.relPath),
    });
    if (target.canShare && this.actions.onShare) {
      rows.push({
        id: 'share',
        label: 'Share',
        icon: 'bi bi-link-45deg',
        action: () => this.actions.onShare?.(target.relPath),
      });
    }
    rows.push(
      {
        id: 'remove-from-workspace',
        label: 'Remove from workspace',
        disabled: !target.canRemoveFromWorkspace,
        action: () => this.actions.onRemoveFromWorkspace(target.relPath),
      },
      {
        id: 'delete-from-disk',
        label: 'Delete from disk',
        disabled: target.canDeleteFromDisk === false,
        action: () => this.actions.onDeleteFromDisk(target.relPath),
      },
    );
    return rows;
  }
}
