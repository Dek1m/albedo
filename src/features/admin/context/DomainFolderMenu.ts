import type { DomainOu } from '../../../api/adminApi';
import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface DomainFolderActions {
  onNewFolder: (ou: DomainOu) => void;
  onCreateUser: (ou: DomainOu) => void;
  onCreateGroup: (ou: DomainOu) => void;
  onRename: (ou: DomainOu) => void;
  canCreateUser?: boolean;
  canCreateGroup?: boolean;
}

export class DomainFolderMenu {
  constructor(private readonly actions: DomainFolderActions) {}

  items(target: DomainOu): MenuItem[] {
    const bin = target.kind === 'users_bin' || target.kind === 'groups_bin';
    return [
      {
        id: 'new-folder',
        label: 'New folder',
        disabled: bin,
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
        disabled: target.isSystem,
        action: () => this.actions.onRename(target),
      },
    ];
  }
}
