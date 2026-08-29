import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface WorkspaceFolderTarget {
  relPath: string;
  canRemoveFromWorkspace: boolean;
  canRename?: boolean;
  canDeleteFromDisk?: boolean;
}

export interface WorkspaceFolderActions {
  onNewFolder: (relPath: string) => void;
  onNewFile: (relPath: string) => void;
  onRename: (relPath: string) => void;
  onRemoveFromWorkspace: (relPath: string) => void;
  onDeleteFromDisk: (relPath: string) => void;
}

export class WorkspaceFolderMenu {
  constructor(private readonly actions: WorkspaceFolderActions) {}

  items(target: WorkspaceFolderTarget): MenuItem[] {
    return [
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
      {
        id: 'rename',
        label: 'Rename',
        disabled: target.canRename === false,
        action: () => this.actions.onRename(target.relPath),
      },
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
    ];
  }
}
