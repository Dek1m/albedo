import type { DomainUser } from '../../../api/adminApi';
import type { MenuItem } from '../../../shared/ui/ContextMenu';

export interface DomainUserActions {
  onRename: (user: DomainUser) => void;
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
    ];
  }
}
