import type { DomainOu } from '../../../api/systemApi';
import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface DomainFolderActions {
  onNewFolder: (ou: DomainOu) => void;
  onCreateUser: (ou: DomainOu) => void;
  onCreateGroup: (ou: DomainOu) => void;
  onRename: (ou: DomainOu) => void;
  onDelete: (ou: DomainOu) => void;
  canCreateUser?: boolean;
  canCreateGroup?: boolean;
}

export class DomainFolderMenu {
  constructor(private readonly actions: DomainFolderActions) {}

  items(target: DomainOu): MenuItem[] {
    const bin = target.kind === 'users_bin' || target.kind === 'groups_bin';
    // Доменные/system/builtin узлы не переименовываются и не удаляются — инвариант mia.
    const locked = target.isSystem || target.isBuiltin;
    return [
      {
        id: 'new-folder',
        label: 'New folder',
        disabled: bin || target.kind === 'root',
        action: () => this.actions.onNewFolder(target),
      },
      {
        id: 'tasks',
        label: 'Tasks',
        children: [
          {
            id: 'tasks.create-user',
            label: 'Create user',
            disabled:
              this.actions.canCreateUser === false || (target.isSystem && target.kind !== 'users_bin'),
            action: () => this.actions.onCreateUser(target),
          },
          {
            id: 'tasks.create-group',
            label: 'Create group',
            disabled:
              this.actions.canCreateGroup === false ||
              target.kind === 'users_bin' ||
              (target.isSystem && target.kind !== 'groups_bin'),
            action: () => this.actions.onCreateGroup(target),
          },
        ],
      },
      {
        id: 'rename',
        label: 'Rename',
        disabled: locked,
        action: () => this.actions.onRename(target),
      },
      {
        id: 'delete',
        label: 'Delete',
        disabled: locked,
        action: () => this.actions.onDelete(target),
      },
    ];
  }
}
