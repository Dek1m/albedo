import type { DomainUser } from '../../../api/systemApi';
import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface DomainUserActions {
  onRename: (user: DomainUser) => void;
  onDelete: (user: DomainUser) => void;
}

export class DomainUserMenu {
  constructor(private readonly actions: DomainUserActions) {}

  items(target: DomainUser): MenuItem[] {
    return [
      {
        id: 'rename',
        label: 'Rename',
        action: () => this.actions.onRename(target),
      },
      {
        id: 'delete',
        label: 'Delete',
        action: () => this.actions.onDelete(target),
      },
    ];
  }
}
